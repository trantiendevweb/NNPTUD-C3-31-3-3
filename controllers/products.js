let mongoose = require('mongoose')
let ExcelJS = require('exceljs')
const { default: slugify } = require('slugify');
let categoryModel = require('../schemas/categories')
let productModel = require('../schemas/products')
let inventoryModel = require('../schemas/inventories')

function cellToString(value) {
    if (value === null || value === undefined) {
        return '';
    }
    if (typeof value === 'object') {
        if (value instanceof Date) {
            return value.toISOString();
        }
        if (Array.isArray(value.richText)) {
            return value.richText.map(item => item.text).join('').trim();
        }
        if (value.text !== undefined && value.text !== null) {
            return String(value.text).trim();
        }
        if (value.result !== undefined && value.result !== null) {
            return cellToString(value.result);
        }
    }
    return String(value).trim();
}

function cellToNumber(value) {
    if (value === null || value === undefined || value === '') {
        return null;
    }
    if (typeof value === 'object' && value.result !== undefined && value.result !== null) {
        return cellToNumber(value.result);
    }
    let parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function buildHeaderMap(headerRow) {
    let map = {};
    headerRow.eachCell({ includeEmpty: true }, function (cell, colNumber) {
        let header = cellToString(cell.value).toLowerCase();
        if (header) {
            map[header] = colNumber;
        }
    });
    return map;
}

function makeUniqueSlug(baseSlug, slugSet) {
    let base = baseSlug || 'item';
    let candidate = base;
    let counter = 1;

    while (slugSet.has(candidate.toLowerCase())) {
        candidate = base + '-' + counter;
        counter++;
    }

    slugSet.add(candidate.toLowerCase());
    return candidate;
}

module.exports = {
    ImportProductsFromExcel: async function (filePath) {
        let workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);

        let worksheet = workbook.worksheets[0];
        if (!worksheet) {
            throw new Error("Excel file does not contain any worksheet");
        }

        let headerMap = buildHeaderMap(worksheet.getRow(1));
        if (!headerMap.sku || !headerMap.title || !headerMap.category || !headerMap.price || !headerMap.stock) {
            throw new Error("Excel file must contain sku, title, category, price and stock columns");
        }

        let existingCategories = await categoryModel.find({}).select('name slug').lean();
        let categoryCache = new Map(
            existingCategories.map(item => [item.name.toLowerCase(), item])
        );
        let categorySlugSet = new Set(
            existingCategories.map(item => (item.slug || '').toLowerCase()).filter(Boolean)
        );

        let existingProducts = await productModel.find({}).select('title slug').lean();
        let titleSet = new Set(
            existingProducts.map(item => item.title.toLowerCase())
        );
        let slugSet = new Set(
            existingProducts.map(item => (item.slug || '').toLowerCase()).filter(Boolean)
        );

        let fileTitleSet = new Set();
        let results = [];
        let productDocs = [];
        let inventoryDocs = [];
        let createdCategories = [];

        async function getOrCreateCategory(categoryName) {
            let key = categoryName.toLowerCase();
            if (categoryCache.has(key)) {
                return categoryCache.get(key);
            }

            let now = new Date();
            let categoryId = new mongoose.Types.ObjectId();
            let slug = makeUniqueSlug(slugify(categoryName, {
                replacement: '-',
                remove: undefined,
                lower: true,
                strict: false,
            }), categorySlugSet);

            let categoryDoc = {
                _id: categoryId,
                name: categoryName,
                slug: slug,
                description: "",
                image: "https://i.imgur.com/ZANVnHE.jpeg",
                isDeleted: false,
                createdAt: now,
                updatedAt: now,
                __v: 0
            };

            await categoryModel.collection.insertOne(categoryDoc);
            categoryCache.set(key, categoryDoc);
            createdCategories.push({
                id: categoryId,
                name: categoryName
            });
            return categoryDoc;
        }

        for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
            let row = worksheet.getRow(rowNumber);
            let sku = cellToString(row.getCell(headerMap.sku).value);
            let title = cellToString(row.getCell(headerMap.title).value);
            let categoryName = cellToString(row.getCell(headerMap.category).value);
            let price = cellToNumber(row.getCell(headerMap.price).value);
            let stock = cellToNumber(row.getCell(headerMap.stock).value);

            if (!sku && !title && !categoryName && price === null && stock === null) {
                continue;
            }

            if (!title || !categoryName || price === null || stock === null) {
                results.push({
                    row: rowNumber,
                    sku: sku,
                    title: title,
                    category: categoryName,
                    status: 'failed',
                    message: 'sku, title, category, price and stock are required'
                });
                continue;
            }

            if (price < 0 || stock < 0) {
                results.push({
                    row: rowNumber,
                    sku: sku,
                    title: title,
                    category: categoryName,
                    status: 'failed',
                    message: 'price and stock must be non-negative'
                });
                continue;
            }

            let titleKey = title.toLowerCase();
            if (titleSet.has(titleKey) || fileTitleSet.has(titleKey)) {
                results.push({
                    row: rowNumber,
                    sku: sku,
                    title: title,
                    category: categoryName,
                    status: 'failed',
                    message: 'product title already exists'
                });
                continue;
            }

            let category = await getOrCreateCategory(categoryName);
            let now = new Date();
            let productId = new mongoose.Types.ObjectId();
            let slug = makeUniqueSlug(slugify(title, {
                replacement: '-',
                remove: undefined,
                lower: true,
                strict: false,
            }), slugSet);

            productDocs.push({
                _id: productId,
                title: title,
                slug: slug,
                price: price,
                description: sku ? "SKU: " + sku : "",
                images: ["https://i.imgur.com/ZANVnHE.jpeg"],
                category: category._id,
                isDeleted: false,
                createdAt: now,
                updatedAt: now,
                __v: 0
            });

            inventoryDocs.push({
                _id: new mongoose.Types.ObjectId(),
                product: productId,
                stock: stock,
                reserved: 0,
                soldCount: 0,
                createdAt: now,
                updatedAt: now,
                __v: 0
            });

            titleSet.add(titleKey);
            fileTitleSet.add(titleKey);
            results.push({
                row: rowNumber,
                sku: sku,
                title: title,
                category: categoryName,
                status: 'success',
                message: 'product imported'
            });
        }

        if (productDocs.length > 0) {
            await productModel.collection.insertMany(productDocs, { ordered: true });
            await inventoryModel.collection.insertMany(inventoryDocs, { ordered: true });
        }

        let importedCount = results.filter(item => item.status === 'success').length;
        let failedCount = results.filter(item => item.status === 'failed').length;

        return {
            file: filePath,
            totalRows: Math.max(worksheet.rowCount - 1, 0),
            importedCount: importedCount,
            failedCount: failedCount,
            createdCategories: createdCategories,
            results: results
        };
    }
}

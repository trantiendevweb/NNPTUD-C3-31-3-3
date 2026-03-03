let express = require('express')
let router = express.Router()
let slugify = require('slugify')
let { genID, getCateById } = require('../utils/id_handlers')
let { dataCategories, dataProducts } = require('../data')

router.get('/api/v1/products', (req, res) => {
    let titleQ = req.query.title ? req.query.title : '';
    let limit = req.query.limit ? req.query.limit : 5;
    let page = req.query.page ? req.query.page : 1;
    let result = dataProducts.filter(function (e) {
        return !(e.isDeleted) && e.title.includes(titleQ)
    })
    result = result.splice(limit * (page - 1), limit)
    res.send(result)
})
router.get('/api/v1/products/:id', (req, res) => {
    let id = req.params.id;
    let result = dataProducts.filter(function (e) {
        return !(e.isDeleted) && e.id == id
    })
    if (result.length > 0) {
        res.send(result[0])
    } else {
        res.status(404).send({
            message: "ID NOT FOUND"
        })
    }
})
//post -> create
router.post('/api/v1/products/', (req, res) => {
    let newItem = {
        id: genID(dataProducts) + "",
        title: req.body.title,
        slug: slugify(req.body.title, {
            replacement: '-',
            remove: undefined,
            lower: true,
        }),
        price: req.body.price,
        description: req.body.description,
        images: req.body.images,
        category: getCateById(req.body.category, dataCategories),
        creationAt: new Date(Date.now()),
        updatedAt: new Date(Date.now())
    }
    dataProducts.push(newItem);
    res.send(newItem)
})
//put - >edit
router.put('/api/v1/products/:id', (req, res) => {
    let id = req.params.id;
    let getProduct = dataProducts.filter(
        function (e) {
            return e.id == id && !e.isDeleted
        }
    )
    if (getProduct.length > 0) {
        getProduct = getProduct[0]
        let keys = Object.keys(req.body);
        for (const key of keys) {
            if (getProduct[key]) {
                getProduct[key] = req.body[key]
            }
        }
        getProduct.updatedAt = new Date(Date.now())
        res.send(getProduct)
    } else {
        res.status(404).send({
            message: "id not found"
        })
    }
})
router.delete('/api/v1/products/:id', (req, res) => {
    let id = req.params.id;
    let getProduct = dataProducts.filter(
        function (e) {
            return e.id == id && !e.isDeleted
        }
    )
    if (getProduct.length > 0) {
        getProduct = getProduct[0]
        getProduct.isDeleted = true;
        getProduct.updatedAt = new Date(Date.now())
        res.send(getProduct)
    } else {
        res.status(404).send({
            message: "id not found"
        })
    }
})
module.exports = router;
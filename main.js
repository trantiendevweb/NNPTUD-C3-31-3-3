const express = require('express')
const app = express()
const port = 3000


app.use(express.json())

app.use('/',require('./routers/products'))


app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})






app.get('/api/v1/categories/:id/products', (req, res) => {
    let id = req.params.id;
    let getCategory = dataCategories.filter(
        function (e) {
            return e.id == id && !e.isDeleted
        }
    )
    if (getCategory.length > 0) {
        let result = dataProducts.filter(
            function (e) {
                return !e.isDeleted && e.category.id == id
            }
        )
        res.send(result);
    } else {
        res.status(404).send({
            message: "id not found"
        })
    }
})
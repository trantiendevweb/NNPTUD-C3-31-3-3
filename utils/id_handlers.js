
module.exports = {
    value1: "nanana",
    genID: function (data) {
        let ids = data.map(
            function (e) {
                return Number.parseInt(e.id)
            }
        )
        return Math.max(...ids) + 1
    },
    getCateById: function (id, dataCate) {
        let result = dataCate.filter(
            function (e) {
                return e.id == id
            }
        )
        if (result.length > 0) {
            return result[0]
        }
    }
}
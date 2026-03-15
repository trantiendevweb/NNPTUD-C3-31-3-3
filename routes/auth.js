var express = require("express");
var router = express.Router();
let userController = require('../controllers/users')
let { RegisterValidator, validatedResult, ChangePasswordValidator } = require('../utils/validator')
let { CheckLogin } = require('../utils/authHandler')
//login
router.post('/login', async function (req, res, next) {
    let { username, password } = req.body;
    let result = await userController.QueryLogin(username, password);
    if (!result) {
        res.status(404).send("thong tin dang nhap khong dung")
    } else {
        res.cookie("TOKEN_NNPTUD_C3", result, {
            maxAge: 24 * 60 * 60 * 1000,
            httpOnly: true,
            secure: false
        })
        res.send(result)
    }
})
router.post('/register', RegisterValidator, validatedResult, async function (req, res, next) {
    let { username, password, email } = req.body;
    let newUser = await userController.CreateAnUser(
        username, password, email, '69b6231b3de61addb401ea26'
    )
    res.send(newUser)
})
router.get('/me', CheckLogin, function (req, res, next) {
    res.send(req.user)
})
router.post('/changepassword', CheckLogin, ChangePasswordValidator, validatedResult, async function (req, res, next) {
    let { oldpassword, newpassword } = req.body;
    let user = req.user;
    let result = await userController.ChangePassword(user, oldpassword, newpassword);
    if (!result) {
        res.status(404).send("thong tin dang nhap khong dung")
    } else {
        res.send("doi thanh cong")
    }

})
router.post('/logout',CheckLogin, async function (req, res, next){
    res.cookie("TOKEN_NNPTUD_C3",null,{
        maxAge:0
    })
    res.send("logout")
})


//changepassword




//forgotpassword
//permission
module.exports = router;
var express = require('express');
var router = express.Router();
let userController = require('../controllers/users');
let jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const passport = require('../utils/authHandler');

// Đăng ký tài khoản 
router.post('/register', async function (req, res, next) {
    let newUser = await userController.CreateAnUser(
        req.body.username,
        req.body.password,
        req.body.email,
        "69a67e9e9ee1e4062fe99151",
        req.body.avatarUrl,
        req.body.fullName,
        req.body.birthday,
        req.body.status,
        req.body.loginCount
    )
    res.send(newUser);
});

// Đăng nhập
router.post('/login', async function (req, res, next) {
    let result = await userController.QueryByUserNameAndPassword(
        req.body.username, 
        req.body.password
    )
    if (result) {
        res.json({
            success: true,
            message: 'Đăng nhập thành công',
            token: result
        });
    } else {
        res.status(401).json({
            success: false,
            message: 'Tên đăng nhập hoặc mật khẩu không đúng'
        });
    }
});

// Google OAuth - Bắt đầu đăng nhập
router.get('/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Google OAuth - Callback
router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        // Đăng nhập thành công, tạo JWT token
        const token = jwt.sign(
            { id: req.user._id },
            "a-string-secret-at-least-256-bits-long",
            { expiresIn: '7d' }
        );
        
        res.json({
            success: true,
            message: 'Đăng nhập Google thành công',
            token: token,
            user: {
                id: req.user._id,
                username: req.user.username,
                email: req.user.email,
                fullName: req.user.fullName,
                avatarUrl: req.user.avatarUrl
            }
        });
    }
);

module.exports = router;
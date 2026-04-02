var express = require('express');
var router = express.Router();
let userController = require('../controllers/users');
let jwt = require('jsonwebtoken');
const crypto = require('crypto');
const passport = require('passport');
const userModel = require('../schemas/users');
const validatorHandler = require('../utils/validatorHandler');
const sendMailHandler = require('../utils/sendMailHandler');
const config = require('../utils/config');

function authCookieOptions() {
    return {
        httpOnly: true,
        sameSite: 'lax',
        secure: config.nodeEnv === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000
    };
}

// Đăng ký tài khoản 
router.post(
    '/register', 
    validatorHandler.registerValidator,
    validatorHandler.validateResult,
    async function (req, res, next) {
        try {
            let newUser = await userController.CreateAnUser(
                req.body.username,
                req.body.password,
                req.body.email,
                config.defaultRoleId,
                req.body.avatarUrl,
                req.body.fullName,
                req.body.birthday,
                true,
                0
            );
            return res.status(201).json({
                success: true,
                message: 'Đăng ký thành công'
            });
        } catch (error) {
            if (error && error.code === 11000) {
                return res.status(409).json({
                    success: false,
                    message: 'Username hoặc email đã tồn tại',
                    errorCode: 'DUPLICATE_USER'
                });
            }
            return next(error);
        }
    }
);

// Đăng nhập
router.post(
    '/login',
    validatorHandler.loginValidator,
    validatorHandler.validateResult,
    async function (req, res, next) {
        try {
            let result = await userController.QueryByUserNameAndPassword(
                req.body.username,
                req.body.password
            );

            if (!result.success) {
                if (result.errorCode === 'ACCOUNT_DISABLED') {
                    return res.status(403).json({
                        success: false,
                        message: 'Tài khoản đã bị vô hiệu hóa',
                        errorCode: result.errorCode
                    });
                }

                return res.status(401).json({
                    success: false,
                    message: 'Tên đăng nhập hoặc mật khẩu không đúng',
                    errorCode: result.errorCode
                });
            }

            res.cookie('token', result.token, authCookieOptions());

            return res.json({
                success: true,
                message: 'Đăng nhập thành công',
                data: {
                    token: result.token,
                    user: result.user
                }
            });
        } catch (error) {
            return next(error);
        }
    }
);

router.post('/logout', function (req, res) {
    res.clearCookie('token', authCookieOptions());
    res.json({
        success: true,
        message: 'Đăng xuất thành công'
    });
});

router.post(
    '/forgot-password',
    validatorHandler.forgotPasswordValidator,
    validatorHandler.validateResult,
    async function (req, res, next) {
        try {
            const user = await userModel.findOne({ email: req.body.email });
            if (user && !user.isDeleted && user.status) {
                const rawToken = crypto.randomBytes(32).toString('hex');
                const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

                user.resetPasswordTokenHash = tokenHash;
                user.resetPasswordExpiresAt = new Date(Date.now() + config.resetPasswordTokenTtlMs);
                await user.save();

                const resetLink = config.appBaseUrl + '/auth/reset-password?token=' + rawToken;
                await sendMailHandler.sendResetPasswordEmail(user.email, resetLink);
            }

            return res.json({
                success: true,
                message: 'Nếu email tồn tại, liên kết reset đã được gửi'
            });
        } catch (error) {
            return next(error);
        }
    }
);

router.post(
    '/reset-password',
    validatorHandler.resetPasswordValidator,
    validatorHandler.validateResult,
    async function (req, res, next) {
        try {
            const tokenHash = crypto.createHash('sha256').update(req.body.token).digest('hex');

            const user = await userModel.findOne({
                resetPasswordTokenHash: tokenHash,
                resetPasswordExpiresAt: { $gt: new Date() },
                isDeleted: false,
                status: true
            });

            if (!user) {
                return res.status(400).json({
                    success: false,
                    message: 'Token reset không hợp lệ hoặc đã hết hạn',
                    errorCode: 'INVALID_RESET_TOKEN'
                });
            }

            user.password = req.body.newPassword;
            user.resetPasswordTokenHash = null;
            user.resetPasswordExpiresAt = null;
            await user.save();

            return res.json({
                success: true,
                message: 'Đặt lại mật khẩu thành công'
            });
        } catch (error) {
            return next(error);
        }
    }
);

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
            config.jwtSecret,
            { expiresIn: config.jwtExpiresIn }
        );

        res.cookie('token', token, authCookieOptions());
        
        res.json({
            success: true,
            message: 'Đăng nhập Google thành công',
            data: {
                token: token,
                user: {
                    id: req.user._id,
                    username: req.user.username,
                    email: req.user.email,
                    fullName: req.user.fullName,
                    avatarUrl: req.user.avatarUrl
                }
            }
        });
    }
);

module.exports = router;
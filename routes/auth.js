var express = require('express');
var router = express.Router();
let userController = require('../controllers/users');
let crypto = require('crypto');
let userModel = require('../schemas/users');
let validatorHandler = require('../utils/validatorHandler');
let sendMailHandler = require('../utils/sendMailHandler');
let upload = require('../utils/uploadHandler');
let config = require('../utils/config');
let { checkLogin } = require('../utils/authHandler');

// Tùy chọn cookie cho token
// Trả về cấu hình cookie để lưu token an toàn
function authCookieOptions() {
    return {
        httpOnly: true,           // Cookie chỉ có thể truy cập từ server (bảo vệ XSS)
        sameSite: 'lax',          // CSRF protection: chỉ gửi cookie khi same-site
        secure: config.nodeEnv === 'production', // HTTPS chỉ (production)
        maxAge: 7 * 24 * 60 * 60 * 1000  // Cookie hết hạn sau 7 ngày (ms)
    };
}

// Đăng ký tài khoản
router.post(
    '/register', 
    // Kiểm tra dữ liệu register 
    validatorHandler.registerValidator,
    // Kiểm tra kết quả validation
    validatorHandler.validateResult,
    async function (req, res, next) {
        try {
            // Kiểm tra password và confirmPassword có khớp không
            if (req.body.password !== req.body.confirmPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Mật khẩu nhập lại không khớp',
                    errorCode: 'PASSWORD_MISMATCH'
                });
            }
            
            // Gọi controller để tạo user mới
            let newUser = await userController.CreateAnUser(
                req.body.username,      // username từ request
                req.body.password,      // password (sẽ được hash trong controller)
                req.body.email,         // email từ request
                config.defaultRoleId,   // role mặc định
                req.body.avatarUrl,     // avatar URL từ request (optional)
                req.body.fullName,      // fullName từ request
                req.body.birthday,      // birthday từ request
                true,                   // status = active
                0                       // loginCount = 0
            );
            // Trả về 201 (Created - resource được tạo thành công)
            return res.status(201).json({
                success: true,
                message: 'Đăng ký thành công'
            });
        } catch (error) {
            // Lỗi 11000: duplicate key (username hoặc email đã tồn tại)
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

// 🔑 API: POST /auth/login - Đăng nhập
router.post(
    '/login',
    // Middleware validate credentials (username, password required)
    validatorHandler.loginValidator,
    // Middleware kiểm tra kết quả validation
    validatorHandler.validateResult,
    async function (req, res, next) {
        try {
            // Gọi controller để verify username + password
            // Trả về: { success, errorCode, token, user }
            let result = await userController.QueryByUserNameAndPassword(
                req.body.username,
                req.body.password
            );

            // Kiểm tra: đăng nhập thành công không?
            if (!result.success) {
                // Nếu tài khoản bị vô hiệu hóa (status = false)
                if (result.errorCode === 'ACCOUNT_DISABLED') {
                    return res.status(403).json({
                        success: false,
                        message: 'Tài khoản đã bị vô hiệu hóa',
                        errorCode: result.errorCode
                    });
                }

                // Username/password sai hoặc user không tồn tại
                return res.status(401).json({
                    success: false,
                    message: 'Tên đăng nhập hoặc mật khẩu không đúng',
                    errorCode: result.errorCode
                });
            }

            // Đăng nhập thành công → lưu token vào cookie
            res.cookie('token', result.token, authCookieOptions());

            // Trả về token + user info
            return res.json({
                success: true,
                message: 'Đăng nhập thành công',
                data: {
                    token: result.token,  // JWT token
                    user: result.user     // user info (username, email, role...)
                }
            });
        } catch (error) {
            return next(error);
        }
    }
);

// 🚪 API: POST /auth/logout - Đăng xuất
router.post('/logout', function (req, res) {
    // Xóa token khỏi cookie (expires immediately)
    res.clearCookie('token', authCookieOptions());
    // Trả về thông báo đăng xuất thành công
    res.json({
        success: true,
        message: 'Đăng xuất thành công'
    });
});

// 👤 API: GET /auth/me - Lấy thông tin user hiện tại
// Yêu cầu: Phải đăng nhập (checkLogin middleware)
router.get('/me', checkLogin, function (req, res) {
    // req.user được set bởi checkLogin middleware (từ token)
    return res.json({
        success: true,
        data: {
            id: req.user._id,                    // MongoDB ID
            username: req.user.username,
            email: req.user.email,
            fullName: req.user.fullName,
            avatarUrl: req.user.avatarUrl,
            birthday: req.user.birthday,
            status: req.user.status,             // true/false (active/inactive)
            role: req.user.role                  // role object (với .populate('role'))
                ? {
                    id: req.user.role._id,
                    name: req.user.role.name || ''
                }
                : null,                          // null nếu không có role
            loginCount: req.user.loginCount,
            createdAt: req.user.createdAt,
            updatedAt: req.user.updatedAt
        }
    });
});

// 🔐 API: POST /auth/forgot-password - Quên mật khẩu
// Gửi email reset password link nếu email tồn tại
router.post(
    '/forgot-password',
    // Validator: kiểm tra email hợp lệ
    validatorHandler.forgotPasswordValidator,
    validatorHandler.validateResult,
    async function (req, res, next) {
        try {
            // Tìm user theo email (phải chưa xóa + status = true)
            const user = await userModel.findOne({ email: req.body.email });
            // Chỉ gửi email nếu user tồn tại, chưa xóa, và active
            if (user && !user.isDeleted && user.status) {
                // Tạo token reset ngẫu nhiên (32 bytes = 64 hex chars)
                const rawToken = crypto.randomBytes(32).toString('hex');
                // Hash token để lưu trong DB (1 chiều - security)
                // Nếu DB bị compromise, attacker không thể dùng token hash trực tiếp
                const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

                // Lưu token hash vào user
                user.resetPasswordTokenHash = tokenHash;
                // Token hết hạn sau resetPasswordTokenTtlMs (mặc định 1 giờ)
                user.resetPasswordExpiresAt = new Date(Date.now() + config.resetPasswordTokenTtlMs);
                await user.save();

                // Tạo reset link (rawToken được gửi trong email, không phải tokenHash)
                const resetLink = config.appBaseUrl + '/reset-password?token=' + rawToken;
                // Gửi email reset password
                await sendMailHandler.sendResetPasswordEmail(user.email, resetLink);
            }

            // ⚠️ SECURITY: LUÔN trả về thông báo giống nhau (dù email có tồn tại hay không)
            // Lý do: không muốn lộ danh sách email tồn tại trong hệ thống
            return res.json({
                success: true,
                message: 'Nếu email tồn tại, liên kết reset đã được gửi'
            });
        } catch (error) {
            return next(error);
        }
    }
);

// 📝 API: PATCH /auth/me - Cập nhật hồ sơ (fullName, avatarUrl, birthday)
// PATCH = partial update (không toàn bộ resource)
router.patch(
    '/me',
    // Phải đăng nhập
    checkLogin,
    // Validator: kiểm tra fullName, avatarUrl, birthday format
    validatorHandler.updateProfileValidator,
    validatorHandler.validateResult,
    async function (req, res, next) {
        try {
            // Gọi controller để cập nhật profile
            // req.userId: từ checkLogin middleware (từ token)
            const result = await userController.UpdateMyProfile(req.userId, {
                fullName: req.body.fullName,
                avatarUrl: req.body.avatarUrl,
                birthday: req.body.birthday
            });

            // Kiểm tra: cập nhật thành công không?
            if (!result.success) {
                // User không tồn tại
                if (result.errorCode === 'USER_NOT_FOUND') {
                    return res.status(404).json({
                        success: false,
                        message: 'Không tìm thấy user',
                        errorCode: result.errorCode
                    });
                }

                // Lỗi khác (validation, DB error...)
                return res.status(400).json({
                    success: false,
                    message: 'Không thể cập nhật hồ sơ',
                    errorCode: result.errorCode
                });
            }

            // Cập nhật thành công
            return res.json({
                success: true,
                message: 'Cập nhật hồ sơ thành công',
                data: result.data  // user info sau khi cập nhật
            });
        } catch (error) {
            return next(error);
        }
    }
);

// 🖼️ API: POST /auth/me/avatar - Upload ảnh đại diện
router.post('/me/avatar', checkLogin, upload.single('avatar'), async function (req, res, next) {
    try {
        // Kiểm tra: file ảnh có được upload không?
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng chọn file ảnh',
                errorCode: 'MISSING_AVATAR_FILE'
            });
        }

        // upload.single('avatar') middleware đã xử lý:
        // 1. Validate file (type, size)
        // 2. Lưu file vào /public/uploads/
        // 3. Gán req.file = { filename, originalname, path, etc }
        
        // Tạo URL để lưu vào DB
        const avatarUrl = `/uploads/${req.file.filename}`;
        // Gọi controller cập nhật avatarUrl
        const result = await userController.UpdateMyProfile(req.userId, { avatarUrl });

        // Kiểm tra: cập nhật thành công không?
        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: 'Không thể cập nhật ảnh đại diện',
                errorCode: result.errorCode
            });
        }

        // Cập nhật thành công
        return res.json({
            success: true,
            message: 'Cập nhật ảnh đại diện thành công',
            data: result.data
        });
    } catch (error) {
        return next(error);
    }
});

// 🔑 API: PUT /auth/me/password - Đổi mật khẩu (khi user đã biết mật khẩu cũ)
router.put(
    '/me/password',
    // Phải đăng nhập
    checkLogin,
    // Validator: kiểm tra currentPassword, newPassword format
    validatorHandler.changePasswordValidator,
    validatorHandler.validateResult,
    async function (req, res, next) {
        try {
            // Gọi controller để verify mật khẩu cũ + đổi mật khẩu
            const result = await userController.ChangeMyPassword(
                req.userId,                      // user ID từ token
                req.body.currentPassword,        // mật khẩu hiện tại (verify)
                req.body.newPassword             // mật khẩu mới
            );

            // Kiểm tra: đổi mật khẩu thành công không?
            if (!result.success) {
                // User không tồn tại
                if (result.errorCode === 'USER_NOT_FOUND') {
                    return res.status(404).json({
                        success: false,
                        message: 'Không tìm thấy user',
                        errorCode: result.errorCode
                    });
                }

                // Mật khẩu hiện tại không được nhập
                if (result.errorCode === 'CURRENT_PASSWORD_REQUIRED') {
                    return res.status(400).json({
                        success: false,
                        message: 'Vui lòng nhập mật khẩu hiện tại',
                        errorCode: result.errorCode
                    });
                }

                // Mật khẩu hiện tại không đúng
                if (result.errorCode === 'INVALID_CURRENT_PASSWORD') {
                    return res.status(400).json({
                        success: false,
                        message: 'Mật khẩu hiện tại không đúng',
                        errorCode: result.errorCode
                    });
                }

                // Lỗi khác
                return res.status(400).json({
                    success: false,
                    message: 'Không thể đổi mật khẩu',
                    errorCode: result.errorCode
                });
            }

            // Đổi mật khẩu thành công
            return res.json({
                success: true,
                message: 'Đổi mật khẩu thành công'
            });
        } catch (error) {
            return next(error);
        }
    }
);

// 🔐 API: POST /auth/reset-password - Reset mật khẩu (với token từ email)
router.post(
    '/reset-password',
    // Validator: kiểm tra token, newPassword format
    validatorHandler.resetPasswordValidator,
    validatorHandler.validateResult,
    async function (req, res, next) {
        try {
            // Hash token gửi từ client (phải match tokenHash trong DB)
            const tokenHash = crypto.createHash('sha256').update(req.body.token).digest('hex');

            // Tìm user có:
            // 1. resetPasswordTokenHash = tokenHash gửi lên (1 chiều match)
            // 2. resetPasswordExpiresAt > hiện tại (token chưa hết hạn)
            // 3. Chưa bị xóa (isDeleted = false)
            // 4. Status = true (tài khoản active)
            const user = await userModel.findOne({
                resetPasswordTokenHash: tokenHash,
                resetPasswordExpiresAt: { $gt: new Date() },  // $gt = greater than
                isDeleted: false,
                status: true
            });

            // Nếu không tìm thấy (token sai/hết hạn/user bị xóa)
            if (!user) {
                return res.status(400).json({
                    success: false,
                    message: 'Token reset không hợp lệ hoặc đã hết hạn',
                    errorCode: 'INVALID_RESET_TOKEN'
                });
            }

            // Reset thành công → cập nhật mật khẩu
            user.password = req.body.newPassword;  // schema pre-save hook sẽ hash
            // Xóa token reset (không dùng lại được)
            user.resetPasswordTokenHash = null;
            user.resetPasswordExpiresAt = null;
            await user.save();

            // Reset thành công
            return res.json({
                success: true,
                message: 'Đặt lại mật khẩu thành công'
            });
        } catch (error) {
            return next(error);
        }
    }
);

// Export router để app.js import và sử dụng
module.exports = router;
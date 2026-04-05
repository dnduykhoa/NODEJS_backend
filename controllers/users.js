let userModel = require('../schemas/users')
let bcrypt = require('bcrypt')
let jwt = require('jsonwebtoken');
let config = require('../utils/config');

// Lọc/xử lý user data trả về cho client
// Lý do: User schema có nhiều field nhạy cảm (password, reset token...) hoặc không cần thiết cho client (isDeleted, __v...)
function sanitizeUser(user) {
    return {
        id: user._id,                    // MongoDB ObjectId
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        birthday: user.birthday,
        status: user.status,        
        // Xử lý role: nếu role là object, lấy id + name
        role: user.role && typeof user.role === 'object'
            ? {
                id: user.role._id || user.role.id || user.role,
                name: user.role.name || ''  
            }
            : user.role,
        loginCount: user.loginCount,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
    };
}

module.exports = {
    // Tạo user mới
    CreateAnUser: async function (username, password, email, role,
        avatarUrl, fullName, birthday, status, loginCount
    ) {
        // Tạo object user mới (chưa lưu vào DB)
        let newUser = new userModel({
            username: username,          // Username từ request
            password: password,          // Password từ request (sẽ hash qua pre-save hook)
            email: email,                // Email từ request
            role: role,                  // Role từ config.defaultRoleId
            avatarUrl: avatarUrl,        // Avatar URL từ request
            fullName: fullName,          // Full name từ request
            birthday: birthday,          // Birthday từ request
            status: status,              // Status mặc định = true
            loginCount: loginCount       // LoginCount mặc định = 0
        })
        // Lưu vào database
        await newUser.save();
        // Trả về user đã lọc (không password)
        return sanitizeUser(newUser);
    },

    // Xác thực login
    QueryByUserNameAndPassword: async function (username, password) {
        // Tìm user theo username + populate role info
        let getUser = await userModel.findOne({ username: username }).populate('role');
        // Kiểm tra: user tồn tại không?
        if (!getUser) {
            return { success: false, errorCode: 'INVALID_CREDENTIALS' };
        }

        // Kiểm tra: user có bị xóa? user có bị vô hiệu hóa?
        if (getUser.isDeleted || !getUser.status) {
            return { success: false, errorCode: 'ACCOUNT_DISABLED' };
        }

        // Verify password: so sánh password gửi lên với password hash trong DB
        let isValidPassword = await bcrypt.compare(password, getUser.password);
        if (!isValidPassword) {
            return { success: false, errorCode: 'INVALID_CREDENTIALS' };
        }

        // Đăng nhập thành công, tăng loginCount (tracking)
        getUser.loginCount = (getUser.loginCount || 0) + 1;
        await getUser.save();

        // Trả về token + user info
        return {
            success: true,
            token: jwt.sign(
                { id: getUser._id },           
                config.jwtSecret,                
                { expiresIn: config.jwtExpiresIn }  
            ),
            user: sanitizeUser(getUser)        
        };
    },

    // Cập nhật profile user
    UpdateMyProfile: async function (userId, updates) {
        // Tìm user theo ID + populate role
        const user = await userModel.findOne({ _id: userId, isDeleted: false }).populate('role');

        // Kiểm tra: user tồn tại không?
        if (!user) {
            return { success: false, errorCode: 'USER_NOT_FOUND' };
        }

        // Cập nhật fullName 
        if (updates.fullName !== undefined) {
            // Trim whitespace + convert to string (safety)
            user.fullName = String(updates.fullName).trim();
        }

        // Cập nhật avatarUrl 
        if (updates.avatarUrl !== undefined) {
            // Trim + convert to string
            const nextAvatarUrl = String(updates.avatarUrl).trim();
            // Kiểm tra: URL có hợp lệ không?
            // Bỏ qua nếu là string 'null' hoặc 'undefined' từ client
            if (nextAvatarUrl && nextAvatarUrl !== 'null' && nextAvatarUrl !== 'undefined') {
                user.avatarUrl = nextAvatarUrl;
            }
        }

        // Cập nhật birthday
        if (updates.birthday !== undefined) {
            // Nếu gửi null hoặc empty string → xóa birthday
            if (updates.birthday === null || updates.birthday === '') {
                user.birthday = undefined;
            } else {
                // Convert string date thành Date object
                user.birthday = new Date(updates.birthday);
            }
        }

        // Lưu vào database
        await user.save();

        // Trả về user đã cập nhật
        return {
            success: true,
            data: sanitizeUser(user)  
        };
    },

    // Đổi mật khẩu
    ChangeMyPassword: async function (userId, currentPassword, newPassword) {
        // Tìm user theo ID
        const user = await userModel.findOne({ _id: userId, isDeleted: false });

        // Kiểm tra: user tồn tại không?
        if (!user) {
            return { success: false, errorCode: 'USER_NOT_FOUND' };
        }

        // Kiểm tra: currentPassword được gửi lên không?
        if (!currentPassword) {
            return { success: false, errorCode: 'CURRENT_PASSWORD_REQUIRED' };
        }

        // Verify current password
        const isValidCurrentPassword = await bcrypt.compare(currentPassword, user.password);
        if (!isValidCurrentPassword) {
            return { success: false, errorCode: 'INVALID_CURRENT_PASSWORD' };
        }

        // Cập nhật mật khẩu mới
        user.password = newPassword;
        // Xóa reset password token sau khi đổi mật khẩu, token reset cũ không còn hợp lệ
        user.resetPasswordTokenHash = null;
        user.resetPasswordExpiresAt = null;
        // Lưu vào database
        await user.save();

        return {
            success: true,
            message: 'Password updated successfully'
        };
    }
}
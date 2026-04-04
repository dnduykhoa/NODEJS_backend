let userModel = require('../schemas/users')
let bcrypt = require('bcrypt')
let jwt = require('jsonwebtoken');
let config = require('../utils/config');

function sanitizeUser(user) {
    return {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        birthday: user.birthday,
        status: user.status,
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
    CreateAnUser: async function (username, password, email, role,
        avatarUrl, fullName, birthday, status, loginCount
    ) {
        let newUser = new userModel({
            username: username,
            password: password,
            email: email,
            role: role,
            avatarUrl: avatarUrl,
            fullName: fullName,
            birthday: birthday,
            status: status,
            loginCount: loginCount
        })
        await newUser.save();
        return sanitizeUser(newUser);
    },

    QueryByUserNameAndPassword: async function (username, password) {
        let getUser = await userModel.findOne({ username: username }).populate('role');
        if (!getUser || !getUser.password) {
            return { success: false, errorCode: 'INVALID_CREDENTIALS' };
        }

        if (getUser.isDeleted || !getUser.status) {
            return { success: false, errorCode: 'ACCOUNT_DISABLED' };
        }

        let isValidPassword = await bcrypt.compare(password, getUser.password);
        if (!isValidPassword) {
            return { success: false, errorCode: 'INVALID_CREDENTIALS' };
        }

        getUser.loginCount = (getUser.loginCount || 0) + 1;
        await getUser.save();

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

    UpdateMyProfile: async function (userId, updates) {
        const user = await userModel.findOne({ _id: userId, isDeleted: false }).populate('role');

        if (!user) {
            return { success: false, errorCode: 'USER_NOT_FOUND' };
        }

        if (updates.fullName !== undefined) {
            user.fullName = String(updates.fullName).trim();
        }

        if (updates.avatarUrl !== undefined) {
            const nextAvatarUrl = String(updates.avatarUrl).trim();
            if (nextAvatarUrl && nextAvatarUrl !== 'null' && nextAvatarUrl !== 'undefined') {
                user.avatarUrl = nextAvatarUrl;
            }
        }

        if (updates.birthday !== undefined) {
            if (updates.birthday === null || updates.birthday === '') {
                user.birthday = undefined;
            } else {
                user.birthday = new Date(updates.birthday);
            }
        }

        await user.save();

        return {
            success: true,
            data: sanitizeUser(user)
        };
    },

    ChangeMyPassword: async function (userId, currentPassword, newPassword) {
        const user = await userModel.findOne({ _id: userId, isDeleted: false });

        if (!user) {
            return { success: false, errorCode: 'USER_NOT_FOUND' };
        }

        if (user.password) {
            if (!currentPassword) {
                return { success: false, errorCode: 'CURRENT_PASSWORD_REQUIRED' };
            }

            const isValidCurrentPassword = await bcrypt.compare(currentPassword, user.password);
            if (!isValidCurrentPassword) {
                return { success: false, errorCode: 'INVALID_CURRENT_PASSWORD' };
            }
        }

        user.password = newPassword;
        user.resetPasswordTokenHash = null;
        user.resetPasswordExpiresAt = null;
        await user.save();

        return {
            success: true,
            message: 'Password updated successfully'
        };
    }
}
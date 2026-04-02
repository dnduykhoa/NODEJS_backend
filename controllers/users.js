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
        status: user.status,
        role: user.role,
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
        let getUser = await userModel.findOne({ username: username });
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
    }
}
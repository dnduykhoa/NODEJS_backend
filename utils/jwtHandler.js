const jwt = require('jsonwebtoken');
const userModel = require('../schemas/users');
const config = require('./config');

function extractToken(req) {
    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Bearer ')) {
        return authHeader.slice(7);
    }

    if (req.cookies && req.cookies.token) {
        return req.cookies.token;
    }

    return null;
}

async function checkLogin(req, res, next) {
    try {
        const token = extractToken(req);
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Authentication token is required',
                errorCode: 'UNAUTHORIZED'
            });
        }

        const payload = jwt.verify(token, config.jwtSecret);
        const user = await userModel.findById(payload.id).populate('role', 'name');

        if (!user || user.isDeleted || !user.status) {
            return res.status(401).json({
                success: false,
                message: 'Account is disabled or not found',
                errorCode: 'UNAUTHORIZED'
            });
        }

        req.user = user;
        req.userId = user._id;
        return next();
    } catch (error) {
        const isExpired = error && error.name === 'TokenExpiredError';
        return res.status(401).json({
            success: false,
            message: isExpired ? 'Token has expired' : 'Invalid authentication token',
            errorCode: 'UNAUTHORIZED'
        });
    }
}

function checkRole() {
    const allowedRoles = Array.from(arguments);
    const normalizedAllowedRoles = allowedRoles.map(function (role) {
        return String(role).toUpperCase();
    });

    return function (req, res, next) {
        if (!req.user || !req.user.role) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
                errorCode: 'UNAUTHORIZED'
            });
        }

        const currentRoleName = req.user.role.name ? String(req.user.role.name).toUpperCase() : '';
        if (!normalizedAllowedRoles.includes(currentRoleName)) {
            return res.status(403).json({
                success: false,
                message: 'Forbidden',
                errorCode: 'FORBIDDEN'
            });
        }

        return next();
    }
}

module.exports = {
    checkLogin,
    checkRole
};

let { body, validationResult } = require('express-validator')
let util = require('util')

let options = {
    password: {
        minLength: 8,
        minLowercase: 1,
        minSymbols: 1,
        minUppercase: 1,
        minNumbers: 1
    }
}

module.exports = {
    registerValidator: [
        body('username')
            .trim()
            .notEmpty().withMessage('username is required')
            .isLength({ min: 3, max: 50 }).withMessage('username length must be between 3 and 50'),
        body('email')
            .trim()
            .notEmpty().withMessage('email is required')
            .isEmail().withMessage('email format is invalid'),
        body('password')
            .notEmpty().withMessage('password is required')
            .isStrongPassword(options.password)
            .withMessage(
                util.format('password must be at least %d chars and include %d number, %d uppercase, %d lowercase, and %d symbol',
                    options.password.minLength,
                    options.password.minNumbers,
                    options.password.minUppercase,
                    options.password.minLowercase,
                    options.password.minSymbols
                )
            ),
        body('fullName')
            .optional()
            .isString().withMessage('fullName must be a string')
            .isLength({ max: 100 }).withMessage('fullName cannot exceed 100 characters'),
        body('birthday')
            .optional()
            .isISO8601().withMessage('birthday must be a valid date'),
        body('confirmPassword')
            .notEmpty().withMessage('confirmPassword is required')
            .custom((value, { req }) => {
                if (value !== req.body.password) {
                    throw new Error('confirmPassword does not match password');
                }
                return true;
            })
    ],
    loginValidator: [
        body('username')
            .trim()
            .notEmpty().withMessage('username is required'),
        body('password')
            .notEmpty().withMessage('password is required')
    ],
    forgotPasswordValidator: [
        body('email')
            .trim()
            .notEmpty().withMessage('email is required')
            .isEmail().withMessage('email format is invalid')
    ],
    resetPasswordValidator: [
        body('token')
            .trim()
            .notEmpty().withMessage('token is required'),
        body('newPassword')
            .notEmpty().withMessage('newPassword is required')
            .isStrongPassword(options.password)
            .withMessage(
                util.format('newPassword must be at least %d chars and include %d number, %d uppercase, %d lowercase, and %d symbol',
                    options.password.minLength,
                    options.password.minNumbers,
                    options.password.minUppercase,
                    options.password.minLowercase,
                    options.password.minSymbols
                )
            )
    ],
    postUserValidator: [
        body("email").isEmail().withMessage("email khong dung dinh dang"),
        body("password").isStrongPassword(options.password).withMessage(
            util.format("password dai it nhat %d, co it nhat %d so,%d chu viet hoa, %d chu viet thuong va %d ki tu",
                options.password.minLength,
                options.password.minNumbers,
                options.password.minUppercase,
                options.password.minLowercase,
                options.password.minSymbols,
            ))
    ],
    validateResult: function (req, res, next) {
        let result = validationResult(req);
        if (result.errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errorCode: 'VALIDATION_ERROR',
                errors: result.errors.map(function (e) {
                    return {
                        field: e.path,
                        message: e.msg
                    }
                })
            });
        } else {
            next()
        }
    }
}
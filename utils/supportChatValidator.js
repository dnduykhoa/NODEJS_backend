const { body, query, param } = require('express-validator');

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

module.exports = {
    createConversationValidator: [
        body('subject')
            .trim()
            .notEmpty().withMessage('subject is required')
            .isLength({ max: 200 }).withMessage('subject cannot exceed 200 characters'),
        body('content')
            .trim()
            .notEmpty().withMessage('content is required')
            .isLength({ max: 2000 }).withMessage('content cannot exceed 2000 characters'),
        body('priority')
            .optional()
            .isIn(['low', 'normal', 'high', 'urgent']).withMessage('priority is invalid')
    ],
    conversationListValidator: [
        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
        query('page')
            .optional()
            .isInt({ min: 1 }).withMessage('page must be greater than 0'),
        query('status')
            .optional()
            .isIn(['open', 'pending', 'resolved', 'closed']).withMessage('status is invalid'),
        query('assigned')
            .optional()
            .isIn(['true', 'false', 'mine']).withMessage('assigned must be true, false or mine')
    ],
    conversationIdValidator: [
        param('id')
            .matches(objectIdPattern)
            .withMessage('conversation id is invalid')
    ],
    messageContentValidator: [
        body('content')
            .trim()
            .notEmpty().withMessage('content is required')
            .isLength({ max: 2000 }).withMessage('content cannot exceed 2000 characters')
    ],
    updateStatusValidator: [
        body('status')
            .notEmpty().withMessage('status is required')
            .isIn(['pending', 'resolved', 'closed']).withMessage('status is invalid')
    ]
};

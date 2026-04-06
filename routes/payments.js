var express = require('express');
var router = express.Router();
let paymentController = require('../controllers/payments');
const { checkLogin, checkRole } = require('../utils/authHandler');

router.use(checkLogin);

router.get('/my-payments', async function (req, res, next) {
    try {
        const page = Number(req.query.page || 1);
        const limit = Number(req.query.limit || 10);

        let result = await paymentController.GetPaymentsByUser(req.userId, page, limit);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
});

router.get('/', checkRole('ADMIN', 'MODERATOR'), async function (req, res, next) {
    try {
        const page = Number(req.query.page || 1);
        const limit = Number(req.query.limit || 10);

        let result = await paymentController.GetAllPayments(page, limit);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
});

router.get('/:id', async function (req, res, next) {
    try {
        const isAdmin = req.user && req.user.role && ['ADMIN', 'MODERATOR'].includes(String(req.user.role.name || '').toUpperCase());
        let result = await paymentController.GetPaymentById(req.params.id, req.userId, isAdmin);

        if (!result.success && result.errorCode === 'PAYMENT_NOT_FOUND') {
            return res.status(404).json(result);
        }

        return res.json(result);
    } catch (error) {
        return next(error);
    }
});

router.patch('/:id/status', checkRole('ADMIN', 'MODERATOR'), async function (req, res, next) {
    try {
        let result = await paymentController.UpdatePaymentStatus(req.params.id, req.body.paymentStatus || req.body.status);

        if (!result.success) {
            if (result.errorCode === 'PAYMENT_NOT_FOUND') {
                return res.status(404).json(result);
            }
            if (result.errorCode === 'INVALID_PAYMENT_STATUS') {
                return res.status(400).json(result);
            }
            return res.status(400).json(result);
        }

        return res.json(result);
    } catch (error) {
        return next(error);
    }
});

module.exports = router;
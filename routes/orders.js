var express = require('express');
var router = express.Router();
let orderController = require('../controllers/orders');
const { checkLogin, checkRole } = require('../utils/jwtHandler');

router.use(checkLogin);

router.get('/', async function (req, res, next) {
    try {
        const page = Number(req.query.page || 1);
        const limit = Number(req.query.limit || 10);

        let result = await orderController.GetOrdersByUser(req.userId, page, limit);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
});

router.get('/:id', async function (req, res, next) {
    try {
        let result = await orderController.GetOrderById(req.params.id, req.userId);

        if (!result.success && result.errorCode === 'ORDER_NOT_FOUND') {
            return res.status(404).json(result);
        }

        return res.json(result);
    } catch (error) {
        return next(error);
    }
});

router.post('/', async function (req, res, next) {
    try {
        let result = await orderController.CreateOrder(
            req.userId,
            req.body.items,
            req.body.shippingAddress,
            req.body.note
        );

        if (!result.success) {
            if (result.errorCode === 'CART_EMPTY' || result.errorCode === 'PRODUCT_NOT_FOUND') {
                return res.status(400).json(result);
            }
            if (result.errorCode === 'CREATE_PAYMENT_ERROR' || result.errorCode === 'DUPLICATE_PAYMENT') {
                return res.status(500).json(result);
            }
            return res.status(400).json(result);
        }

        return res.status(201).json(result);
    } catch (error) {
        return next(error);
    }
});

router.put('/:id/cancel', async function (req, res, next) {
    try {
        let result = await orderController.CancelOrder(req.params.id, req.userId);

        if (!result.success) {
            if (result.errorCode === 'ORDER_NOT_FOUND') {
                return res.status(404).json(result);
            }
            return res.status(400).json(result);
        }

        return res.json(result);
    } catch (error) {
        return next(error);
    }
});

router.put('/:id/status', checkRole('ADMIN', 'MODERATOR'), async function (req, res, next) {
    try {
        let result = await orderController.UpdateOrderStatus(req.params.id, req.body.status);

        if (!result.success) {
            if (result.errorCode === 'ORDER_NOT_FOUND') {
                return res.status(404).json(result);
            }
            return res.status(400).json(result);
        }

        return res.json(result);
    } catch (error) {
        return next(error);
    }
});

module.exports = router;

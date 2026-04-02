var express = require('express');
var router = express.Router();
let cartController = require('../controllers/carts');
const { checkLogin } = require('../utils/jwtHandler');

router.use(checkLogin);

router.get('/', async function (req, res, next) {
    try {
        let result = await cartController.GetCartByUser(req.userId);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
});

router.post('/items', async function (req, res, next) {
    try {
        let result = await cartController.AddToCart(
            req.userId,
            req.body.productId,
            req.body.quantity
        );

        if (!result.success) {
            if (result.errorCode === 'PRODUCT_NOT_FOUND') {
                return res.status(404).json(result);
            }
            return res.status(400).json(result);
        }

        return res.status(201).json(result);
    } catch (error) {
        return next(error);
    }
});

router.put('/items/:productId', async function (req, res, next) {
    try {
        let result = await cartController.UpdateCartItem(
            req.userId,
            req.params.productId,
            req.body.quantity
        );

        if (!result.success) {
            if (result.errorCode === 'CART_NOT_FOUND' || result.errorCode === 'ITEM_NOT_FOUND') {
                return res.status(404).json(result);
            }
            return res.status(400).json(result);
        }

        return res.json(result);
    } catch (error) {
        return next(error);
    }
});

router.delete('/items/:productId', async function (req, res, next) {
    try {
        let result = await cartController.RemoveFromCart(req.userId, req.params.productId);

        if (!result.success) {
            if (result.errorCode === 'CART_NOT_FOUND') {
                return res.status(404).json(result);
            }
            return res.status(400).json(result);
        }

        return res.json(result);
    } catch (error) {
        return next(error);
    }
});

router.delete('/clear', async function (req, res, next) {
    try {
        let result = await cartController.ClearCart(req.userId);

        if (!result.success) {
            if (result.errorCode === 'CART_NOT_FOUND') {
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

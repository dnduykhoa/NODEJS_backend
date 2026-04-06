var express = require('express');
var router = express.Router();
let reservationController = require('../controllers/reservations');
const { checkLogin } = require('../utils/authHandler');

router.use(checkLogin);

router.get('/', async function (req, res, next) {
    try {
        const page = Number(req.query.page || 1);
        const limit = Number(req.query.limit || 10);

        let result = await reservationController.GetReservationsByUser(req.userId, page, limit);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
});

router.get('/:id', async function (req, res, next) {
    try {
        let result = await reservationController.GetReservationById(req.params.id, req.userId);

        if (!result.success && result.errorCode === 'RESERVATION_NOT_FOUND') {
            return res.status(404).json(result);
        }

        return res.json(result);
    } catch (error) {
        return next(error);
    }
});

router.post('/', async function (req, res, next) {
    try {
        let result = await reservationController.CreateReservation(
            req.userId,
            req.body.productId,
            req.body.quantity,
            req.body.reservedUntil,
            req.body.note
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

router.put('/:id', async function (req, res, next) {
    try {
        let result = await reservationController.UpdateReservation(
            req.params.id,
            req.userId,
            req.body || {}
        );

        if (!result.success) {
            if (result.errorCode === 'RESERVATION_NOT_FOUND') {
                return res.status(404).json(result);
            }
            return res.status(400).json(result);
        }

        return res.json(result);
    } catch (error) {
        return next(error);
    }
});

router.delete('/:id', async function (req, res, next) {
    try {
        let result = await reservationController.CancelReservation(req.params.id, req.userId);

        if (!result.success) {
            if (result.errorCode === 'RESERVATION_NOT_FOUND') {
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

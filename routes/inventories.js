var express = require('express');
var router = express.Router();
let inventoryController = require('../controllers/inventories');
const { checkLogin, checkRole } = require('../utils/authHandler');

router.use(checkLogin);

router.get('/', async function (req, res, next) {
	try {
		const page = Number(req.query.page || 1);
		const limit = Number(req.query.limit || 10);

		let filters = {};
		if (req.query.productId) {
			filters.productId = req.query.productId;
		}
		if (req.query.lowStock !== undefined) {
			filters.lowStock = req.query.lowStock === 'true';
		}

		let result = await inventoryController.GetAllInventories(page, limit, filters);

		if (!result.success && result.errorCode === 'PRODUCT_NOT_FOUND') {
			return res.status(404).json(result);
		}

		return res.json(result);
	} catch (error) {
		return next(error);
	}
});

router.get('/product/:productId', async function (req, res, next) {
	try {
		let result = await inventoryController.GetInventoryByProduct(req.params.productId);

		if (!result.success && result.errorCode === 'INVENTORY_NOT_FOUND') {
			return res.status(404).json(result);
		}

		return res.json(result);
	} catch (error) {
		return next(error);
	}
});

router.post('/', checkRole('ADMIN', 'MODERATOR'), async function (req, res, next) {
	try {
		let result = await inventoryController.CreateInventory(
			req.body.productId,
			req.body.stock,
			req.body.minStockThreshold
		);

		if (!result.success) {
			if (result.errorCode === 'PRODUCT_NOT_FOUND') {
				return res.status(404).json(result);
			}
			if (result.errorCode === 'DUPLICATE_INVENTORY') {
				return res.status(409).json(result);
			}
			return res.status(400).json(result);
		}

		return res.status(201).json(result);
	} catch (error) {
		return next(error);
	}
});

router.post('/increase-stock', checkRole('ADMIN', 'MODERATOR'), async function (req, res, next) {
	try {
		let result = await inventoryController.IncreaseStock(
			req.body.productId,
			req.body.quantity
		);

		if (!result.success) {
			if (result.errorCode === 'PRODUCT_NOT_FOUND') {
				return res.status(404).json(result);
			}
			return res.status(400).json(result);
		}

		return res.json(result);
	} catch (error) {
		return next(error);
	}
});

router.post('/decrease-stock', checkRole('ADMIN', 'MODERATOR'), async function (req, res, next) {
	try {
		let result = await inventoryController.DecreaseStock(
			req.body.productId,
			req.body.quantity
		);

		if (!result.success) {
			if (result.errorCode === 'INVENTORY_NOT_FOUND') {
				return res.status(404).json(result);
			}
			return res.status(400).json(result);
		}

		return res.json(result);
	} catch (error) {
		return next(error);
	}
});

router.put('/adjust-stock', checkRole('ADMIN', 'MODERATOR'), async function (req, res, next) {
	try {
		let result = await inventoryController.AdjustStock(
			req.body.productId,
			req.body.newStock,
			req.body.minStockThreshold
		);

		if (!result.success) {
			if (result.errorCode === 'INVENTORY_NOT_FOUND') {
				return res.status(404).json(result);
			}
			return res.status(400).json(result);
		}

		return res.json(result);
	} catch (error) {
		return next(error);
	}
});

router.delete('/product/:productId', checkRole('ADMIN', 'MODERATOR'), async function (req, res, next) {
	try {
		let result = await inventoryController.DeleteInventory(req.params.productId);

		if (!result.success && result.errorCode === 'INVENTORY_NOT_FOUND') {
			return res.status(404).json(result);
		}

		return res.json(result);
	} catch (error) {
		return next(error);
	}
});

module.exports = router;

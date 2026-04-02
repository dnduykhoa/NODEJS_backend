var express = require('express');
var router = express.Router();
let productController = require('../controllers/products');
const { checkLogin, checkRole } = require('../utils/jwtHandler');

/* GET products listing. */
router.get('/', async function (req, res, next) {
	try {
		const page = Number(req.query.page || 1);
		const limit = Number(req.query.limit || 10);

		let filters = {};
		if (req.query.categoryId) filters.categoryId = req.query.categoryId;
		if (req.query.status !== undefined) filters.status = req.query.status === 'true';
		if (req.query.minPrice !== undefined) filters.minPrice = Number(req.query.minPrice);
		if (req.query.maxPrice !== undefined) filters.maxPrice = Number(req.query.maxPrice);

		let result = await productController.GetAllProducts(page, limit, filters);
		return res.json(result);
	} catch (error) {
		return next(error);
	}
});

router.get('/search', async function (req, res, next) {
	try {
		const keyword = (req.query.keyword || '').trim();
		const page = Number(req.query.page || 1);
		const limit = Number(req.query.limit || 10);

		if (!keyword) {
			return res.status(400).json({
				success: false,
				errorCode: 'MISSING_KEYWORD',
				message: 'keyword is required'
			});
		}

		let result = await productController.SearchProducts(keyword, page, limit);
		return res.json(result);
	} catch (error) {
		return next(error);
	}
});

router.get('/category/:categoryId', async function (req, res, next) {
	try {
		const page = Number(req.query.page || 1);
		const limit = Number(req.query.limit || 10);
		let result = await productController.GetProductsByCategory(req.params.categoryId, page, limit);

		if (!result.success && result.errorCode === 'CATEGORY_NOT_FOUND') {
			return res.status(404).json(result);
		}

		return res.json(result);
	} catch (error) {
		return next(error);
	}
});

router.get('/:id', async function (req, res, next) {
	try {
		let result = await productController.GetProductById(req.params.id);

		if (!result.success && result.errorCode === 'PRODUCT_NOT_FOUND') {
			return res.status(404).json(result);
		}

		return res.json(result);
	} catch (error) {
		return next(error);
	}
});

router.post('/', checkLogin, checkRole('ADMIN', 'MODERATOR'), async function (req, res, next) {
	try {
		let result = await productController.CreateProduct(
			req.body.name,
			req.body.price,
			req.body.categoryId,
			req.body.sku,
			req.body.description,
			req.body.images,
			req.body.weightInGram,
			req.body.status
		);

		if (!result.success) {
			if (result.errorCode === 'CATEGORY_NOT_FOUND') {
				return res.status(404).json(result);
			}
			if (result.errorCode === 'DUPLICATE_PRODUCT_NAME_OR_SKU') {
				return res.status(409).json(result);
			}
			return res.status(400).json(result);
		}

		return res.status(201).json(result);
	} catch (error) {
		return next(error);
	}
});

router.put('/:id', checkLogin, checkRole('ADMIN', 'MODERATOR'), async function (req, res, next) {
	try {
		let result = await productController.UpdateProduct(req.params.id, req.body || {});

		if (!result.success) {
			if (result.errorCode === 'PRODUCT_NOT_FOUND' || result.errorCode === 'CATEGORY_NOT_FOUND') {
				return res.status(404).json(result);
			}
			if (result.errorCode === 'DUPLICATE_PRODUCT_NAME_OR_SKU') {
				return res.status(409).json(result);
			}
			return res.status(400).json(result);
		}

		return res.json(result);
	} catch (error) {
		return next(error);
	}
});

router.delete('/:id', checkLogin, checkRole('ADMIN', 'MODERATOR'), async function (req, res, next) {
	try {
		let result = await productController.DeleteProduct(req.params.id);

		if (!result.success && result.errorCode === 'PRODUCT_NOT_FOUND') {
			return res.status(404).json(result);
		}

		return res.json(result);
	} catch (error) {
		return next(error);
	}
});

module.exports = router;

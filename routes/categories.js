var express = require('express');
var router = express.Router();
let categoryController = require('../controllers/categories');
const { checkLogin, checkRole } = require('../utils/authHandler');

/* GET categories listing. */
router.get('/', async function (req, res, next) {
	try {
		let result = await categoryController.QueryAllCategories();
		return res.json(result);
	} catch (error) {
		return next(error);
	}
});

router.get('/:id', async function (req, res, next) {
	try {
		let result = await categoryController.QueryCategoryById(req.params.id);

		if (!result.success && result.errorCode === 'CATEGORY_NOT_FOUND') {
			return res.status(404).json(result);
		}

		return res.json(result);
	} catch (error) {
		return next(error);
	}
});

router.post('/', checkLogin, checkRole('ADMIN', 'MODERATOR'), async function (req, res, next) {
	try {
		let result = await categoryController.CreateACategory(
			req.body.name,
			req.body.description,
			req.body.status
		);

		return res.status(201).json({
			success: true,
			data: result
		});
	} catch (error) {
		if (error && error.code === 11000) {
			return res.status(409).json({
				success: false,
				errorCode: 'DUPLICATE_CATEGORY_NAME',
				message: 'Category name already exists'
			});
		}
		return next(error);
	}
});

router.put('/:id', checkLogin, checkRole('ADMIN', 'MODERATOR'), async function (req, res, next) {
	try {
		let result = await categoryController.UpdateCategory(
			req.params.id,
			req.body.name,
			req.body.description,
			req.body.status
		);

		if (!result.success && result.errorCode === 'CATEGORY_NOT_FOUND') {
			return res.status(404).json(result);
		}

		return res.json(result);
	} catch (error) {
		if (error && error.code === 11000) {
			return res.status(409).json({
				success: false,
				errorCode: 'DUPLICATE_CATEGORY_NAME',
				message: 'Category name already exists'
			});
		}
		return next(error);
	}
});

router.delete('/:id', checkLogin, checkRole('ADMIN', 'MODERATOR'), async function (req, res, next) {
	try {
		let result = await categoryController.DeleteCategory(req.params.id);

		if (!result.success && result.errorCode === 'CATEGORY_NOT_FOUND') {
			return res.status(404).json(result);
		}

		return res.json(result);
	} catch (error) {
		return next(error);
	}
});

module.exports = router;

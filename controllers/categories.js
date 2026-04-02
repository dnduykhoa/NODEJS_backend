let categoryModel = require('../schemas/categories');

function sanitizeCategory(category) {
	return {
		id: category._id,
		name: category.name,
		slug: category.slug,
		description: category.description,
		createdAt: category.createdAt,
		updatedAt: category.updatedAt
	};
}

module.exports = {
	CreateACategory: async function (name, description) {
		let newCategory = new categoryModel({
			name: name,
			description: description
		});

		await newCategory.save();
		return sanitizeCategory(newCategory);
	},

	QueryAllCategories: async function () {
		let categories = await categoryModel.find({ isDeleted: false }).sort({ createdAt: -1 });
		return {
			success: true,
			data: categories.map(sanitizeCategory)
		};
	},

	QueryCategoryById: async function (categoryId) {
		let getCategory = await categoryModel.findOne({ _id: categoryId, isDeleted: false });

		if (!getCategory) {
			return { success: false, errorCode: 'CATEGORY_NOT_FOUND' };
		}

		return {
			success: true,
			data: sanitizeCategory(getCategory)
		};
	},

	UpdateCategory: async function (categoryId, name, description) {
		let getCategory = await categoryModel.findOne({ _id: categoryId, isDeleted: false });

		if (!getCategory) {
			return { success: false, errorCode: 'CATEGORY_NOT_FOUND' };
		}

		if (name !== undefined) getCategory.name = name;
		if (description !== undefined) getCategory.description = description;

		await getCategory.save();

		return {
			success: true,
			data: sanitizeCategory(getCategory)
		};
	},

	DeleteCategory: async function (categoryId) {
		let getCategory = await categoryModel.findOne({ _id: categoryId, isDeleted: false });

		if (!getCategory) {
			return { success: false, errorCode: 'CATEGORY_NOT_FOUND' };
		}

		getCategory.isDeleted = true;
		await getCategory.save();

		return {
			success: true,
			message: 'Category deleted successfully'
		};
	}
};

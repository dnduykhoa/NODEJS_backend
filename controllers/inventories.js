let mongoose = require('mongoose');
let inventoryModel = require('../schemas/inventories');
let productModel = require('../schemas/products');

function sanitizeInventory(inventory) {
	const stock = Number(inventory.stock || 0);
	const reservedStock = Number(inventory.reservedStock || 0);

	return {
		id: inventory._id,
		product: inventory.product,
		stock: stock,
		reservedStock: reservedStock,
		availableStock: Math.max(stock - reservedStock, 0),
		minStockThreshold: inventory.minStockThreshold,
		isLowStock: stock <= Number(inventory.minStockThreshold || 0),
		createdAt: inventory.createdAt,
		updatedAt: inventory.updatedAt
	};
}

function isValidObjectId(id) {
	return mongoose.Types.ObjectId.isValid(id);
}

async function ensureProductExists(productId) {
	if (!isValidObjectId(productId)) {
		return false;
	}

	let exists = await productModel.exists({
		_id: productId,
		isDeleted: false,
		status: true
	});

	return Boolean(exists);
}

module.exports = {
	CreateInventory: async function (productId, stock = 0, minStockThreshold = 0) {
		try {
			const stockNumber = Number(stock || 0);
			const minStockThresholdNumber = Number(minStockThreshold || 0);

			if (!Number.isFinite(stockNumber) || stockNumber < 0) {
				return { success: false, errorCode: 'INVALID_STOCK_VALUE' };
			}

			if (!Number.isFinite(minStockThresholdNumber) || minStockThresholdNumber < 0) {
				return { success: false, errorCode: 'INVALID_STOCK_VALUE' };
			}

			let productExists = await ensureProductExists(productId);
			if (!productExists) {
				return { success: false, errorCode: 'PRODUCT_NOT_FOUND' };
			}

			let existingInventory = await inventoryModel.findOne({ product: productId, isDeleted: false });
			if (existingInventory) {
				return { success: false, errorCode: 'DUPLICATE_INVENTORY' };
			}

			let inventory = new inventoryModel({
				product: productId,
				stock: stockNumber,
				minStockThreshold: minStockThresholdNumber
			});

			await inventory.save();
			await inventory.populate('product');

			return {
				success: true,
				data: sanitizeInventory(inventory)
			};
		} catch (error) {
			if (error && error.code === 11000) {
				return { success: false, errorCode: 'DUPLICATE_INVENTORY' };
			}

			return { success: false, errorCode: 'CREATE_INVENTORY_ERROR', message: error.message };
		}
	},

	GetAllInventories: async function (page = 1, limit = 10, filters = {}) {
		try {
			const pageNumber = Number(page || 1);
			const limitNumber = Number(limit || 10);
			const skip = (pageNumber - 1) * limitNumber;
			const query = { isDeleted: false };

			if (filters.productId) {
				if (!isValidObjectId(filters.productId)) {
					return { success: false, errorCode: 'PRODUCT_NOT_FOUND' };
				}
				query.product = filters.productId;
			}

			if (filters.lowStock) {
				query.$expr = { $lte: ['$stock', '$minStockThreshold'] };
			}

			let inventories = await inventoryModel
				.find(query)
				.populate('product')
				.sort({ updatedAt: -1 })
				.skip(skip)
				.limit(limitNumber);

			let total = await inventoryModel.countDocuments(query);

			return {
				success: true,
				data: inventories.map(sanitizeInventory),
				pagination: {
					page: pageNumber,
					limit: limitNumber,
					total: total,
					pages: Math.ceil(total / limitNumber)
				}
			};
		} catch (error) {
			return { success: false, errorCode: 'GET_INVENTORIES_ERROR', message: error.message };
		}
	},

	GetInventoryByProduct: async function (productId) {
		try {
			if (!isValidObjectId(productId)) {
				return { success: false, errorCode: 'INVENTORY_NOT_FOUND' };
			}

			let inventory = await inventoryModel
				.findOne({ product: productId, isDeleted: false })
				.populate('product');

			if (!inventory) {
				return { success: false, errorCode: 'INVENTORY_NOT_FOUND' };
			}

			return {
				success: true,
				data: sanitizeInventory(inventory)
			};
		} catch (error) {
			return { success: false, errorCode: 'GET_INVENTORIES_ERROR', message: error.message };
		}
	},

	IncreaseStock: async function (productId, quantity) {
		try {
			const quantityNumber = Number(quantity);
			if (!Number.isFinite(quantityNumber) || quantityNumber <= 0) {
				return { success: false, errorCode: 'INVALID_QUANTITY' };
			}

			let productExists = await ensureProductExists(productId);
			if (!productExists) {
				return { success: false, errorCode: 'PRODUCT_NOT_FOUND' };
			}

			let inventory = await inventoryModel.findOne({ product: productId, isDeleted: false });
			if (!inventory) {
				inventory = new inventoryModel({ product: productId, stock: 0 });
			}

			inventory.stock += quantityNumber;
			await inventory.save();
			await inventory.populate('product');

			return {
				success: true,
				data: sanitizeInventory(inventory)
			};
		} catch (error) {
			return { success: false, errorCode: 'UPDATE_INVENTORY_ERROR', message: error.message };
		}
	},

	DecreaseStock: async function (productId, quantity) {
		try {
			const quantityNumber = Number(quantity);
			if (!Number.isFinite(quantityNumber) || quantityNumber <= 0) {
				return { success: false, errorCode: 'INVALID_QUANTITY' };
			}

			if (!isValidObjectId(productId)) {
				return { success: false, errorCode: 'INVENTORY_NOT_FOUND' };
			}

			let inventory = await inventoryModel.findOne({ product: productId, isDeleted: false });
			if (!inventory) {
				return { success: false, errorCode: 'INVENTORY_NOT_FOUND' };
			}

			const availableStock = Number(inventory.stock || 0) - Number(inventory.reservedStock || 0);
			if (availableStock < quantityNumber) {
				return { success: false, errorCode: 'INSUFFICIENT_STOCK' };
			}

			inventory.stock -= quantityNumber;
			await inventory.save();
			await inventory.populate('product');

			return {
				success: true,
				data: sanitizeInventory(inventory)
			};
		} catch (error) {
			return { success: false, errorCode: 'UPDATE_INVENTORY_ERROR', message: error.message };
		}
	},

	AdjustStock: async function (productId, newStock, minStockThreshold) {
		try {
			const newStockNumber = Number(newStock);
			const minStockThresholdNumber = minStockThreshold === undefined ? undefined : Number(minStockThreshold);

			if (!Number.isFinite(newStockNumber) || newStockNumber < 0) {
				return { success: false, errorCode: 'INVALID_STOCK_VALUE' };
			}

			if (
				minStockThresholdNumber !== undefined
				&& (!Number.isFinite(minStockThresholdNumber) || minStockThresholdNumber < 0)
			) {
				return { success: false, errorCode: 'INVALID_STOCK_VALUE' };
			}

			if (!isValidObjectId(productId)) {
				return { success: false, errorCode: 'INVENTORY_NOT_FOUND' };
			}

			let inventory = await inventoryModel.findOne({ product: productId, isDeleted: false });
			if (!inventory) {
				return { success: false, errorCode: 'INVENTORY_NOT_FOUND' };
			}

			if (newStockNumber < Number(inventory.reservedStock || 0)) {
				return { success: false, errorCode: 'INVALID_STOCK_VALUE' };
			}

			inventory.stock = newStockNumber;
			if (minStockThresholdNumber !== undefined) {
				inventory.minStockThreshold = minStockThresholdNumber;
			}

			await inventory.save();
			await inventory.populate('product');

			return {
				success: true,
				data: sanitizeInventory(inventory)
			};
		} catch (error) {
			return { success: false, errorCode: 'UPDATE_INVENTORY_ERROR', message: error.message };
		}
	},

	DeleteInventory: async function (productId) {
		try {
			if (!isValidObjectId(productId)) {
				return { success: false, errorCode: 'INVENTORY_NOT_FOUND' };
			}

			let inventory = await inventoryModel.findOne({ product: productId, isDeleted: false });
			if (!inventory) {
				return { success: false, errorCode: 'INVENTORY_NOT_FOUND' };
			}

			inventory.isDeleted = true;
			await inventory.save();

			return {
				success: true,
				message: 'Inventory deleted successfully'
			};
		} catch (error) {
			return { success: false, errorCode: 'DELETE_INVENTORY_ERROR', message: error.message };
		}
	}
};

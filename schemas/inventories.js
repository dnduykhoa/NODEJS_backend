const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema(
	{
		product: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'product',
			required: [true, 'Product is required'],
			unique: true
		},
		stock: {
			type: Number,
			default: 0,
			min: [0, 'Stock cannot be negative']
		},
		reservedStock: {
			type: Number,
			default: 0,
			min: [0, 'Reserved stock cannot be negative']
		},
		minStockThreshold: {
			type: Number,
			default: 0,
			min: [0, 'Min stock threshold cannot be negative']
		},
		isDeleted: {
			type: Boolean,
			default: false
		}
	},
	{
		timestamps: true
	}
);

inventorySchema.index({ stock: 1, isDeleted: 1 });

module.exports = mongoose.model('inventory', inventorySchema);

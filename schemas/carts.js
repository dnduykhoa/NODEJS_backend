const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'product',
            required: true
        },
        quantity: {
            type: Number,
            default: 1,
            min: [1, 'Quantity must be at least 1']
        }
    },
    {
        _id: false
    }
);

const cartSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            required: true,
            unique: true
        },
        items: {
            type: [cartItemSchema],
            default: []
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

module.exports = mongoose.model('cart', cartSchema);

const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'product',
            required: true
        },
        productName: {
            type: String,
            default: ''
        },
        quantity: {
            type: Number,
            default: 1,
            min: [1, 'Quantity must be at least 1']
        },
        price: {
            type: Number,
            default: 0,
            min: [0, 'Price cannot be negative']
        },
        total: {
            type: Number,
            default: 0,
            min: [0, 'Total cannot be negative']
        }
    },
    {
        _id: false
    }
);

const orderSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            required: true
        },
        items: {
            type: [orderItemSchema],
            default: []
        },
        totalPrice: {
            type: Number,
            default: 0,
            min: [0, 'Total price cannot be negative']
        },
        status: {
            type: String,
            enum: ['PENDING', 'PAID', 'SHIPPED', 'COMPLETED', 'CANCELLED'],
            default: 'PENDING'
        },
        paymentMethod: {
            type: String,
            enum: ['COD'],
            default: 'COD'
        },
        paymentStatus: {
            type: String,
            enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED'],
            default: 'PENDING'
        },
        shippingAddress: {
            type: String,
            default: ''
        },
        note: {
            type: String,
            default: ''
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

orderSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model('order', orderSchema);

const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            required: true
        },
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'product',
            required: true
        },
        quantity: {
            type: Number,
            default: 1,
            min: [1, 'Quantity must be at least 1']
        },
        reservedUntil: {
            type: Date,
            required: true
        },
        status: {
            type: String,
            enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'EXPIRED'],
            default: 'PENDING'
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

reservationSchema.index({ user: 1, status: 1 });
reservationSchema.index({ product: 1, reservedUntil: 1 });

module.exports = mongoose.model('reservation', reservationSchema);

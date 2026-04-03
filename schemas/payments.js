const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
	{
		order: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'order',
			required: [true, 'Order is required'],
			unique: true
		},
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'user',
			required: [true, 'User is required']
		},
		amount: {
			type: Number,
			required: [true, 'Amount is required'],
			min: [0, 'Amount cannot be negative']
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
		transactionId: {
			type: String,
			default: ''
		},
		note: {
			type: String,
			default: ''
		},
		paidAt: {
			type: Date,
			default: null
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

paymentSchema.index({ order: 1, isDeleted: 1 });

paymentSchema.pre('save', function(next) {
	if (this.paymentStatus === 'PAID' && !this.paidAt) {
		this.paidAt = new Date();
	}

	if (this.paymentStatus !== 'PAID') {
		this.paidAt = this.paidAt || null;
	}

	next();
});

module.exports = mongoose.model('payment', paymentSchema);

let mongoose = require('mongoose');
let paymentModel = require('../schemas/payments');
let orderModel = require('../schemas/orders');
let inventoryController = require('./inventories');

function sanitizePayment(payment) {
	return {
		id: payment._id,
		order: payment.order,
		user: payment.user,
		amount: payment.amount,
		paymentMethod: payment.paymentMethod,
		paymentStatus: payment.paymentStatus,
		transactionId: payment.transactionId,
		note: payment.note,
		paidAt: payment.paidAt,
		createdAt: payment.createdAt,
		updatedAt: payment.updatedAt
	};
}

function isValidObjectId(id) {
	return mongoose.Types.ObjectId.isValid(id);
}

function resolvePaymentStatusByOrderStatus(orderStatus, currentPaymentStatus) {
	const normalizedStatus = String(orderStatus || '').toUpperCase();
	const currentStatus = String(currentPaymentStatus || 'PENDING').toUpperCase();

	if (normalizedStatus === 'PAID' || normalizedStatus === 'SHIPPED' || normalizedStatus === 'COMPLETED') {
		return 'PAID';
	}

	if (normalizedStatus === 'CANCELLED') {
		if (currentStatus === 'PAID') {
			return 'REFUNDED';
		}

		return 'CANCELLED';
	}

	if (normalizedStatus === 'PENDING') {
		return 'PENDING';
	}

	return currentStatus;
}

function determineInventoryAction(previousStatus, nextStatus) {
	if (previousStatus !== 'PAID' && nextStatus === 'PAID') {
		return 'commit';
	}

	if (previousStatus === 'PAID' && ['REFUNDED', 'CANCELLED', 'FAILED'].includes(nextStatus)) {
		return 'restore';
	}

	if (previousStatus !== 'PAID' && ['REFUNDED', 'CANCELLED', 'FAILED'].includes(nextStatus)) {
		return 'release';
	}

	return null;
}

function inverseInventoryAction(action) {
	if (action === 'commit') {
		return 'revert-commit';
	}

	if (action === 'restore') {
		return 'consume-restore';
	}

	if (action === 'release') {
		return 'reserve';
	}

	return null;
}

async function applyInventoryTransition(order, previousStatus, nextStatus) {
	if (!order || !Array.isArray(order.items) || order.items.length === 0) {
		return { success: true };
	}

	const action = determineInventoryAction(previousStatus, nextStatus);
	if (action === 'commit') {
		return inventoryController.CommitReservedStockForItems(order.items);
	}

	if (action === 'restore') {
		return inventoryController.RestoreCommittedStockForItems(order.items);
	}

	if (action === 'release') {
		return inventoryController.ReleaseReservedStockForItems(order.items);
	}

	return { success: true };
}

async function rollbackInventoryTransition(order, previousStatus, nextStatus) {
	if (!order || !Array.isArray(order.items) || order.items.length === 0) {
		return { success: true };
	}

	const action = determineInventoryAction(previousStatus, nextStatus);
	const rollbackAction = inverseInventoryAction(action);
	if (rollbackAction === 'revert-commit') {
		return inventoryController.RevertCommittedStockForItems(order.items);
	}

	if (rollbackAction === 'consume-restore') {
		return inventoryController.ConsumeRestoredStockForItems(order.items);
	}

	if (rollbackAction === 'reserve') {
		return inventoryController.ReserveStockForItems(order.items);
	}

	return { success: true };
}

async function ensureOrderExists(orderId) {
	if (!isValidObjectId(orderId)) {
		return null;
	}

	return orderModel.findOne({ _id: orderId, isDeleted: false });
}

module.exports = {
	CreatePaymentForOrder: async function(order, options = {}) {
		try {
			if (!order || !order._id) {
				return { success: false, errorCode: 'ORDER_NOT_FOUND' };
			}

			const existingPayment = await paymentModel.findOne({ order: order._id, isDeleted: false });
			if (existingPayment) {
				return {
					success: true,
					data: sanitizePayment(existingPayment)
				};
			}

			const payment = new paymentModel({
				order: order._id,
				user: order.user,
				amount: Number(order.totalPrice || 0),
				paymentMethod: options.paymentMethod || 'COD',
				paymentStatus: options.paymentStatus || 'PENDING',
				note: options.note || order.note || ''
			});

			await payment.save();

			return {
				success: true,
				data: sanitizePayment(payment)
			};
		} catch (error) {
			if (error && error.code === 11000) {
				return { success: false, errorCode: 'DUPLICATE_PAYMENT' };
			}

			return { success: false, errorCode: 'CREATE_PAYMENT_ERROR', message: error.message };
		}
	},

	GetPaymentsByUser: async function(userId, page, limit) {
		const pageNumber = Number(page || 1);
		const limitNumber = Number(limit || 10);
		const skip = (pageNumber - 1) * limitNumber;

		const query = { user: userId, isDeleted: false };
		const payments = await paymentModel
			.find(query)
			.populate('order')
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(limitNumber);

		const total = await paymentModel.countDocuments(query);

		return {
			success: true,
			data: payments.map(sanitizePayment),
			pagination: {
				page: pageNumber,
				limit: limitNumber,
				total: total,
				pages: Math.ceil(total / limitNumber)
			}
		};
	},

	GetAllPayments: async function(page, limit) {
		const pageNumber = Number(page || 1);
		const limitNumber = Number(limit || 10);
		const skip = (pageNumber - 1) * limitNumber;

		const query = { isDeleted: false };
		const payments = await paymentModel
			.find(query)
			.populate('order')
			.populate('user', 'username email fullName')
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(limitNumber);

		const total = await paymentModel.countDocuments(query);

		return {
			success: true,
			data: payments.map(sanitizePayment),
			pagination: {
				page: pageNumber,
				limit: limitNumber,
				total: total,
				pages: Math.ceil(total / limitNumber)
			}
		};
	},

	GetPaymentById: async function(paymentId, userId, isAdmin) {
		if (!isValidObjectId(paymentId)) {
			return { success: false, errorCode: 'PAYMENT_NOT_FOUND' };
		}

		const query = { _id: paymentId, isDeleted: false };
		if (!isAdmin) {
			query.user = userId;
		}

		const payment = await paymentModel
			.findOne(query)
			.populate('order')
			.populate('user', 'username email fullName');

		if (!payment) {
			return { success: false, errorCode: 'PAYMENT_NOT_FOUND' };
		}

		return {
			success: true,
			data: sanitizePayment(payment)
		};
	},

	UpdatePaymentStatus: async function(paymentId, paymentStatus) {
		if (!isValidObjectId(paymentId)) {
			return { success: false, errorCode: 'PAYMENT_NOT_FOUND' };
		}

		const normalizedStatus = String(paymentStatus || '').toUpperCase();
		if (!['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED'].includes(normalizedStatus)) {
			return { success: false, errorCode: 'INVALID_PAYMENT_STATUS' };
		}

		const payment = await paymentModel.findOne({ _id: paymentId, isDeleted: false });
		if (!payment) {
			return { success: false, errorCode: 'PAYMENT_NOT_FOUND' };
		}

		const previousPaymentStatus = payment.paymentStatus;
		const order = await orderModel.findOne({ _id: payment.order, isDeleted: false });
		const previousOrderStatus = order ? order.status : null;

		payment.paymentStatus = normalizedStatus;
		if (order) {
			order.paymentStatus = normalizedStatus;

			if (normalizedStatus === 'PAID') {
				order.status = order.status === 'CANCELLED' ? order.status : 'PAID';
			}

			if (normalizedStatus === 'REFUNDED' || normalizedStatus === 'CANCELLED') {
				if (order.status !== 'SHIPPED' && order.status !== 'COMPLETED') {
					order.status = 'CANCELLED';
				}
			}
		}

		const inventoryResult = await applyInventoryTransition(order, previousPaymentStatus, normalizedStatus);
		if (!inventoryResult.success) {
			return {
				success: false,
				errorCode: inventoryResult.errorCode || 'UPDATE_INVENTORY_ERROR',
				message: inventoryResult.message || 'Unable to synchronize inventory'
			};
		}

		try {
			await payment.save();
			if (order) {
				await order.save();
			}
		} catch (error) {
			await rollbackInventoryTransition(order, previousPaymentStatus, normalizedStatus);

			payment.paymentStatus = previousPaymentStatus;
			if (order) {
				order.status = previousOrderStatus || order.status;
				order.paymentStatus = previousPaymentStatus;
			}

			try {
				await payment.save();
				if (order) {
					await order.save();
				}
			} catch (rollbackError) {
				return {
					success: false,
					errorCode: 'ROLLBACK_ERROR',
					message: rollbackError.message
				};
			}

			return {
				success: false,
				errorCode: 'UPDATE_PAYMENT_ERROR',
				message: error.message
			};
		}

		return {
			success: true,
			data: sanitizePayment(payment)
		};
	},

	SyncPaymentStatusByOrder: async function(orderId, orderStatus) {
		const order = await ensureOrderExists(orderId);
		if (!order) {
			return { success: true, data: null };
		}

		const payment = await paymentModel.findOne({ order: order._id, isDeleted: false });
		if (!payment) {
			return { success: true, data: null };
		}

		const previousPaymentStatus = payment.paymentStatus;
		const previousOrderStatus = order.status;
		const nextStatus = resolvePaymentStatusByOrderStatus(orderStatus, payment.paymentStatus);
		const inventoryResult = await applyInventoryTransition(order, previousPaymentStatus, nextStatus);
		if (!inventoryResult.success) {
			return {
				success: false,
				errorCode: inventoryResult.errorCode || 'UPDATE_INVENTORY_ERROR',
				message: inventoryResult.message || 'Unable to synchronize inventory'
			};
		}

		const normalizedOrderStatus = String(orderStatus || '').toUpperCase();
		try {
			if (payment.paymentStatus !== nextStatus) {
				payment.paymentStatus = nextStatus;
				await payment.save();
			}

			if (order.paymentStatus !== nextStatus || order.status !== normalizedOrderStatus) {
				order.paymentStatus = nextStatus;
				order.status = normalizedOrderStatus;
				await order.save();
			}
		} catch (error) {
			await rollbackInventoryTransition(order, previousPaymentStatus, nextStatus);

			payment.paymentStatus = previousPaymentStatus;
			order.paymentStatus = previousPaymentStatus;
			order.status = previousOrderStatus;

			try {
				await payment.save();
				await order.save();
			} catch (rollbackError) {
				return {
					success: false,
					errorCode: 'ROLLBACK_ERROR',
					message: rollbackError.message
				};
			}

			return {
				success: false,
				errorCode: 'UPDATE_PAYMENT_ERROR',
				message: error.message
			};
		}

		return {
			success: true,
			data: sanitizePayment(payment)
		};
	}
};

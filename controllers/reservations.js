let reservationModel = require('../schemas/reservations');
let productModel = require('../schemas/products');

function sanitizeReservation(reservation) {
    return {
        id: reservation._id,
        user: reservation.user,
        product: reservation.product,
        quantity: reservation.quantity,
        reservedUntil: reservation.reservedUntil,
        status: reservation.status,
        note: reservation.note,
        createdAt: reservation.createdAt,
        updatedAt: reservation.updatedAt
    };
}

function getDefaultReservedUntil() {
    const oneDayMs = 24 * 60 * 60 * 1000;
    return new Date(Date.now() + oneDayMs);
}

module.exports = {
    CreateReservation: async function (userId, productId, quantity, reservedUntil, note) {
        if (!productId) {
            return { success: false, errorCode: 'MISSING_PRODUCT_ID' };
        }

        const finalQuantity = Number(quantity || 1);
        if (Number.isNaN(finalQuantity) || finalQuantity <= 0) {
            return { success: false, errorCode: 'INVALID_QUANTITY' };
        }

        let productExists = await productModel.findOne({ _id: productId, isDeleted: false, status: true });
        if (!productExists) {
            return { success: false, errorCode: 'PRODUCT_NOT_FOUND' };
        }

        let expiry = reservedUntil ? new Date(reservedUntil) : getDefaultReservedUntil();
        if (Number.isNaN(expiry.getTime())) {
            return { success: false, errorCode: 'INVALID_RESERVED_UNTIL' };
        }

        let reservation = new reservationModel({
            user: userId,
            product: productId,
            quantity: finalQuantity,
            reservedUntil: expiry,
            note: note || ''
        });

        await reservation.save();
        await reservation.populate('product');

        return {
            success: true,
            data: sanitizeReservation(reservation)
        };
    },

    GetReservationsByUser: async function (userId, page, limit) {
        const pageNumber = Number(page || 1);
        const limitNumber = Number(limit || 10);
        const skip = (pageNumber - 1) * limitNumber;

        let reservations = await reservationModel
            .find({ user: userId, isDeleted: false })
            .populate('product')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNumber);

        let total = await reservationModel.countDocuments({ user: userId, isDeleted: false });

        return {
            success: true,
            data: reservations.map(sanitizeReservation),
            pagination: {
                page: pageNumber,
                limit: limitNumber,
                total: total,
                pages: Math.ceil(total / limitNumber)
            }
        };
    },

    GetReservationById: async function (reservationId, userId) {
        let reservation = await reservationModel
            .findOne({ _id: reservationId, user: userId, isDeleted: false })
            .populate('product');

        if (!reservation) {
            return { success: false, errorCode: 'RESERVATION_NOT_FOUND' };
        }

        return {
            success: true,
            data: sanitizeReservation(reservation)
        };
    },

    UpdateReservation: async function (reservationId, userId, updates) {
        let reservation = await reservationModel
            .findOne({ _id: reservationId, user: userId, isDeleted: false })
            .populate('product');

        if (!reservation) {
            return { success: false, errorCode: 'RESERVATION_NOT_FOUND' };
        }

        if (reservation.status !== 'PENDING') {
            return { success: false, errorCode: 'RESERVATION_NOT_EDITABLE' };
        }

        if (updates.quantity !== undefined) {
            const newQuantity = Number(updates.quantity);
            if (Number.isNaN(newQuantity) || newQuantity <= 0) {
                return { success: false, errorCode: 'INVALID_QUANTITY' };
            }
            reservation.quantity = newQuantity;
        }

        if (updates.reservedUntil !== undefined) {
            const newExpiry = new Date(updates.reservedUntil);
            if (Number.isNaN(newExpiry.getTime())) {
                return { success: false, errorCode: 'INVALID_RESERVED_UNTIL' };
            }
            reservation.reservedUntil = newExpiry;
        }

        if (updates.note !== undefined) {
            reservation.note = updates.note || '';
        }

        await reservation.save();

        return {
            success: true,
            data: sanitizeReservation(reservation)
        };
    },

    CancelReservation: async function (reservationId, userId) {
        let reservation = await reservationModel.findOne({ _id: reservationId, user: userId, isDeleted: false });

        if (!reservation) {
            return { success: false, errorCode: 'RESERVATION_NOT_FOUND' };
        }

        reservation.status = 'CANCELLED';
        await reservation.save();

        return {
            success: true,
            message: 'Reservation cancelled'
        };
    }
};

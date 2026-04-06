let reservationModel = require('../schemas/reservations');
let productModel = require('../schemas/products');
let inventoryController = require('./inventories');

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

function toInventoryItems(productId, quantity) {
    return [{
        product: productId,
        quantity: Number(quantity || 0)
    }];
}

async function releaseReservationInventory(reservation) {
    if (!reservation) {
        return { success: true };
    }

    return inventoryController.ReleaseReservedStockForItems(
        toInventoryItems(reservation.product, reservation.quantity)
    );
}

async function reserveReservationInventory(productId, quantity) {
    return inventoryController.ReserveStockForItems(
        toInventoryItems(productId, quantity)
    );
}

async function expireReservationIfNeeded(reservation) {
    if (!reservation || reservation.status !== 'PENDING') {
        return reservation;
    }

    const now = new Date();
    if (!reservation.reservedUntil || reservation.reservedUntil > now) {
        return reservation;
    }

    const releaseResult = await releaseReservationInventory(reservation);
    if (!releaseResult.success) {
        return reservation;
    }

    reservation.status = 'EXPIRED';
    await reservation.save();
    return reservation;
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

        if (expiry <= new Date()) {
            return { success: false, errorCode: 'INVALID_RESERVED_UNTIL' };
        }

        const reserveResult = await reserveReservationInventory(productId, finalQuantity);
        if (!reserveResult.success) {
            return {
                success: false,
                errorCode: reserveResult.errorCode || 'UPDATE_INVENTORY_ERROR',
                message: reserveResult.message || 'Unable to reserve inventory'
            };
        }

        let reservation = new reservationModel({
            user: userId,
            product: productId,
            quantity: finalQuantity,
            reservedUntil: expiry,
            note: note || ''
        });

        try {
            await reservation.save();
        } catch (error) {
            await inventoryController.ReleaseReservedStockForItems(toInventoryItems(productId, finalQuantity));
            return {
                success: false,
                errorCode: 'CREATE_RESERVATION_ERROR',
                message: error.message
            };
        }
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

        for (let index = 0; index < reservations.length; index += 1) {
            reservations[index] = await expireReservationIfNeeded(reservations[index]);
        }

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

        reservation = await expireReservationIfNeeded(reservation);

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

        reservation = await expireReservationIfNeeded(reservation);

        if (reservation.status !== 'PENDING') {
            return { success: false, errorCode: 'RESERVATION_NOT_EDITABLE' };
        }

        const previousQuantity = Number(reservation.quantity || 0);
        const previousReservedUntil = reservation.reservedUntil;
        const previousNote = reservation.note;

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
            if (newExpiry <= new Date()) {
                return { success: false, errorCode: 'INVALID_RESERVED_UNTIL' };
            }
            reservation.reservedUntil = newExpiry;
        }

        if (updates.note !== undefined) {
            reservation.note = updates.note || '';
        }

        const nextQuantity = Number(reservation.quantity || 0);
        if (nextQuantity !== previousQuantity) {
            const releaseResult = await inventoryController.ReleaseReservedStockForItems(
                toInventoryItems(reservation.product, previousQuantity)
            );

            if (!releaseResult.success) {
                reservation.quantity = previousQuantity;
                reservation.reservedUntil = previousReservedUntil;
                reservation.note = previousNote;
                return {
                    success: false,
                    errorCode: releaseResult.errorCode || 'UPDATE_INVENTORY_ERROR',
                    message: releaseResult.message || 'Unable to release previous reserved stock'
                };
            }

            const reserveResult = await inventoryController.ReserveStockForItems(
                toInventoryItems(reservation.product, nextQuantity)
            );

            if (!reserveResult.success) {
                await inventoryController.ReserveStockForItems(toInventoryItems(reservation.product, previousQuantity));
                reservation.quantity = previousQuantity;
                reservation.reservedUntil = previousReservedUntil;
                reservation.note = previousNote;
                return {
                    success: false,
                    errorCode: reserveResult.errorCode || 'UPDATE_INVENTORY_ERROR',
                    message: reserveResult.message || 'Unable to reserve inventory for updated reservation'
                };
            }
        }

        try {
            await reservation.save();
        } catch (error) {
            if (nextQuantity !== previousQuantity) {
                await inventoryController.ReleaseReservedStockForItems(toInventoryItems(reservation.product, nextQuantity));
                await inventoryController.ReserveStockForItems(toInventoryItems(reservation.product, previousQuantity));
            }

            reservation.quantity = previousQuantity;
            reservation.reservedUntil = previousReservedUntil;
            reservation.note = previousNote;
            return {
                success: false,
                errorCode: 'UPDATE_RESERVATION_ERROR',
                message: error.message
            };
        }

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

        reservation = await expireReservationIfNeeded(reservation);
        if (reservation.status === 'PENDING') {
            const releaseResult = await releaseReservationInventory(reservation);
            if (!releaseResult.success) {
                return {
                    success: false,
                    errorCode: releaseResult.errorCode || 'UPDATE_INVENTORY_ERROR',
                    message: releaseResult.message || 'Unable to release reserved inventory'
                };
            }
        }

        reservation.status = reservation.status === 'EXPIRED' ? 'EXPIRED' : 'CANCELLED';
        await reservation.save();

        return {
            success: true,
            message: 'Reservation cancelled'
        };
    }
};

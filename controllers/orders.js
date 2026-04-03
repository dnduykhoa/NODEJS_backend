let orderModel = require('../schemas/orders');
let cartModel = require('../schemas/carts');
let productModel = require('../schemas/products');

function sanitizeOrder(order) {
    return {
        id: order._id,
        user: order.user,
        items: order.items,
        totalPrice: order.totalPrice,
        status: order.status,
        shippingAddress: order.shippingAddress,
        note: order.note,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
    };
}

async function buildOrderItems(rawItems) {
    const productIds = rawItems.map(function(item) {
        return item.productId;
    });

    const products = await productModel.find({
        _id: { $in: productIds },
        isDeleted: false,
        status: true
    });

    const productMap = new Map();
    products.forEach(function(product) {
        productMap.set(String(product._id), product);
    });

    const items = [];
    for (let i = 0; i < rawItems.length; i += 1) {
        const rawItem = rawItems[i];
        const product = productMap.get(String(rawItem.productId));
        if (!product) {
            return { success: false, errorCode: 'PRODUCT_NOT_FOUND' };
        }

        const quantity = Number(rawItem.quantity || 1);
        if (Number.isNaN(quantity) || quantity <= 0) {
            return { success: false, errorCode: 'INVALID_QUANTITY' };
        }

        const price = product.price;
        items.push({
            product: product._id,
            productName: product.name,
            quantity: quantity,
            price: price,
            total: price * quantity
        });
    }

    return { success: true, data: items };
}

module.exports = {
    CreateOrder: async function (userId, items, shippingAddress, note) {
        let rawItems = Array.isArray(items) ? items : [];
        let cartUsed = false;

        if (rawItems.length === 0) {
            let cart = await cartModel.findOne({ user: userId, isDeleted: false });
            if (!cart || cart.items.length === 0) {
                return { success: false, errorCode: 'CART_EMPTY' };
            }
            rawItems = cart.items.map(function(item) {
                return {
                    productId: item.product,
                    quantity: item.quantity
                };
            });
            cartUsed = true;
        }

        const built = await buildOrderItems(rawItems);
        if (!built.success) {
            return built;
        }

        const orderItems = built.data;
        const totalPrice = orderItems.reduce(function(total, item) {
            return total + item.total;
        }, 0);

        let order = new orderModel({
            user: userId,
            items: orderItems,
            totalPrice: totalPrice,
            shippingAddress: shippingAddress || '',
            note: note || ''
        });

        await order.save();

        if (cartUsed) {
            await cartModel.updateOne({ user: userId, isDeleted: false }, { $set: { items: [] } });
        }

        return {
            success: true,
            data: sanitizeOrder(order)
        };
    },

    GetOrdersByUser: async function (userId, page, limit) {
        const pageNumber = Number(page || 1);
        const limitNumber = Number(limit || 10);
        const skip = (pageNumber - 1) * limitNumber;

        let orders = await orderModel
            .find({ user: userId, isDeleted: false })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNumber);

        let total = await orderModel.countDocuments({ user: userId, isDeleted: false });

        return {
            success: true,
            data: orders.map(sanitizeOrder),
            pagination: {
                page: pageNumber,
                limit: limitNumber,
                total: total,
                pages: Math.ceil(total / limitNumber)
            }
        };
    },

    GetOrderById: async function (orderId, userId) {
        let order = await orderModel.findOne({ _id: orderId, user: userId, isDeleted: false });
        if (!order) {
            return { success: false, errorCode: 'ORDER_NOT_FOUND' };
        }

        return {
            success: true,
            data: sanitizeOrder(order)
        };
    },

    CancelOrder: async function (orderId, userId) {
        let order = await orderModel.findOne({ _id: orderId, user: userId, isDeleted: false });
        if (!order) {
            return { success: false, errorCode: 'ORDER_NOT_FOUND' };
        }

        if (order.status !== 'PENDING') {
            return { success: false, errorCode: 'ORDER_NOT_CANCELABLE' };
        }

        order.status = 'CANCELLED';
        await order.save();

        return {
            success: true,
            message: 'Order cancelled'
        };
    },

    UpdateOrderStatus: async function (orderId, status) {
        let order = await orderModel.findOne({ _id: orderId, isDeleted: false });
        if (!order) {
            return { success: false, errorCode: 'ORDER_NOT_FOUND' };
        }

        order.status = status;
        await order.save();

        return {
            success: true,
            data: sanitizeOrder(order)
        };
    }
};

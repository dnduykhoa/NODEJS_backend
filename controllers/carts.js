let cartModel = require('../schemas/carts');
let productModel = require('../schemas/products');

function sanitizeCart(cart) {
    return {
        id: cart._id,
        user: cart.user,
        items: cart.items.map(function(item) {
            return {
                product: item.product,
                quantity: item.quantity
            };
        }),
        createdAt: cart.createdAt,
        updatedAt: cart.updatedAt
    };
}

async function getOrCreateCart(userId) {
    let cart = await cartModel.findOne({ user: userId, isDeleted: false });
    if (!cart) {
        cart = new cartModel({ user: userId, items: [] });
        await cart.save();
    }
    return cart;
}

module.exports = {
    GetCartByUser: async function (userId) {
        let cart = await cartModel.findOne({ user: userId, isDeleted: false }).populate('items.product');

        if (!cart) {
            return {
                success: true,
                data: {
                    user: userId,
                    items: []
                }
            };
        }

        return {
            success: true,
            data: sanitizeCart(cart)
        };
    },

    AddToCart: async function (userId, productId, quantity) {
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

        let cart = await getOrCreateCart(userId);
        let existingItem = cart.items.find(function(item) {
            return String(item.product) === String(productId);
        });

        if (existingItem) {
            existingItem.quantity += finalQuantity;
        } else {
            cart.items.push({ product: productId, quantity: finalQuantity });
        }

        await cart.save();
        await cart.populate('items.product');

        return {
            success: true,
            data: sanitizeCart(cart)
        };
    },

    UpdateCartItem: async function (userId, productId, quantity) {
        if (!productId) {
            return { success: false, errorCode: 'MISSING_PRODUCT_ID' };
        }

        const finalQuantity = Number(quantity);
        if (Number.isNaN(finalQuantity)) {
            return { success: false, errorCode: 'INVALID_QUANTITY' };
        }

        let cart = await cartModel.findOne({ user: userId, isDeleted: false });
        if (!cart) {
            return { success: false, errorCode: 'CART_NOT_FOUND' };
        }

        let itemIndex = cart.items.findIndex(function(item) {
            return String(item.product) === String(productId);
        });

        if (itemIndex === -1) {
            return { success: false, errorCode: 'ITEM_NOT_FOUND' };
        }

        if (finalQuantity <= 0) {
            cart.items.splice(itemIndex, 1);
        } else {
            cart.items[itemIndex].quantity = finalQuantity;
        }

        await cart.save();
        await cart.populate('items.product');

        return {
            success: true,
            data: sanitizeCart(cart)
        };
    },

    RemoveFromCart: async function (userId, productId) {
        if (!productId) {
            return { success: false, errorCode: 'MISSING_PRODUCT_ID' };
        }

        let cart = await cartModel.findOne({ user: userId, isDeleted: false });
        if (!cart) {
            return { success: false, errorCode: 'CART_NOT_FOUND' };
        }

        cart.items = cart.items.filter(function(item) {
            return String(item.product) !== String(productId);
        });

        await cart.save();
        await cart.populate('items.product');

        return {
            success: true,
            data: sanitizeCart(cart)
        };
    },

    ClearCart: async function (userId) {
        let cart = await cartModel.findOne({ user: userId, isDeleted: false });
        if (!cart) {
            return { success: false, errorCode: 'CART_NOT_FOUND' };
        }

        cart.items = [];
        await cart.save();

        return {
            success: true,
            message: 'Cart cleared'
        };
    }
};

let productModel = require("../schemas/products");
let categoryModel = require("../schemas/categories");

function sanitizeProduct(product) {
    return {
        id: product._id,
        name: product.name,
        slug: product.slug,
        sku: product.sku,
        description: product.description,
        price: product.price,
        images: product.images,
        dimensions: product.dimensions,
        weightInGram: product.weightInGram,
        category: product.category,
        status: product.status,
        ratingAverage: product.ratingAverage,
        ratingCount: product.ratingCount,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt
    };
}

module.exports = {
    CreateProduct: async function (name, price, categoryId, sku, description, shortDescription, images, material, color, dimensions, weightInGram, discountPercent, status) {
        try {
            if (!categoryId) {
                return { success: false, errorCode: "MISSING_CATEGORY_OR_BRAND" };
            }

            let categoryExists = await categoryModel.exists({ _id: categoryId, isDeleted: false });
            if (!categoryExists) {
                return { success: false, errorCode: "CATEGORY_NOT_FOUND" };
            }

            let newProduct = new productModel({
                name: name,
                price: price,
                category: categoryId,
                sku: sku,
                description: description,
                images: images || [],
                dimensions: dimensions,
                weightInGram: weightInGram,
                status: status !== undefined ? status : true
            });

            await newProduct.save();
            await newProduct.populate(["category"]);

            return {
                success: true,
                data: sanitizeProduct(newProduct)
            };
        } catch (err) {
            if (err.code === 11000) {
                return { success: false, errorCode: "DUPLICATE_PRODUCT_NAME_OR_SKU" };
            }
            return { success: false, errorCode: "CREATE_PRODUCT_ERROR", message: err.message };
        }
    },

    GetAllProducts: async function (page = 1, limit = 10, filters = {}) {
        try {
            const skip = (page - 1) * limit;
            const query = { isDeleted: false };

            if (filters.categoryId) {
                query.category = filters.categoryId;
            }
            if (filters.status !== undefined) {
                query.status = filters.status;
            }
            if (filters.minPrice !== undefined) {
                query.price = { ...query.price, $gte: filters.minPrice };
            }
            if (filters.maxPrice !== undefined) {
                query.price = { ...query.price, $lte: filters.maxPrice };
            }

            let products = await productModel.find(query)
                .populate(["category"])
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);

            let total = await productModel.countDocuments(query);

            return {
                success: true,
                data: products.map(sanitizeProduct),
                pagination: {
                    page: page,
                    limit: limit,
                    total: total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (err) {
            return { success: false, errorCode: "GET_PRODUCTS_ERROR", message: err.message };
        }
    },

    GetProductById: async function (productId) {
        try {
            let product = await productModel.findOne({ _id: productId, isDeleted: false })
                .populate(["category"]);

            if (!product) {
                return { success: false, errorCode: "PRODUCT_NOT_FOUND" };
            }

            return {
                success: true,
                data: sanitizeProduct(product)
            };
        } catch (err) {
            return { success: false, errorCode: "GET_PRODUCT_ERROR", message: err.message };
        }
    },

    UpdateProduct: async function (productId, updates) {
        try {
            let product = await productModel.findOne({ _id: productId, isDeleted: false });

            if (!product) {
                return { success: false, errorCode: "PRODUCT_NOT_FOUND" };
            }

            if (updates.categoryId) {
                let categoryExists = await categoryModel.exists({ _id: updates.categoryId, isDeleted: false });
                if (!categoryExists) {
                    return { success: false, errorCode: "CATEGORY_NOT_FOUND" };
                }
                updates.category = updates.categoryId;
                delete updates.categoryId;
            }

            Object.assign(product, updates);
            await product.save();
            await product.populate(["category"]);

            return {
                success: true,
                data: sanitizeProduct(product)
            };
        } catch (err) {
            if (err.code === 11000) {
                return { success: false, errorCode: "DUPLICATE_PRODUCT_NAME_OR_SKU" };
            }
            return { success: false, errorCode: "UPDATE_PRODUCT_ERROR", message: err.message };
        }
    },

    DeleteProduct: async function (productId) {
        try {
            let product = await productModel.findOne({ _id: productId, isDeleted: false });

            if (!product) {
                return { success: false, errorCode: "PRODUCT_NOT_FOUND" };
            }

            product.isDeleted = true;
            await product.save();

            return {
                success: true,
                message: "Product deleted successfully"
            };
        } catch (err) {
            return { success: false, errorCode: "DELETE_PRODUCT_ERROR", message: err.message };
        }
    },

    GetProductsByCategory: async function (categoryId, page = 1, limit = 10) {
        try {
            let categoryExists = await categoryModel.exists({ _id: categoryId, isDeleted: false });
            if (!categoryExists) {
                return { success: false, errorCode: "CATEGORY_NOT_FOUND" };
            }

            const skip = (page - 1) * limit;
            let products = await productModel.find({ category: categoryId, isDeleted: false, status: true })
                .populate(["category"])
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);

            let total = await productModel.countDocuments({ category: categoryId, isDeleted: false, status: true });

            return {
                success: true,
                data: products.map(sanitizeProduct),
                pagination: {
                    page: page,
                    limit: limit,
                    total: total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (err) {
            return { success: false, errorCode: "GET_PRODUCTS_BY_CATEGORY_ERROR", message: err.message };
        }
    },

    SearchProducts: async function (keyword, page = 1, limit = 10) {
        try {
            const skip = (page - 1) * limit;
            let products = await productModel.find({
                isDeleted: false,
                $or: [
                    { name: { $regex: keyword, $options: "i" } },
                    { description: { $regex: keyword, $options: "i" } },
                    { shortDescription: { $regex: keyword, $options: "i" } }
                ]
            })
                .populate(["category"])
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);

            let total = await productModel.countDocuments({
                isDeleted: false,
                $or: [
                    { name: { $regex: keyword, $options: "i" } },
                    { description: { $regex: keyword, $options: "i" } },
                    { shortDescription: { $regex: keyword, $options: "i" } }
                ]
            });

            return {
                success: true,
                data: products.map(sanitizeProduct),
                pagination: {
                    page: page,
                    limit: limit,
                    total: total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (err) {
            return { success: false, errorCode: "SEARCH_PRODUCTS_ERROR", message: err.message };
        }
    },
};

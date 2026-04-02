const mongoose = require('mongoose');

function toSlug(value = '') {
    return value
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Product name is required'],
            unique: true,
            trim: true,
            minlength: [2, 'Product name must be at least 2 characters'],
            maxlength: [150, 'Product name cannot exceed 150 characters']
        },

        slug: {
            type: String,
            unique: true,
            trim: true
        },

        sku: {
            type: String,
            unique: true,
            sparse: true,
            trim: true,
            uppercase: true
        },

        description: {
            type: String,
            default: '',
            maxlength: [3000, 'Description cannot exceed 3000 characters']
        },

        shortDescription: {
            type: String,
            default: '',
            maxlength: [300, 'Short description cannot exceed 300 characters']
        },

        price: {
            type: Number,
            required: [true, 'Price is required'],
            min: [0, 'Price cannot be negative']
        },

        discountPercent: {
            type: Number,
            default: 0,
            min: [0, 'Discount percent cannot be negative'],
            max: [90, 'Discount percent cannot exceed 90']
        },

        images: {
            type: [String],
            default: []
        },

        material: {
            type: String,
            default: 'Ceramic',
            trim: true
        },

        color: {
            type: String,
            default: '',
            trim: true
        },

        dimensions: {
            type: String,
            default: '',
            trim: true
        },

        weightInGram: {
            type: Number,
            default: 0,
            min: [0, 'Weight cannot be negative']
        },

        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'category',
            required: [true, 'Category is required']
        },

        status: {
            type: Boolean,
            default: true
        },

        isFeatured: {
            type: Boolean,
            default: false
        },

        ratingAverage: {
            type: Number,
            default: 0,
            min: [0, 'Rating average cannot be negative'],
            max: [5, 'Rating average cannot exceed 5']
        },

        ratingCount: {
            type: Number,
            default: 0,
            min: [0, 'Rating count cannot be negative']
        },

        isDeleted: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

productSchema.virtual('priceAfterDiscount').get(function() {
    return Math.round((this.price * (100 - this.discountPercent)) / 100);
});

productSchema.index({
    name: 1,
    slug: 1,
    category: 1,
    price: 1
});

productSchema.pre('save', function() {
    if (this.name && (this.isModified('name') || !this.slug)) {
        this.slug = toSlug(this.name);
    }
});

module.exports = mongoose.model('product', productSchema);

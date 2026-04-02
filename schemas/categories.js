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

const categorySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Category name is required'],
            unique: true,
            trim: true,
            minlength: [2, 'Category name must be at least 2 characters'],
            maxlength: [100, 'Category name cannot exceed 100 characters']
        },

        slug: {
            type: String,
            unique: true,
            trim: true
        },

        description: {
            type: String,
            default: '',
            maxlength: [500, 'Description cannot exceed 500 characters']
        },

        imageUrl: {
            type: String,
            default: ''
        },

        status: {
            type: Boolean,
            default: true
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

categorySchema.index({
    name: 1,
    slug: 1
});

categorySchema.pre('save', function() {
    if (this.name && (this.isModified('name') || !this.slug)) {
        this.slug = toSlug(this.name);
    }
});

module.exports = mongoose.model('category', categorySchema);

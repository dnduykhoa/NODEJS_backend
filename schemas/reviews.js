const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
    {
        // Sản phẩm được đánh giá
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'product',
            required: [true, 'Product is required']
        },

        // User viết đánh giá
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            required: [true, 'User is required']
        },

        // Điểm đánh giá (1-5 sao)
        rating: {
            type: Number,
            required: [true, 'Rating is required'],
            min: [1, 'Rating must be at least 1'],
            max: [5, 'Rating must not exceed 5']
        },

        // Nội dung bình luận
        comment: {
            type: String,
            required: [true, 'Comment is required'],
            minlength: [1, 'Comment cannot be empty'],
            maxlength: [1000, 'Comment cannot exceed 1000 characters']
        },

        // Trạng thái duyệt
        status: {
            type: String,
            enum: ['APPROVED', 'REJECTED'],
            default: 'APPROVED'
        },

        // Xóa mềm
        isDeleted: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true // Tự động thêm createdAt, updatedAt
    }
);

module.exports = mongoose.model('review', reviewSchema);

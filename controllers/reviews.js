let reviewModel = require('../schemas/reviews');

module.exports = {
    // Lấy tất cả reviews của 1 sản phẩm
    GetReviewsByProduct: async function (productId) {
        let reviews = await reviewModel
            .find({ product: productId, isDeleted: false, status: 'APPROVED' })
            .populate('user', 'username fullName avatarUrl');
        return reviews;
    },

    // Lấy tất cả reviews của 1 user
    GetReviewsByUser: async function (userId) {
        let reviews = await reviewModel
            .find({ user: userId, isDeleted: false })
            .populate('product', 'name');
        return reviews;
    },

    // Thêm review mới
    CreateReview: async function (productId, userId, rating, comment) {
        let newReview = new reviewModel({
            product: productId,
            user: userId,
            rating: rating,
            comment: comment,
            status: 'APPROVED'
        });
        await newReview.save();
        return newReview;
    },

    // Cập nhật review
    UpdateReview: async function (reviewId, rating, comment) {
        let updatedReview = await reviewModel.findByIdAndUpdate(
            reviewId,
            { rating: rating, comment: comment },
            { new: true }
        );
        return updatedReview;
    },

    // Xóa review (soft delete)
    DeleteReview: async function (reviewId) {
        let deletedReview = await reviewModel.findByIdAndUpdate(
            reviewId,
            { isDeleted: true },
            { new: true }
        );
        return deletedReview;
    }
};

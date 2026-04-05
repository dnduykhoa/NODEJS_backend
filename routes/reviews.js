var express = require('express');
var router = express.Router();
let reviewController = require('../controllers/reviews');
let reviewModel = require('../schemas/reviews');
let orderModel = require('../schemas/orders');
let { checkLogin, checkRole } = require('../utils/jwtHandler');

// Lấy tất cả reviews của 1 sản phẩm
router.get('/product/:productId', async function (req, res, next) {
    try {
        let reviews = await reviewController.GetReviewsByProduct(req.params.productId);
        res.json({
            success: true,
            data: reviews
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// Lấy reviews của user hiện tại
router.get('/my-reviews', checkLogin, async function (req, res, next) {
    try {
        let reviews = await reviewController.GetReviewsByUser(req.userId);
        res.json({
            success: true,
            data: reviews
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// Thêm review mới
router.post('/', checkLogin, async function (req, res, next) {
    try {
        const paidOrderExists = await orderModel.exists({
            user: req.userId,
            isDeleted: false,
            paymentStatus: 'PAID',
            items: {
                $elemMatch: { product: req.body.productId }
            }
        });

        if (!paidOrderExists) {
            return res.status(400).json({
                success: false,
                message: 'Bạn chỉ có thể đánh giá sản phẩm thuộc đơn đã thanh toán',
                errorCode: 'REVIEW_NOT_ELIGIBLE'
            });
        }

        // Kiểm tra review đã tồn tại chưa
        let existingReview = await reviewModel.findOne({
            product: req.body.productId,
            user: req.userId,
            isDeleted: false
        });

        if (existingReview) {
            return res.status(409).json({
                success: false,
                message: 'Bạn đã viết review cho sản phẩm này rồi'
            });
        }

        let newReview = await reviewController.CreateReview(
            req.body.productId,
            req.userId,
            req.body.rating,
            req.body.comment
        );

        res.status(201).json({
            success: true,
            message: 'Thêm review thành công',
            data: newReview
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// Chỉnh sửa review của chính mình
router.put('/:id', checkLogin, async function (req, res, next) {
    try {
        let review = await reviewModel.findById(req.params.id);

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review không tồn tại'
            });
        }

        // Kiểm tra có phải chủ sở hữu không
        if (review.user.toString() !== req.userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền sửa review này'
            });
        }

        let updatedReview = await reviewController.UpdateReview(
            req.params.id,
            req.body.rating,
            req.body.comment
        );

        res.json({
            success: true,
            message: 'Cập nhật review thành công',
            data: updatedReview
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// Xóa review của chính mình
router.delete('/:id', checkLogin, async function (req, res, next) {
    try {
        let review = await reviewModel.findById(req.params.id);

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review không tồn tại'
            });
        }

        // Kiểm tra có phải chủ sở hữu không
        if (review.user.toString() !== req.userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền xóa review này'
            });
        }

        let deletedReview = await reviewController.DeleteReview(req.params.id);

        res.json({
            success: true,
            message: 'Xóa review thành công',
            data: deletedReview
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// Admin xem tất cả reviews
router.get('/admin/all', checkLogin, checkRole('ADMIN'), async function (req, res, next) {
    try {
        let reviews = await reviewModel
            .find({ isDeleted: false })
            .populate('user', 'username email')
            .populate('product', 'name');

        res.json({
            success: true,
            data: reviews
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// Admin xóa review 
router.delete('/admin/:id', checkLogin, checkRole('ADMIN'), async function (req, res, next) {
    try {
        let deletedReview = await reviewController.DeleteReview(req.params.id);

        res.json({
            success: true,
            message: 'Xóa review thành công',
            data: deletedReview
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;

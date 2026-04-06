var express = require('express');
var router = express.Router();
let userModel = require('../schemas/users');
let roleModel = require('../schemas/roles');
let { checkLogin, checkRole } = require('../utils/authHandler');

// Lấy danh sách tất cả users
router.get('/', checkLogin, checkRole('ADMIN', 'MODERATOR'), async function(req, res, next) {
  try {
    // Query: tìm tất cả users chưa bị xóa (isDeleted = false)
    const users = await userModel.find({ isDeleted: false })
      // .select() = chỉ lấy các field mong muốn (không lấy password, resetPasswordToken...)
      .select('username email fullName avatarUrl status role loginCount createdAt updatedAt')
      // .populate('role', 'name') = lấy thêm thông tin role (chỉ lấy trường 'name')
      .populate('role', 'name');

    // Trả về dữ liệu với status success = true
    return res.json({
      success: true,
      data: users
    });
  } catch (error) {
    // Nếu có lỗi → truyền lỗi cho middleware xử lý lỗi tiếp theo
    return next(error);
  }
});

// Cập nhật role của user
router.put('/:id/role', checkLogin, checkRole('ADMIN'), async function(req, res, next) {
  try {
    // Lấy userId từ URL parameter (VD: /users/123/role → userId = 123)
    const userId = req.params.id;
    // Lấy roleId từ request body (VD: { roleId: '456' })
    const roleId = req.body.roleId;

    // Kiểm tra: roleId có được gửi lên không?
    if (!roleId) {
      // Nếu không có roleId → trả về 400 (Bad Request)
      return res.status(400).json({
        success: false,
        message: 'Thiếu roleId',
        errorCode: 'MISSING_ROLE_ID'
      });
    }

    // Kiểm tra: role này có tồn tại trong DB không? (chưa bị xóa)
    const role = await roleModel.findOne({ _id: roleId, isDeleted: false });
    // Nếu role không tồn tại
    if (!role) {
      // Trả về 404 (Not Found)
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy role',
        errorCode: 'ROLE_NOT_FOUND'
      });
    }

    // Tìm user theo ID + cập nhật role của user
    const updatedUser = await userModel.findOneAndUpdate(
      { _id: userId, isDeleted: false },  // Tìm user có ID = userId + chưa xóa
      { role: roleId },                    // Cập nhật role thành roleId mới
      { new: true }                        // Trả về dữ liệu AFTER cập nhật
    )
      // Chỉ lấy các field mong muốn (không lấy password, resetPasswordToken...)
      .select('username email fullName avatarUrl status role loginCount createdAt updatedAt')
      // Lấy thêm thông tin role (chỉ lấy trường 'name')
      .populate('role', 'name');

    // Kiểm tra: user có tồn tại không?
    if (!updatedUser) {
      // Nếu không tìm thấy user → trả về 404
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy user',
        errorCode: 'USER_NOT_FOUND'
      });
    }

    // Cập nhật thành công → trả về user đã cập nhật
    return res.json({
      success: true,
      data: updatedUser,
      message: 'Đã cập nhật role cho user'
    });
  } catch (error) {
    // Nếu có lỗi → truyền lỗi cho middleware xử lý lỗi tiếp theo
    return next(error);
  }
});

// Export router để app.js import và sử dụng
module.exports = router;

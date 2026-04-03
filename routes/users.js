var express = require('express');
var router = express.Router();
const userModel = require('../schemas/users');
const roleModel = require('../schemas/roles');
const { checkLogin, checkRole } = require('../utils/jwtHandler');

/* GET users listing. */
router.get('/', checkLogin, checkRole('ADMIN', 'MODERATOR'), async function(req, res, next) {
  try {
    const users = await userModel.find({ isDeleted: false })
      .select('username email fullName avatarUrl status role loginCount createdAt updatedAt')
      .populate('role', 'name');

    return res.json({
      success: true,
      data: users
    });
  } catch (error) {
    return next(error);
  }
});

router.put('/:id/role', checkLogin, checkRole('ADMIN'), async function(req, res, next) {
  try {
    const userId = req.params.id;
    const roleId = req.body.roleId;

    if (!roleId) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu roleId',
        errorCode: 'MISSING_ROLE_ID'
      });
    }

    const role = await roleModel.findOne({ _id: roleId, isDeleted: false });
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy role',
        errorCode: 'ROLE_NOT_FOUND'
      });
    }

    const updatedUser = await userModel.findOneAndUpdate(
      { _id: userId, isDeleted: false },
      { role: roleId },
      { new: true }
    )
      .select('username email fullName avatarUrl status role loginCount createdAt updatedAt')
      .populate('role', 'name');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy user',
        errorCode: 'USER_NOT_FOUND'
      });
    }

    return res.json({
      success: true,
      data: updatedUser,
      message: 'Đã cập nhật role cho user'
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;

var express = require('express');
var router = express.Router();
const userModel = require('../schemas/users');
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

module.exports = router;

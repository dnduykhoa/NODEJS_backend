var express = require('express');
var router = express.Router();
let roleModel = require('../schemas/roles');
let { checkLogin, checkRole } = require('../utils/authHandler');

// Phải đăng nhập + có quyền ADMIN
router.use(checkLogin, checkRole('ADMIN'));

// Lấy tất cả roles
router.get('/', async function (req, res, next) {
    // Query: tìm tất cả roles trong DB mà chưa bị xóa (isDeleted = false)
    let roles = await roleModel.find({ isDeleted: false});
    // Trả về danh sách roles cho client
    res.send(roles);
})

// Lấy role theo ID
router.get('/:id', async function (req, res, next) {
    try {
        // Tìm role 1 cái với ID từ URL (req.params.id) + chưa bị xóa
        let result = await roleModel.findOne({ _id: req.params.id, isDeleted: false });
        // Nếu tìm thấy → trả về role đó
        if (result) {
            res.send(result);
        }
        // Nếu không tìm thấy → trả về 404 (Not Found)
        else {
            res.status(404).send({ message: "ID không tồn tại" });
        }
    } catch (error) {
        // Nếu có lỗi server (VD: ID format sai) → trả về 404
        res.status(404).send({ message: "ID không tồn tại" });
    }
});

// Tạo role mới
router.post('/', async function (req, res, next) {
    try {
        // Tạo object role mới từ dữ liệu trong request body
        let newRole = new roleModel({
            name: req.body.name,              // lấy name từ body
            description: req.body.description  // lấy description từ body
        });
        // Lưu role vào database → MongoDB sẽ tự tạo _id
        await newRole.save();
        // Trả về role vừa tạo (bao gồm _id) cho client
        res.send(newRole);
    } catch (error) {
        // Nếu lỗi 11000 = duplicate key (name đã tồn tại) → trả về 400
        if (error && error.code === 11000) {
            return res.status(400).send({
                message: 'Tên role đã tồn tại',
                errorCode: 'DUPLICATE_ROLE_NAME'
            });
        }
        // Lỗi khác → trả về 400 + thông báo lỗi
        res.status(400).send({ message: error.message });
    }
});

// Cập nhật role
router.put('/:id', async function (req, res, next) {
    try {
        // Lấy ID từ URL
        let id = req.params.id;
        // Tìm role theo ID + cập nhật với dữ liệu trong req.body
        // { new: true } = trả về dữ liệu AFTER cập nhật (không phải trước)
        let updatedRole = await roleModel.findByIdAndUpdate(id, req.body, { new: true });
        // Nếu không tìm thấy role → trả về 404
        if (!updatedRole) {
            return res.status(404).send({ message: "ID không tồn tại" });
        }
        // Trả về role sau khi cập nhật
        res.send(updatedRole);
    } catch (error) {
        // Nếu lỗi 11000 = duplicate key (name đã tồn tại) → trả về 400
        if (error && error.code === 11000) {
            return res.status(400).send({
                message: 'Tên role đã tồn tại',
                errorCode: 'DUPLICATE_ROLE_NAME'
            });
        }
        // Lỗi khác → trả về 400 + thông báo lỗi
        res.status(400).send({ message: error.message });
    }
});

// Xóa role (SOFT DELETE)
// Soft delete = không xóa thực sự, chỉ set isDeleted = true
// → Dữ liệu vẫn ở DB (dễ phục hôi nếu cần), nhưng API không trả về
router.delete('/:id', async function (req, res, next) {
    try {
        // Lấy ID từ URL
        let id = req.params.id;
        // Tìm role theo ID + set isDeleted = true (không xóa thực sự)
        // { new: true } = trả về dữ liệu AFTER cập nhật
        let updatedRole = await roleModel.findByIdAndUpdate(
            id,
            { isDeleted: true },
            { new: true }
        );
        // Nếu không tìm thấy role → trả về 404
        if (!updatedRole) {
            return res.status(404).send({ message: "ID không tồn tại" });
        }
        // Trả về role đã "xóa" (isDeleted = true) cho client
        res.send(updatedRole);
    } catch (error) {
        // Lỗi → trả về 400 + thông báo lỗi
        res.status(400).send({ message: error.message });
    }
});

module.exports = router;
var express = require('express');
var router = express.Router();

let roleModel = require('../schemas/roles');

// Lấy tất cả role
router.get('/', async function (req, res, next) {
    let roles = await roleModel.find({ isDeleted: false});
    res.send(roles);
})

// Lấy role theo id
router.get('/:id', async function (req, res, next) {
    try {
        let result = await roleModel.findOne({ _id: req.params.id, isDeleted: false });
        if (result) {
            res.send(result);
        }
        else {
            res.status(404).send({ message: "Id role not found" });
        }
    } catch (error) {
        res.status(404).send({ message: "Id role not found" });
    }
});

// Thêm mới role
router.post('/', async function (req, res, next) {
    try {
        let newRole = new roleModel({
            name: req.body.name,
            description: req.body.description
        });
        await newRole.save();
        res.send(newRole);
    } catch (error) {
        res.status(400).send({ message: error.message });
    }
});

// Cập nhật role
router.put('/:id', async function (req, res, next) {
    try {
        let id = req.params.id;
        let updatedRole = await roleModel.findByIdAndUpdate(id, req.body, { new: true });
        if (!updatedRole) {
            return res.status(404).send({ message: "Id not found" });
        }
        res.send(updatedRole);
    } catch (error) {
        res.status(400).send({ message: error.message });
    }
});

// Xóa role (soft delete)
router.delete('/:id', async function (req, res, next) {
    try {
        let id = req.params.id;
        let updatedRole = await roleModel.findByIdAndUpdate(
            id,
            { isDeleted: true },
            { new: true }
        );
        if (!updatedRole) {
            return res.status(404).send({ message: "id not found" });
        }
        res.send(updatedRole);
    } catch (error) {
        res.status(400).send({ message: error.message });
    }
});

module.exports = router;
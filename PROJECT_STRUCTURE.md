# Cấu Trúc Và Luồng Xử Lý Dự Án

Tài liệu này tóm tắt cấu trúc project Node.js/Express hiện tại để dễ bám khi code và mở rộng tính năng.

## 1. Tổng Quan

Project là backend API dùng:

- Express để nhận và xử lý HTTP request
- MongoDB + Mongoose để lưu dữ liệu
- JWT + cookie để xác thực
- Multer để upload file
- ExcelJS để import dữ liệu từ Excel
- Nodemailer để gửi mail reset mật khẩu
- Express Validator để validate input

Điểm vào chính của ứng dụng là [app.js](app.js), còn file chạy server là [bin/www](bin/www).

## 2. Cấu Trúc Thư Mục

### File gốc

- [app.js](app.js): cấu hình Express, connect MongoDB, mount routes, xử lý 404 và error handler.
- [bin/www](bin/www): khởi động HTTP server và listen port.
- [package.json](package.json): khai báo dependency và script chạy app.

### controllers

- [controllers/users.js](controllers/users.js): chứa logic nghiệp vụ liên quan đến user.

### routes

- [routes/auth.js](routes/auth.js): đăng ký, đăng nhập, đăng xuất, đổi mật khẩu, quên mật khẩu, reset mật khẩu.
- [routes/users.js](routes/users.js): CRUD user.
- [routes/products.js](routes/products.js): CRUD product, lọc, phân trang, tạo inventory mặc định.
- [routes/inventories.js](routes/inventories.js): xem và cập nhật tồn kho.
- [routes/carts.js](routes/carts.js): xem giỏ hàng, thêm/bớt số lượng item.
- [routes/roles.js](routes/roles.js): CRUD role.
- [routes/upload.js](routes/upload.js): upload ảnh, upload nhiều file, xem file, import Excel.
- [routes/categories.js](routes/categories.js): route khung, hiện mới trả response mẫu.
- [routes/index.js](routes/index.js): route gốc mẫu.

### schemas

- [schemas/users.js](schemas/users.js): model user.
- [schemas/roles.js](schemas/roles.js): model role.
- [schemas/products.js](schemas/products.js): model product.
- [schemas/inventories.js](schemas/inventories.js): model inventory.
- [schemas/cart.js](schemas/cart.js): model cart.
- [schemas/reservations.js](schemas/reservations.js): model reservation.
- [schemas/payments.js](schemas/payments.js): model payment.

### utils

- [utils/authHandler.js](utils/authHandler.js): cau hinh Passport cho Google OAuth.
- [utils/jwtHandler.js](utils/jwtHandler.js): middleware check dang nhap va role bang JWT.
- [utils/validatorHandler.js](utils/validatorHandler.js): validator cho dữ liệu vào.
- [utils/uploadHandler.js](utils/uploadHandler.js): cấu hình Multer cho ảnh và Excel.
- [utils/sendMailHandler.js](utils/sendMailHandler.js): gửi email reset mật khẩu.
- [utils/config.js](utils/config.js): quan ly bien moi truong va cau hinh auth.
- [utils/constants.js](utils/constants.js): file hằng số, chưa thấy dùng nhiều trong luồng chính.

### uploads

- [uploads/](uploads/): nơi lưu file upload.

## 3. Luồng Xử Lý Chung

1. Client gọi API.
2. Request di vao [app.js](app.js) qua cac prefix route hien tai (`/auth`, `/users`, `/roles`, ...).
3. Route chạy middleware trước nếu có:
   - `checkLogin`
   - `checkRole`
   - validator
   - multer upload
4. Route gọi thẳng model Mongoose hoặc controller.
5. Dữ liệu được đọc/ghi trong MongoDB.
6. API trả kết quả bằng `res.send(...)` hoặc `res.status(...).send(...)`.

## 4. Luồng Auth

### Đăng ký

- Endpoint: `POST /auth/register`
- Tạo user bằng `controllers/users.js`
- Mật khẩu được hash ở `schemas/users.js` trước khi lưu
- Sau đó trả message thành công

### Đăng nhập

- Endpoint: `POST /auth/login`
- So sánh password trong [controllers/users.js](controllers/users.js)
- Nếu đúng, tạo JWT và set cookie `token`

### Kiểm tra đăng nhập

- Middleware: `checkLogin` trong [utils/jwtHandler.js](utils/jwtHandler.js)
- Đọc token từ cookie hoặc header `Authorization`
- Verify JWT rồi gán `req.userId`

### Kiểm tra role

- Middleware: `checkRole(...)`
- Load user theo `req.userId`
- So sánh role hiện tại với danh sách role cho phép

### Quên mật khẩu

- Tạo token reset mật khẩu bằng `crypto.randomBytes`
- Lưu token và thời gian hết hạn vào user
- Gửi link qua [utils/sendMailHandler.js](utils/sendMailHandler.js)

### Reset mật khẩu

- Xác thực token reset
- Kiểm tra thời hạn token
- Cập nhật password mới

## 5. Luồng User

### List user

- Endpoint: `GET /users`
- Cần đăng nhập và có quyền `ADMIN` hoặc `MODERATOR`
- Dùng `populate('role')` để lấy tên role

### Tạo user

- Endpoint: `POST /users`
- Validate email và password bằng [utils/validatorHandler.js](utils/validatorHandler.js)
- Dùng transaction để:
  - tạo user
  - tạo cart tương ứng cho user mới

### Update và delete

- Update: `PUT /api/v1/users/:id`
- Delete: soft delete bằng `isDeleted = true`

## 6. Luồng Product Và Inventory

### Product

- `GET /api/v1/products`: lấy danh sách, lọc theo `title`, `minPrice`, `maxPrice`, `limit`, `page`
- `GET /api/v1/products/:id`: lấy chi tiết product
- `POST /api/v1/products`: tạo product và tạo inventory mặc định trong transaction
- `PUT /api/v1/products/:id`: cập nhật product
- `DELETE /api/v1/products/:id`: soft delete

### Inventory

- `GET /api/v1/inventories`: xem kho, populate product
- `POST /api/v1/inventories/increase-stock`: tăng stock
- `POST /api/v1/inventories/decrease-stock`: giảm stock nếu đủ số lượng

## 7. Luồng Cart

- `GET /api/v1/carts`: lấy cart hiện tại của user đang đăng nhập
- `POST /api/v1/carts/add-items`: thêm sản phẩm vào cart hoặc tăng số lượng
- `POST /api/v1/carts/decrease-items`: giảm số lượng hoặc xóa item nếu về 0

Cart được lưu theo user và mỗi item có `product` + `quantity`.

## 8. Luồng Upload

- `POST /api/v1/upload/single`: upload 1 ảnh
- `POST /api/v1/upload/multiple`: upload nhiều ảnh
- `GET /api/v1/upload/:filename`: trả file trong thư mục uploads
- `POST /api/v1/upload/excel`: import Excel để tạo product và inventory

Trong import Excel:

- Đọc file bằng ExcelJS
- Kiểm tra dữ liệu từng dòng
- Chia batch để chạy transaction
- Tạo product trước, sau đó tạo inventory tương ứng

## 9. Quan Hệ Dữ Liệu Chính

- User thuộc về 1 role
- Cart thuộc về 1 user
- Cart chứa nhiều item, mỗi item tham chiếu product
- Inventory thuộc về 1 product
- Reservation và payment hiện đã có schema nhưng chưa thấy route chính trong cây hiện tại

## 10. Thứ Tự Nên Đọc Khi Code

Nếu bạn muốn sửa hoặc thêm tính năng, nên đi theo thứ tự này:

1. Xác định route trong [routes/](routes)
2. Xem middleware liên quan trong [utils/](utils)
3. Xem model trong [schemas/](schemas)
4. Nếu có logic tách riêng thì xem [controllers/](controllers)
5. Kiểm tra luồng transaction, populate, validate, soft delete

## 11. Ghi Chú Quan Trọng

- `categories` hiện mới là route khung, chưa có schema riêng.
- `utils/authHandler.js.js` đang có tên file hơi bất thường, nhưng vẫn là file đang được route sử dụng.
- Nhiều endpoint đang thao tác trực tiếp với model, nên khi thêm tính năng cần cẩn thận về validate và transaction.
- Tài liệu này phản ánh trạng thái hiện tại của source, không phải thiết kế lý tưởng.

## 12. Tóm Tắt Nhanh

Nếu cần nhớ ngắn gọn, hãy nhớ:

- `app.js` là trung tâm mount route
- `routes/` là nơi nhận request
- `utils/` là lớp kiểm tra và tiện ích
- `schemas/` là dữ liệu MongoDB
- `controllers/users.js` là logic user chính
- Luồng phổ biến là: request -> middleware -> model/controller -> MongoDB -> response

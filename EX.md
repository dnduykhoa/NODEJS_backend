# 1. Mục tiêu tối thiểu của nhóm cho website LGBT (bán đồ gốm)

Tài liệu này được điều chỉnh theo **yêu cầu tối thiểu bắt buộc** của nhóm.

Mục tiêu hoàn thành:
- Vận hành đúng kiến trúc chia lớp: **schemas - routes - controllers - utils**.
- Đảm bảo mỗi thành viên hoàn thành đúng phần được phân công.
- Tích hợp được các luồng cốt lõi: đăng nhập/đăng ký, quản lý sản phẩm, giỏ hàng, đơn hàng, thanh toán cơ bản.

# 2. Khung vận hành hệ thống (Layered Architecture)

## schemas/ (Models)
- Định nghĩa cấu trúc dữ liệu MongoDB bằng **Mongoose**.
- Quản lý các thực thể chính của website LGBT: người dùng, sản phẩm gốm, kho hàng, giỏ hàng, đơn hàng, thanh toán, đánh giá.

## routes/
- Khai báo các API endpoint cho từng module.
- Nhận request từ client, chuyển tiếp sang controller tương ứng.

## controllers/
- Xử lý nghiệp vụ chính: kiểm tra dữ liệu, phối hợp giữa các schema, trả response.
- Ví dụ: thêm vào giỏ, kiểm tra tồn kho, tạo đơn, cập nhật trạng thái thanh toán.

## utils/
- Chứa các hàm dùng chung để giảm lặp code.
- Bao gồm: xác thực token, gửi email, upload ảnh, validate dữ liệu.

# 3. Phạm vi tính năng tối thiểu bắt buộc

## 3.1 Người dùng và phân quyền
- Đăng ký, đăng nhập, xác thực bằng JWT.
- Phân quyền theo role (admin, customer).

## 3.2 Danh mục và sản phẩm gốm
- CRUD danh mục, thương hiệu, sản phẩm.
- Quản lý thông tin cơ bản sản phẩm: tên, giá, mô tả, ảnh, danh mục, thương hiệu.

## 3.3 Kho, giỏ hàng, đặt trước, đơn hàng
- Quản lý tồn kho.
- Thêm/xóa/cập nhật số lượng trong giỏ hàng.
- Hỗ trợ giữ hàng/đặt trước và tạo đơn hàng.

## 3.4 Thanh toán, tin nhắn, đánh giá
- Thanh toán mức tối thiểu: ưu tiên **COD**.
- Module message cơ bản để hỗ trợ liên hệ/tư vấn.
- Cho phép người dùng đánh giá sản phẩm.

# 4. Phân chia công việc bắt buộc

## 👨‍💻 Khoa
- **schemas**: `roles`, `users`, `reviews`
- **routes**: `roles`, `users`, `auth`, `reviews`
- **controllers**: `roles`, `users`, `auth`
- **utils**: `authHandle`

## 👨‍💻 Huy
- **schemas**: `inventories`, `payments`, `messages`
- **routes**: `inventories`, `payments`, `messages`
- **controllers**: `inventories`, `payments`, `messages`
- **utils**: `sendMailHandle`

## 👨‍💻 Hưng
- **schemas**: `products`, `categories`, `brands`
- **routes**: `products`, `categories`, `brands`
- **controllers**: `products`, `categories`, `brands`
- **utils**: `uploadHandle`

## 👨‍💻 Khang
- **schemas**: `carts`, `reservations`, `orders`
- **routes**: `carts`, `reservations`, `orders`
- **controllers**: `carts`, `reservations`, `orders`
- **utils**: `validatorHandle`

# 5. Tiêu chí hoàn thành tối thiểu

- Mỗi thành viên hoàn thành đủ module theo phân chia ở Mục 4.
- API chạy được cho toàn bộ module bắt buộc.
- Dữ liệu giữa các module liên kết đúng (user-cart-order-payment, product-inventory-review).
- Có kiểm tra lỗi cơ bản và response thống nhất JSON.
- Demo được luồng mua hàng hoàn chỉnh ở mức tối thiểu:
  - Đăng nhập/đăng ký
  - Xem sản phẩm
  - Thêm giỏ hàng
  - Tạo đơn
  - Chọn COD

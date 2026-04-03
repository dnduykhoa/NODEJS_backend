# Kế Hoạch Triển Khai Module Payments

Tài liệu này mô tả kế hoạch triển khai module `payments` cho backend hiện tại, dựa trên `EX.md`, `TienDo.md`, `PROJECT_STRUCTURE.md` và `POSTMAN_GUIDE.md`.

## 1. Mục Tiêu

- Xây dựng module `payments` theo đúng kiến trúc `schemas - controllers - routes - utils`.
- Hỗ trợ luồng thanh toán tối thiểu theo **COD**.
- Đồng bộ dữ liệu giữa `orders`, `payments` và `inventories`.
- Đảm bảo API có validate, phân quyền và response JSON thống nhất.

## 1.1 Trạng Thái Hiện Tại

- `schemas/payments.js` đã được triển khai.
- `controllers/payments.js` đã được triển khai.
- `routes/payments.js` đã được triển khai.
- `app.js` đã mount `/payments`.
- Payment COD đang đồng bộ với order và inventory qua reserve/commit/release/restore.

## 2. Hiện Trạng Cần Bám

- `controllers/payments.js` đang trống.
- `routes/payments.js` đang trống.
- `schemas/payments.js` đang trống.
- `TienDo.md` xác định `payments` là một trong các module còn thiếu ở phần Huy.
- `EX.md` yêu cầu payment tối thiểu phải đủ để demo luồng mua hàng hoàn chỉnh với COD.

## 3. Phạm Vi Triển Khai

### 3.1 Giai đoạn 1: COD tối thiểu

- Đã triển khai.

### 3.2 Giai đoạn 2: Đồng bộ nghiệp vụ

- Đã triển khai ở mức V1.

### 3.3 Giai đoạn 3: Mở rộng sau

- Chuẩn bị sẵn cấu trúc để sau này thêm VNPAY, MOMO hoặc cổng thanh toán khác.
- Có thể bổ sung `transactionId`, `provider`, `paidAt`, `failureReason` nếu phát sinh.

## 3.4 Còn lại

- Chỉ còn các bước hardening và mở rộng nếu team muốn thêm payment online.

## 4. Thiết Kế Dữ Liệu Đề Xuất

### 4.1 `payments` schema

Các trường tối thiểu nên có:

- `order`: ObjectId, tham chiếu `orders`
- `user`: ObjectId, tham chiếu `users`
- `amount`: Number, bắt buộc, không âm
- `paymentMethod`: String, ví dụ `COD`
- `paymentStatus`: String, ví dụ `PENDING`, `PAID`, `FAILED`, `REFUNDED`
- `transactionId`: String, tùy chọn
- `note`: String, tùy chọn
- `paidAt`: Date, tùy chọn
- `isDeleted`: Boolean, mặc định `false`
- `createdAt`, `updatedAt`

### 4.2 Ràng buộc đề xuất

- Mỗi `order` chỉ nên có một payment chính.
- `amount` phải khớp với tổng tiền của order tại thời điểm tạo payment.
- `paymentMethod` và `paymentStatus` nên giới hạn bằng enum.

## 5. API Đề Xuất

### 5.1 User

- `GET /payments/my-payments`
- `GET /payments/:id`

### 5.2 Admin

- `GET /payments`
- `GET /payments/:id`
- `PATCH /payments/:id/status`

### 5.3 Nội bộ / tích hợp order

- Tạo payment khi `POST /orders` hoặc khi tạo order từ cart.
- Nếu cần tách riêng, có thể thêm endpoint nội bộ để tạo payment từ `orderId`.

## 6. Luồng Nghiệp Vụ

### 6.1 Tạo order từ cart

1. Kiểm tra user đã đăng nhập.
2. Kiểm tra cart không rỗng.
3. Kiểm tra tồn kho.
4. Tạo order.
5. Tạo payment đi kèm order.
6. Trả response chứa cả order và payment.

### 6.2 Thanh toán COD

1. Khi order được tạo, payment ở trạng thái `PENDING` hoặc trạng thái tương đương.
2. Khi đơn được xác nhận hoặc giao thành công, cập nhật payment sang `PAID` nếu quy ước hệ thống yêu cầu.
3. Nếu đơn bị hủy, payment chuyển sang `FAILED` hoặc `REFUNDED` tùy nghiệp vụ.

### 6.3 Hủy đơn

1. Kiểm tra quyền hủy.
2. Cập nhật trạng thái order.
3. Hoàn kho nếu đã giữ hoặc trừ tồn.
4. Đồng bộ trạng thái payment.

## 7. Kế Hoạch Triển Khai Theo File

### 7.1 `schemas/payments.js`

- Đã triển khai.

### 7.2 `controllers/payments.js`

- Đã triển khai.

### 7.3 `routes/payments.js`

- Đã triển khai.

### 7.4 Tích hợp với `orders`

- Đã triển khai ở mức V1.

### 7.5 Tích hợp với `inventories`

- Đã triển khai ở mức V1.

## 8. Validation Tối Thiểu

- `orderId` phải hợp lệ.
- `amount` phải là số dương.
- `paymentMethod` phải thuộc danh sách cho phép.
- `paymentStatus` phải thuộc danh sách cho phép.
- Không cho tạo payment cho order không tồn tại.
- Không cho user xem payment của người khác.

## 9. Response Đề Xuất

Mọi API nên trả theo một format thống nhất:

```json
{
  "success": true,
  "message": "...",
  "data": {}
}
```

Khi lỗi:

```json
{
  "success": false,
  "message": "...",
  "errorCode": "...",
  "errors": []
}
```

## 10. Thứ Tự Thực Hiện

1. Rà soát edge case.
2. Cập nhật `POSTMAN_GUIDE.md`.
3. Test lại các luồng chính.

## 11. Test Case Tối Thiểu

- Tạo order thành công thì sinh payment.
- User xem được payment của chính mình.
- User không xem được payment của user khác.
- Admin xem được danh sách payment.
- Admin cập nhật trạng thái payment.
- Hủy order thì payment được đồng bộ trạng thái.
- Dữ liệu không hợp lệ trả lỗi validate rõ ràng.

## 11.1 Trạng Thái

- Các test case chính đã có đường chạy tương ứng trong code hiện tại.
- Phần còn cần kiểm là chạy thực tế với dữ liệu seed và case biên trên Postman.

## 12. Ưu Tiên Kỹ Thuật

- Ưu tiên giữ code đơn giản, bám theo style hiện tại của project.
- Không đưa vào tích hợp thanh toán ngoài khi COD chưa ổn định.
- Tập trung vào tính đúng của liên kết `order - payment - inventory` trước.

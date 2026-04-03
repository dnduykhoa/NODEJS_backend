# Tiến độ backend hiện tại

Tài liệu này là bản kiểm tra nhanh dựa trên mã nguồn hiện có trong workspace, đối chiếu với yêu cầu tối thiểu trong `EX.md`. Kết luận ngắn: backend đã có khung chạy được cho các luồng cơ bản và đã hoàn thành thêm phần `inventories`, `payments` để khớp luồng mua hàng. Các phần lõi hiện có là `auth`, `products`, `categories`, `carts`, `reservations`, `orders`, `inventories`, `payments`; các phần vẫn chưa có hoặc mới ở mức khung là `brands`, `messages`, `reviews`.

## 1. Đã làm được tới đâu rồi

### 1.1 Hạ tầng chung

- `app.js` đã mount các route chính: `auth`, `users`, `roles`, `products`, `categories`, `carts`, `reservations`, `orders`.
- Có kết nối MongoDB, session, passport Google OAuth, middleware JSON, cookie parser, static file.
- Có bộ `utils` dùng chung cho JWT, validate, upload, gửi mail, config.
- Có seed script cho `roles` và dữ liệu catalog mẫu.

### 1.2 Người dùng và phân quyền

- Đã có đăng ký, đăng nhập, logout, forgot password, reset password.
- Đã có đăng nhập Google.
- Đã có middleware xác thực JWT và kiểm tra role.
- `users` hiện mới có API list user cho admin/moderator, chưa phải bộ CRUD đầy đủ.
- `roles` đã có CRUD cơ bản và đang khóa ở mức admin.

### 1.3 Danh mục và sản phẩm

- `categories` đã có CRUD và soft delete.
- `products` đã có list, search, filter theo category/giá/status, xem chi tiết, tạo/sửa/xóa mềm.
- Schema `product` đã có slug, sku, description, shortDescription, price, discountPercent, images, category, status, rating fields.
- Tuy nhiên hiện phần controller chưa dùng hết các field mà schema đã khai báo, nên chưa khớp hoàn toàn với yêu cầu tối thiểu.

### 1.4 Giỏ hàng, đặt trước, đơn hàng

- `carts` đã có xem giỏ, thêm item, cập nhật số lượng, xóa item, clear cart.
- `reservations` đã có tạo, xem danh sách, xem chi tiết, cập nhật, hủy.
- `orders` đã có tạo đơn từ items hoặc từ cart, xem danh sách, xem chi tiết, hủy đơn, cập nhật trạng thái cho admin.
- Có logic tính giá sau giảm giá trong đơn hàng.

### 1.5 Kho và thanh toán

- `inventories` đã có schema, controller và route.
- Có các thao tác chính: xem kho, tạo kho, tăng, giảm, điều chỉnh, xóa mềm.
- Có luồng giữ kho, trừ kho và hoàn kho để đồng bộ với order/payment.
- `payments` đã có schema, controller và route.
- Tạo order COD sẽ sinh payment tương ứng và đồng bộ trạng thái với order.
- Khi hủy hoặc cập nhật order/payment, hệ thống có cơ chế trả lại trạng thái kho tương ứng.

### 1.6 Các phần hỗ trợ

- `sendMailHandler` đã có chức năng gửi mail reset mật khẩu.
- `uploadHandle` đã có cấu hình upload ảnh, nhưng hiện chưa thấy được gắn vào route nào.
- `validatorHandler` đã có bộ validate cho auth.

## 2. Mức độ hoàn thành theo đầu việc trong `EX.md`

### Khoa

- `schemas/roles`: đã có.
- `schemas/users`: đã có.
- `schemas/reviews`: chưa có.
- `routes/roles`: đã có.
- `routes/users`: đã có nhưng chỉ có list.
- `routes/auth`: đã có.
- `routes/reviews`: chưa có.
- `controllers/roles`: chưa tách riêng thành controller, logic đang nằm trực tiếp trong route.
- `controllers/users`: có, nhưng mới phục vụ auth + list user.
- `controllers/auth`: đang được xử lý một phần trong route, chưa có controller riêng.
- `utils/authHandle`: đã có, nhưng tên file hiện là `authHandler.js`.

### Huy

- `schemas/inventories`: đã có.
- `schemas/payments`: đã có.
- `schemas/messages`: chưa có.
- `routes/inventories`: đã có.
- `routes/payments`: đã có.
- `routes/messages`: chưa có.
- `controllers/inventories`: đã có.
- `controllers/payments`: đã có.
- `controllers/messages`: chưa có.
- `utils/sendMailHandle`: đã có file gửi mail, nhưng tên file hiện là `sendMailHandler.js`.

### Hưng

- `schemas/products`: đã có.
- `schemas/categories`: đã có.
- `schemas/brands`: chưa có.
- `routes/products`: đã có.
- `routes/categories`: đã có.
- `routes/brands`: chưa có.
- `controllers/products`: đã có.
- `controllers/categories`: đã có.
- `controllers/brands`: chưa có.
- `utils/uploadHandle`: đã có, nhưng chưa dùng trong nghiệp vụ.

### Khang

- `schemas/carts`: đã có.
- `schemas/reservations`: đã có.
- `schemas/orders`: đã có.
- `routes/carts`: đã có.
- `routes/reservations`: đã có.
- `routes/orders`: đã có.
- `controllers/carts`: đã có.
- `controllers/reservations`: đã có.
- `controllers/orders`: đã có.
- `utils/validatorHandle`: đã có file validate, nhưng tên file hiện là `validatorHandler.js`.

## 3. Các điểm còn thiếu hoặc chưa khớp yêu cầu

1. Chưa có các module `brands`, `messages`, `reviews` ở cả schema, controller và route.
2. `inventories` và `payments` đã có, nhưng vẫn cần rà soát thêm các case biên khi kết hợp với các luồng khác như hủy đơn, cập nhật trạng thái đơn, và import sản phẩm.
3. Chưa có module review nên chưa đáp ứng phần đánh giá sản phẩm.
4. `products` và `categories` đang có lệch giữa route và controller: route truyền nhiều field hơn controller đang dùng, nên một số dữ liệu bị bỏ qua.
5. `uploadHandle` đã có nhưng chưa nối vào create/update product hoặc category.
6. Response chưa đồng nhất hoàn toàn giữa các module, vẫn còn chỗ trả raw document hoặc `res.send` thay vì JSON thống nhất.
7. Một số module đang thiếu controller riêng đúng nghĩa theo kiến trúc chia lớp, logic còn nằm trực tiếp trong route.

## 4. Kết luận ngắn

- Nếu chỉ tính các luồng nền tảng thì backend đã xong khoảng 70% đến 75%.
- Nếu tính đúng theo yêu cầu tối thiểu trong `EX.md` thì phần còn thiếu tập trung ở `brands`, `reviews`, `messages`, cùng với việc hoàn thiện nốt các chỗ chưa đồng nhất giữa controller và schema.

## 5. Nên làm gì tiếp theo

### Bước 1: Chốt lại chuẩn kiến trúc và tên file

- Thống nhất tên file theo đúng yêu cầu nhóm: `authHandle`, `sendMailHandle`, `validatorHandle` hoặc cập nhật lại tài liệu cho khớp tên hiện tại.
- Tách logic nghiệp vụ còn nằm trong route sang controller nếu muốn giữ đúng layered architecture.
- Chuẩn hóa format response về một kiểu thống nhất: `success`, `message`, `data`, `errorCode`, `errors`.

### Bước 2: Làm xong module còn thiếu của Huy

- Rà lại `inventories` và `payments` để chốt các case biên khi cancel order, đổi trạng thái payment, và hoàn kho.
- Gắn thêm validate chặt hơn cho các API liên quan đến stock và payment.
- Gắn `sendMailHandler` vào một luồng có ích, ví dụ xác nhận đơn hoặc thông báo reset mật khẩu như hiện tại.

### Bước 3: Bổ sung `brands`

- Tạo schema `brand` với các field tối thiểu như `name`, `slug`, `description`, `logoUrl`, `status`, `isDeleted`.
- Thêm controller và route CRUD cho brand.
- Gắn brand vào `product` nếu nhóm muốn bám đúng mô tả ban đầu về sản phẩm gốm.

### Bước 4: Hoàn thiện `products` và `categories`

- Sửa controller product để nhận và lưu đầy đủ `shortDescription`, `material`, `color`, `discountPercent`, `isFeatured` nếu cần.
- Sửa route product để validate input trước khi ghi dữ liệu.
- Sửa controller category để xử lý `imageUrl` và `status` đúng như route đang truyền.
- Nếu có upload ảnh, nối `uploadHandle` vào create/update product và category.

### Bước 5: Làm inventory thật sự

- Tồn kho cơ bản đã có, nhưng cần tiếp tục làm chắc các quy tắc reserve/commit/release để không lệch khi đơn hàng thay đổi nhiều lần.
- Khi thêm giỏ hoặc đặt trước, cần kiểm tra số lượng tồn.
- Khi tạo đơn, cần trừ tồn hoặc giữ tồn theo quy tắc nhóm thống nhất.
- Khi hủy đơn hoặc hủy giữ hàng, cần hoàn tồn kho.

### Bước 6: Làm luồng order và payment tối thiểu

- Quy ước luồng tối thiểu: đăng nhập -> xem sản phẩm -> thêm giỏ -> tạo đơn -> chọn COD.
- Đơn hàng nên có trường `paymentMethod` và `paymentStatus` nếu tách payment module.
- Khi tạo đơn từ cart, cần khóa logic sao cho không tạo đơn rỗng và không vượt tồn kho.
- Nếu có giữ hàng, cần quyết định thời gian giữ và trạng thái hết hạn.

### Bước 7: Làm review và liên kết dữ liệu

- Tạo schema `review` có `user`, `product`, `rating`, `comment`, `status`, `isDeleted`.
- Khi thêm review, cập nhật lại `ratingAverage` và `ratingCount` của product.
- Chặn review trùng nếu nhóm muốn chỉ cho phép người đã mua hàng đánh giá.

### Bước 8: Làm messages cơ bản

- Tạo module message để người dùng gửi câu hỏi/tư vấn.
- Tối thiểu cần `name`, `email`, `content`, `status`, `replyContent`, `isDeleted`.
- Có thể dùng mail để báo admin khi có message mới.

### Bước 9: Rà soát bảo mật và validate

- Thêm validate cho `products`, `categories`, `carts`, `reservations`, `orders`.
- Chặn số lượng âm, giá âm, status sai kiểu, id rỗng.
- Chuẩn hóa middleware auth cho các route private.

### Bước 10: Kiểm thử và chốt demo

- Kiểm tra các luồng chính bằng Postman hoặc collection tương đương.
- Ít nhất phải chạy được: đăng ký, đăng nhập, xem sản phẩm, thêm giỏ, tạo đơn, chọn COD.
- Kiểm tra thêm các case lỗi: không có token, sản phẩm không tồn tại, số lượng không hợp lệ, category không tồn tại, đơn hàng rỗng.

## 6. Thứ tự ưu tiên đề xuất

1. Làm `inventories` và `payments` trước vì nó ảnh hưởng trực tiếp tới luồng mua hàng.
2. Bổ sung `brands` để khớp scope sản phẩm.
3. Sửa `products` và `categories` cho khớp dữ liệu schema và upload ảnh.
4. Làm `reviews` và liên kết điểm đánh giá với sản phẩm.
5. Làm `messages` để đủ module hỗ trợ liên hệ.
6. Chuẩn hóa response, validate và test lại toàn bộ flow.

## 7. Ghi chú nhanh khi đọc code

- `auth` đã khá ổn về mặt luồng cơ bản.
- `products`, `categories`, `carts`, `reservations`, `orders` đang là phần có thể demo được một phần flow mua hàng.
- Điểm nghẽn lớn nhất hiện tại không phải là thiếu route CRUD cơ bản mà là thiếu liên kết nghiệp vụ giữa sản phẩm, tồn kho, đơn hàng và thanh toán.
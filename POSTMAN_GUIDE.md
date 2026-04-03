# Huong dan test API bang Postman

## 1. Chuan bi

- Dam bao MongoDB dang chay.
- Tao file `.env` tu `.env.example` va dien day du bien bat buoc.
- Chay server:

```bash
npm start
```

- Base URL mac dinh: `http://localhost:3000`

## 2. Header mac dinh

```http
Content-Type: application/json
```

Khi goi endpoint duoc bao ve, them:

```http
Authorization: Bearer <jwt-token>
```

## 3. Auth APIs

### 3.1 Dang ky tai khoan

- Method: `POST`
- URL: `http://localhost:3000/auth/register`
- Body:

```json
{
  "username": "testuser01",
  "password": "Abcd@1234",
  "email": "testuser01@gmail.com",
  "avatarUrl": "https://i.sstatic.net/l60Hf.png",
  "fullName": "Test User",
  "birthday": "2000-01-01"
}
```

- Ket qua mong doi: `201`, tra user an toan (khong co password).

### 3.2 Dang nhap

- Method: `POST`
- URL: `http://localhost:3000/auth/login`
- Body:

```json
{
  "username": "testuser01",
  "password": "Abcd@1234"
}
```

- Ket qua mong doi: `200`, tra token trong `data.token`.

### 3.3 Dang xuat

- Method: `POST`
- URL: `http://localhost:3000/auth/logout`
- Ket qua mong doi: `200`.

### 3.4 Quen mat khau

- Method: `POST`
- URL: `http://localhost:3000/auth/forgot-password`
- Body:

```json
{
  "email": "testuser01@gmail.com"
}
```

- Ket qua mong doi: `200` voi thong diep chung.
- Neu SMTP da cau hinh dung, email reset se duoc gui.

### 3.5 Dat lai mat khau

- Method: `POST`
- URL: `http://localhost:3000/auth/reset-password`
- Body:

```json
{
  "token": "<raw-token-tu-link-email>",
  "newPassword": "Xyz@5678"
}
```

- Ket qua mong doi: `200` neu token hop le va chua het han.

### 3.6 Google OAuth

- `GET /auth/google`: mo tren browser de dang nhap Google.
- `GET /auth/google/callback`: callback route duoc Google goi sau khi auth thanh cong.

## 4. Roles APIs (can token va role ADMIN)

- `GET /roles`
- `GET /roles/:id`
- `POST /roles`
- `PUT /roles/:id`
- `DELETE /roles/:id`

Neu khong co token -> `401`.
Neu co token nhung role khong du quyen -> `403`.

## 5. Users API (can token, role ADMIN hoac MODERATOR)

- `GET /users`

## 6. Message APIs (chat cham soc khach hang)

Tat ca endpoint message deu can token (`Authorization: Bearer <jwt-token>`).

### 6.1 User tao ticket hoi tro

- Method: `POST`
- URL: `http://localhost:3000/messages/conversations`
- Body:

```json
{
  "subject": "Can ho tro don hang #DH1001",
  "content": "Minh chua nhan duoc don hang, nho kiem tra giup.",
  "priority": "normal"
}
```

- Ket qua mong doi: `201`, tra ve conversation + firstMessage.

### 6.2 User lay danh sach ticket cua minh

- Method: `GET`
- URL: `http://localhost:3000/messages/my-conversations?limit=20&page=1&status=open`
- Ket qua mong doi: `200`, tra `data.items` va `data.pagination`.

### 6.3 User lay lich su tin nhan theo conversation

- Method: `GET`
- URL: `http://localhost:3000/messages/conversations/<conversation-id>/messages?limit=30&page=1`
- Ket qua mong doi: `200`.

### 6.4 User gui them message vao ticket

- Method: `POST`
- URL: `http://localhost:3000/messages/conversations/<conversation-id>/messages`
- Body:

```json
{
  "content": "Minh da cho 3 ngay roi, nho team check gap."
}
```

- Ket qua mong doi: `201`.

### 6.5 User danh dau da doc

- Method: `POST`
- URL: `http://localhost:3000/messages/conversations/<conversation-id>/read`
- Body: khong can body.
- Ket qua mong doi: `200`, reset unread count phia customer.

### 6.6 Admin lay hang cho ho tro

- Method: `GET`
- URL: `http://localhost:3000/messages/admin/conversations?status=open&assigned=false&limit=20&page=1`
- Role: `ADMIN` hoac `MODERATOR`
- Ket qua mong doi: `200`.

### 6.7 Admin nhan xu ly ticket

- Method: `POST`
- URL: `http://localhost:3000/messages/admin/conversations/<conversation-id>/assign`
- Body: khong can body.
- Ket qua mong doi: `200`.

### 6.8 Admin phan hoi customer

- Method: `POST`
- URL: `http://localhost:3000/messages/admin/conversations/<conversation-id>/messages`
- Body:

```json
{
  "content": "Team da tiep nhan, se kiem tra va phan hoi ban som."
}
```

- Ket qua mong doi: `201`.

### 6.9 Admin cap nhat trang thai ticket

- Method: `PATCH`
- URL: `http://localhost:3000/messages/admin/conversations/<conversation-id>/status`
- Body:

```json
{
  "status": "resolved"
}
```

- Gia tri hop le cua `status`: `pending`, `resolved`, `closed`.
- Ket qua mong doi: `200`.

### 6.10 Admin danh dau da doc

- Method: `POST`
- URL: `http://localhost:3000/messages/conversations/<conversation-id>/read`
- Ket qua mong doi: `200`, reset unread count phia admin.

### 6.11 Alias endpoint

Ban co the goi y chang cac endpoint tren qua prefix `/support-chat` thay cho `/messages`.
Vi du:

- `POST /support-chat/conversations`
- `GET /support-chat/admin/conversations`

## 7. Inventories APIs (can token, write endpoint can role ADMIN/MODERATOR)

Tat ca endpoint inventories deu can token (`Authorization: Bearer <jwt-token>`).

### 7.1 Tao inventory

- Method: `POST`
- URL: `http://localhost:3000/inventories`
- Role: `ADMIN` hoac `MODERATOR`
- Body:

```json
{
  "productId": "<product-id>",
  "stock": 10,
  "minStockThreshold": 3
}
```

- Ket qua mong doi: `201`.
- Loi thuong gap:
  - `404 PRODUCT_NOT_FOUND`
  - `409 DUPLICATE_INVENTORY`

### 7.2 Lay danh sach inventories

- Method: `GET`
- URL: `http://localhost:3000/inventories?page=1&limit=10&productId=<product-id>&lowStock=true`
- Ket qua mong doi: `200`, co `data` va `pagination`.

### 7.3 Lay inventory theo product

- Method: `GET`
- URL: `http://localhost:3000/inventories/product/<product-id>`
- Ket qua mong doi: `200`.
- Neu khong ton tai inventory: `404 INVENTORY_NOT_FOUND`.

### 7.4 Tang ton kho

- Method: `POST`
- URL: `http://localhost:3000/inventories/increase-stock`
- Role: `ADMIN` hoac `MODERATOR`
- Body:

```json
{
  "productId": "<product-id>",
  "quantity": 5
}
```

- Ket qua mong doi: `200`.

### 7.5 Giam ton kho

- Method: `POST`
- URL: `http://localhost:3000/inventories/decrease-stock`
- Role: `ADMIN` hoac `MODERATOR`
- Body:

```json
{
  "productId": "<product-id>",
  "quantity": 3
}
```

- Ket qua mong doi: `200`.
- Loi thuong gap:
  - `404 INVENTORY_NOT_FOUND`
  - `400 INSUFFICIENT_STOCK`

### 7.6 Dieu chinh ton kho

- Method: `PUT`
- URL: `http://localhost:3000/inventories/adjust-stock`
- Role: `ADMIN` hoac `MODERATOR`
- Body:

```json
{
  "productId": "<product-id>",
  "newStock": 2,
  "minStockThreshold": 1
}
```

- Ket qua mong doi: `200`.

### 7.7 Xoa mem inventory

- Method: `DELETE`
- URL: `http://localhost:3000/inventories/product/<product-id>`
- Role: `ADMIN` hoac `MODERATOR`
- Ket qua mong doi: `200`.

## 8. Checklist test nhanh

- Register hop le -> thanh cong.
- Register du lieu loi -> `400`.
- Login dung/sai thong tin -> `200`/`401`.
- Login user bi khoa -> `403`.
- Goi `/roles` khong token -> `401`.
- Goi `/roles` token role khong du quyen -> `403`.
- Forgot/reset password voi token hop le -> doi mat khau thanh cong.
- User tao ticket message -> `201`.
- User gui them message vao ticket -> `201`.
- Admin xem queue va assign ticket -> `200`.
- Admin reply ticket -> `201`.
- User/Admin mark read -> `200`.
- User khong truy cap ticket cua user khac -> `403`.
- Tao inventory -> `201`.
- Tang/giam ton kho hop le -> `200`.
- Giam ton kho vuot qua available -> `400 INSUFFICIENT_STOCK`.
- Goi inventories khong token -> `401`.

## 9. Payments APIs (can token)

Module payments duoc tao tu luong order COD, va co the xem/cap nhat theo quyen.

### 9.1 User lay payment cua minh

- Method: `GET`
- URL: `http://localhost:3000/payments/my-payments?page=1&limit=10`
- Ket qua mong doi: `200`, tra `data` va `pagination`.

### 9.2 User lay chi tiet payment

- Method: `GET`
- URL: `http://localhost:3000/payments/<payment-id>`
- Ket qua mong doi: `200` neu payment thuoc ve user dang dang nhap.

### 9.3 Admin lay tat ca payment

- Method: `GET`
- URL: `http://localhost:3000/payments?page=1&limit=10`
- Role: `ADMIN` hoac `MODERATOR`
- Ket qua mong doi: `200`.

### 9.4 Admin cap nhat trang thai payment

- Method: `PATCH`
- URL: `http://localhost:3000/payments/<payment-id>/status`
- Role: `ADMIN` hoac `MODERATOR`
- Body:

```json
{
  "paymentStatus": "PAID"
}
```

- Gia tri hop le cua `paymentStatus`: `PENDING`, `PAID`, `FAILED`, `REFUNDED`, `CANCELLED`.
- Ket qua mong doi: `200`.

### 9.5 Ket noi voi order

- Khi tao order thanh cong qua `POST /orders`, he thong se sinh payment COD tu dong.
- Response order tao moi tra ve ca `order` va `payment` trong `data`.

### 9.6 Checklist test nhanh

- Tao order thanh cong -> co payment sinh ra.
- User lay duoc payment cua chinh minh.
- Admin lay duoc danh sach payment.
- Admin cap nhat status payment.
- Huy order -> payment dong bo theo trang thai.

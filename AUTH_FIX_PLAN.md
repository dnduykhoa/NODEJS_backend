# Ke hoach sua loi Auth (Dang ky, Dang nhap, va cac phan lien quan)

## 1. Muc tieu
- Hoan thien luong auth o muc production-ready.
- Loai bo hardcode secrets, bo sung validate va xu ly loi.
- Bao ve cac route nghiep vu bang JWT va phan quyen role.
- Dong bo hanh vi auth local va Google OAuth.

## 2. Pham vi
- Auth routes: register, login, Google OAuth callback.
- User controller va user schema lien quan den password/token.
- App config: session, JWT secrets, Mongo connection event.
- Middleware xac thuc/phan quyen cho cac route users/roles.

## 3. Tong hop van de can sua (theo uu tien)
### P0 - Critical
- Hardcode secret trong JWT/session va Google OAuth credentials.
- Co kha nang lo password hash khi tra ve object user sau register.

### P1 - High
- Chua gan validate input cho register/login.
- Chua co try/catch cho async handlers trong auth routes.
- Token local login chua co expiresIn.

### P2 - Medium
- Dang nhap chua chan account bi vo hieu hoa (status/isDeleted).
- Chua ap middleware verify token/role vao routes nghiep vu quan trong.

### P3 - Low
- Sai event name MongoDB (conneted -> connected).
- Tai lieu huong dan va code auth chua dong bo (logout/forgot/reset chua co).

## 4. Ke hoach trien khai chi tiet
### Giai doan 1: Bao mat secrets va config (P0)
- Chuyen toan bo secrets sang bien moi truong:
  - JWT_SECRET
  - SESSION_SECRET
  - GOOGLE_CLIENT_ID
  - GOOGLE_CLIENT_SECRET
  - MONGODB_URI
- Tao file `.env.example` (khong chua gia tri that).
- Cap nhat code de fail-fast neu thieu bien moi truong bat buoc.
- Loai bo toan bo fallback secret hardcode.

### Giai doan 2: Cung co register/login (P0-P1)
- Register:
  - Dung validator cho username/email/password.
  - Bat loi duplicate key (username/email) va tra ma loi ro rang.
  - Khong tra ve password/hash trong response.
- Login:
  - Validate input dau vao.
  - Bo sung expiresIn cho JWT (vd: 7d hoac 15m + refresh token).
  - Kiem tra status/isDeleted truoc khi tao token.
- Dong bo format response:
  - success, message, data, errorCode.

### Giai doan 3: Xu ly loi va middleware (P1-P2)
- Boc auth handlers bang try/catch va next(error).
- Hoan thien middleware JWT verify:
  - Doc token tu Authorization: Bearer <token> (uu tien).
  - Ho tro cookie neu can.
  - Gan user info vao req.user.
- Them middleware checkRole cho routes can bao ve.

### Giai doan 4: Bao ve route nghiep vu (P2)
- Ap middleware checkLogin/checkRole cho:
  - CRUD roles (chi ADMIN hoac role duoc chi dinh).
  - users routes (dung theo chinh sach nghiep vu).
- Dat nguyen tac mac dinh: route quan tri phai can auth.

### Giai doan 5: Bo sung endpoint auth con thieu (P2-P3)
- Them logout endpoint (xoa cookie token neu dung cookie).
- Them forgot-password/reset-password:
  - Tao reset token co han.
  - Luu hash cua reset token thay vi luu plain token.
  - Gui mail reset qua utility sendMail.

### Giai doan 6: Tai lieu va kiem thu (P3)
- Cap nhat README va POSTMAN_GUIDE phan auth dung voi code hien tai.
- Bo sung bo test API auth (Postman collection hoac test tu dong).

## 5. Acceptance Criteria
- Khong con bat ky secret hardcode nao trong source code.
- Register/login tra response an toan, khong lo password hash.
- Input register/login bi reject dung quy tac validator.
- JWT local login co expiresIn va verify duoc o middleware.
- User bi khoa/soft-delete khong dang nhap duoc.
- Roles/users routes da duoc bao ve boi auth va role checks.
- Mongo connection log dung event connected.
- Tai lieu huong dan khop voi hanh vi API thuc te.

## 6. Ke hoach test nhanh sau khi sua
- Register thanh cong voi du lieu hop le.
- Register that bai voi email sai dinh dang/password yeu.
- Login thanh cong va nhan token co exp.
- Login that bai khi sai mat khau.
- Login that bai khi user status=false hoac isDeleted=true.
- Goi route roles/users khi khong co token -> 401.
- Goi route roles/users co token nhung sai role -> 403.
- Google login callback tra token hop le va user info an toan.

## 7. Uoc luong
- Giai doan 1-2: 0.5-1 ngay.
- Giai doan 3-4: 0.5-1 ngay.
- Giai doan 5-6: 1 ngay.
- Tong: 2-3 ngay lam viec.

## 8. Thu tu de xuat thuc hien
1. Giai doan 1 (secrets/config)
2. Giai doan 2 (register/login)
3. Giai doan 3 (middleware/error handling)
4. Giai doan 4 (bao ve routes)
5. Giai doan 5 (forgot/reset/logout)
6. Giai doan 6 (tai lieu + test)

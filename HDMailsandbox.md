# Huong Dan Mail Sandbox

Tai lieu nay giai thich `sendMailHandler.js` dang duoc dung nhu the nao, dung trong truong hop nao, va cach cau hinh de test gui mail ma khong can mail that.

## 1. `sendMailHandler.js` dung de lam gi?

File [utils/sendMailHandler.js](utils/sendMailHandler.js) la module gui email bang SMTP thong qua `nodemailer`.

Hien tai no chi co 1 chuc nang:

- `sendResetPasswordEmail(toEmail, resetLink)`

Chuc nang nay se gui email chua link reset mat khau den nguoi dung.

## 2. No da duoc dung chua?

Co. Hien tai no duoc goi trong [routes/auth.js](routes/auth.js) o API:

- `POST /auth/forgot-password`

Luong hien tai:

1. User nhap email o form quen mat khau.
2. Backend tim user theo email.
3. Neu user ton tai va tai khoan hoat dong, backend tao token reset mat khau.
4. Backend goi `sendMailHandler.sendResetPasswordEmail(user.email, resetLink)`.
5. Email duoc gui ve dia chi do.

## 3. Khi nao no se chay?

No chi chay khi:

- Goi `POST /auth/forgot-password`
- User co email hop le
- Account khong bi xoa va con hoat dong
- Cau hinh mail hop le

Neu cau hinh mail thieu, ham `createTransporter()` se quang loi `Mail configuration is incomplete`.

## 4. `sendMailHandler` can nhung bien moi truong nao?

File [utils/config.js](utils/config.js) dang doc cac bien sau:

- `MAIL_HOST`
- `MAIL_PORT`
- `MAIL_SECURE`
- `MAIL_USER`
- `MAIL_PASS`
- `MAIL_FROM`

Ngoai ra, luong reset mat khau con can:

- `APP_BASE_URL`

Vi du:

```env
MAIL_HOST=sandbox.smtp.mailtrap.io
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=your_user
MAIL_PASS=your_password
MAIL_FROM=Gom Xua <no-reply@gomxua.vn>
APP_BASE_URL=http://localhost:5173
```

## 5. Cach lay mail de test sandbox

Co 2 cach de test an toan:

### Cach 1: Dung Mailtrap

Day la cach de nhat neu ban muon bat ke mail nao gui ra deu chi nam trong hop thu sandbox.

#### Buoc 1: Tao tai khoan
- Vao trang Mailtrap.
- Dang ky tai khoan.
- Tao mot Inbox sandbox.

#### Buoc 2: Lay SMTP credentials
Trong inbox sandbox se co:

- Host
- Port
- Username
- Password

Dien nhung gia tri nay vao `.env`:

```env
MAIL_HOST=sandbox.smtp.mailtrap.io
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=...
MAIL_PASS=...
MAIL_FROM=Gom Xua <no-reply@gomxua.vn>
```

#### Buoc 3: Chay backend
- `npm start`
- Gooi `POST /auth/forgot-password`
- Email se xuat hien trong inbox Mailtrap

### Cach 2: Dung Ethereal Email

Day la SMTP gia lap rat phu hop de test local.

#### Buoc 1: Tao tai khoan test
- Vao https://ethereal.email/
- Tao mot test account hoac dung cong cu tao account tu dong

#### Buoc 2: Lay thong tin SMTP
Ethereal se cap:

- Host
- Port
- Username
- Password

Cau hinh trong `.env`:

```env
MAIL_HOST=smtp.ethereal.email
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=...
MAIL_PASS=...
MAIL_FROM=Gom Xua <no-reply@gomxua.vn>
```

#### Buoc 3: Xem mail
- Sau khi gui, Ethereal se cung cap link preview email.
- Mo link do de xem noi dung mail.

## 6. Cach test dung sau khi cau hinh

### Buoc 1: Kiem tra `.env`
Dam bao co cac bien:

```env
APP_BASE_URL=http://localhost:5173
MAIL_HOST=...
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=...
MAIL_PASS=...
MAIL_FROM=Gom Xua <no-reply@gomxua.vn>
```

### Buoc 2: Chay backend

```powershell
cd D:\Desktop\C2_NNPTUD\BE_C2_BCCK\NODEJS_backend
npm start
```

### Buoc 3: Goi API quen mat khau

```http
POST /auth/forgot-password
Content-Type: application/json

{
  "email": "user01@gmail.com"
}
```

### Buoc 4: Kiem tra hop thu
- Mailtrap: xem trong inbox sandbox
- Ethereal: xem link preview

## 7. No gui noi dung gi?

Email hien tai gui 2 phan:

- Text version
- HTML version

No se chua:

- Link reset mat khau
- Link nay co token va het han theo `RESET_PASSWORD_TOKEN_TTL_MS`

## 8. Neu mail khong gui duoc thi sao?

### Truong hop 1: Loi cau hinh mail
Neu thieu mot trong cac bien:

- `MAIL_HOST`
- `MAIL_USER`
- `MAIL_PASS`
- `MAIL_FROM`

thi backend se bao loi `Mail configuration is incomplete`.

### Truong hop 2: SMTP credentials sai
Kiem tra lai:

- host
- port
- user
- pass
- `MAIL_SECURE`

### Truong hop 3: Firewall / mang
Neu dung SMTP that, may local co the bi chan port.

### Truong hop 4: Token reset het han
Email van gui duoc, nhung link reset co the het han neu user mo qua tre.

## 9. Y nghia cua tung truong trong `sendMailHandler`

Trong [utils/sendMailHandler.js](utils/sendMailHandler.js):

- `createTransporter()`: tao ket noi SMTP
- `sendResetPasswordEmail()`: gui email reset password
- `from`: nguoi gui
- `to`: nguoi nhan
- `subject`: tieu de mail
- `text` / `html`: noi dung mail

## 10. Ket luan

Hien tai `sendMailHandler.js` chi duoc dung cho:

- Gui email reset mat khau

No chua duoc dung cho:

- Dang ky co email xac nhan
- Xac thuc OTP
- Thong bao don hang
- Thong bao reservation

Neu ban muon, co the mo rong file nay de gui them:

- email xac nhan tai khoan
- email thong bao don hang
- email thong bao reservation

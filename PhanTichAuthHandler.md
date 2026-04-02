# Phân Tích `authHandler.js`

Tài liệu này phân tích chi tiết cách viết, cách hoạt động, và cách sử dụng của file `authHandler.js` trong dự án. Mục tiêu là hiểu rõ logic hiện tại để có thể áp dụng đúng phong cách đó khi triển khai `uploadHandle.js`.

## 1. Vai trò của file

`authHandler.js` là file cấu hình và khởi tạo **Passport** cho đăng nhập Google OAuth.

Nó không phải là controller xử lý request theo kiểu CRUD thông thường. Thay vào đó, nó đóng vai trò:
- cấu hình strategy đăng nhập,
- xử lý user sau khi Google xác thực thành công,
- tạo user mới nếu chưa tồn tại,
- serialize/deserialize session cho Passport.

## 2. Các dependency được sử dụng

```js
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const userModel = require('../schemas/users');
const config = require('./config');
```

Ý nghĩa từng dòng:
- `passport`: thư viện lõi để quản lý authentication strategy.
- `GoogleStrategy`: strategy OAuth2 của Google.
- `userModel`: model MongoDB để tìm và tạo user.
- `config`: nơi lấy cấu hình từ biến môi trường như `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `DEFAULT_ROLE_ID`.

## 3. Hàm phụ `buildUniqueUsername`

```js
async function buildUniqueUsername(baseUsername) {
    let normalized = (baseUsername || 'googleuser').toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!normalized) {
        normalized = 'googleuser';
    }

    let candidate = normalized;
    let counter = 1;
    while (await userModel.exists({ username: candidate })) {
        candidate = normalized + counter;
        counter += 1;
    }
    return candidate;
}
```

### Mục đích

Khi người dùng đăng nhập bằng Google, username thường được lấy từ email. Tuy nhiên username đó có thể bị trùng với user đã có trong DB. Hàm này đảm bảo username tạo ra là duy nhất.

### Cách hoạt động

1. Lấy `baseUsername`, nếu không có thì mặc định là `googleuser`.
2. Chuẩn hóa thành chữ thường và loại bỏ ký tự không hợp lệ, chỉ giữ `a-z`, `0-9`, `_`.
3. Nếu kết quả rỗng thì fallback lại `googleuser`.
4. Kiểm tra DB xem username này đã tồn tại chưa.
5. Nếu đã tồn tại, thêm số đếm phía sau cho đến khi tìm được tên hợp lệ.

### Vì sao cần bước này

Nếu không làm bước này, Google login có thể tạo ra lỗi duplicate key khi lưu user mới.

## 4. Cấu hình Google Strategy

```js
passport.use(new GoogleStrategy({
    clientID: config.googleClientId,
    clientSecret: config.googleClientSecret,
    callbackURL: config.googleCallbackUrl
}, async (accessToken, refreshToken, profile, done) => {
```

### Ý nghĩa

Đây là nơi Passport được gắn với Google OAuth.

- `clientID`: mã ứng dụng Google.
- `clientSecret`: secret của ứng dụng Google.
- `callbackURL`: URL Google redirect về sau khi xác thực xong.

### Flow tổng quát

1. User bấm đăng nhập Google.
2. Google xác thực.
3. Google redirect về `callbackURL`.
4. `passport-google-oauth20` gọi callback xử lý `profile`.
5. Code tìm user trong DB hoặc tạo mới.
6. `done()` được gọi để kết thúc quá trình.

## 5. Xử lý user sau khi Google trả về profile

```js
async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await userModel.findOne({ email: profile.emails[0].value });
        
        if (user) {
            if (user.isDeleted || !user.status) {
                return done(new Error('Account is disabled'), null);
            }
            return done(null, user);
        } else {
            const username = await buildUniqueUsername(profile.emails[0].value.split('@')[0]);
            const newUser = new userModel({
                username: username,
                email: profile.emails[0].value,
                fullName: profile.displayName,
                avatarUrl: profile.photos[0].value,
                googleId: profile.id,
                role: config.defaultRoleId,
                status: true,
                loginCount: 1
            });
            await newUser.save();
            return done(null, newUser);
        }
    } catch (err) {
        return done(err, null);
    }
}
```

### Luồng khi user đã tồn tại

- Tìm user theo email Google trả về.
- Nếu thấy user:
  - kiểm tra `isDeleted` và `status`.
  - nếu tài khoản bị khóa hoặc xóa, trả lỗi `Account is disabled`.
  - nếu hợp lệ, gọi `done(null, user)`.

### Luồng khi user chưa tồn tại

- Tạo username mới từ phần đứng trước dấu `@` trong email.
- Gọi `buildUniqueUsername()` để tránh trùng.
- Tạo mới `userModel` với các field:
  - `username`
  - `email`
  - `fullName`
  - `avatarUrl`
  - `googleId`
  - `role`
  - `status`
  - `loginCount`
- Lưu vào DB bằng `await newUser.save()`.
- Gọi `done(null, newUser)`.

### Điểm quan trọng trong flow này

- Dữ liệu được lấy trực tiếp từ `profile` của Google.
- File này không tự trả response cho client, mà trả kết quả cho Passport xử lý tiếp.
- Việc kiểm tra `isDeleted` và `status` giúp chặn tài khoản bị vô hiệu hóa dù vẫn tồn tại trong DB.

## 6. serializeUser và deserializeUser

```js
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await userModel.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});
```

### serializeUser

- Được gọi khi Passport muốn lưu thông tin user vào session.
- Chỉ lưu `user.id` thay vì toàn bộ object để nhẹ hơn.

### deserializeUser

- Được gọi ở các request sau để lấy lại user từ `id` trong session.
- Từ `id`, file này query DB bằng `findById()`.
- Sau đó gọi `done(null, user)` để gắn user vào request.

## 7. Cách file này được gọi trong hệ thống

File này thường được import trong phần khởi tạo app, ví dụ:

- `app.js`
- file router auth
- file cấu hình passport/session

Sau khi import, chỉ cần `passport.initialize()` và `passport.session()` là strategy sẽ hoạt động.

### Luồng gọi điển hình

1. Ứng dụng load `authHandler.js`.
2. Passport được cấu hình Google strategy.
3. User truy cập route đăng nhập Google.
4. Google callback kích hoạt strategy.
5. Passport gọi hàm verify callback trong file này.
6. Session được lưu bằng `serializeUser`.
7. Những request sau đó dùng `deserializeUser` để tái dựng user.

## 8. Vì sao file này có cấu trúc tốt

- Tách riêng logic authentication ra khỏi controller.
- Dễ tái sử dụng và bảo trì.
- Dễ mở rộng thêm strategy khác như Facebook, local login, hoặc OAuth khác.
- Chỉ tập trung vào một nhiệm vụ: xác thực và đồng bộ user.

## 9. Những pattern có thể áp dụng cho `uploadHandle.js`

Khi viết `uploadHandle.js`, nên giữ đúng tinh thần của `authHandler.js`:

- Khởi tạo sẵn một cấu hình dùng chung ở level module.
- Tách helper nhỏ ra khỏi phần cấu hình chính.
- Xuất module đã được cấu hình xong để nơi khác chỉ cần `require()` và dùng.
- Không để controller tự xử lý chi tiết upload, mà gọi qua middleware/file config này.

### Mapping tư duy sang upload

`authHandler.js` hiện làm những việc sau:
- chuẩn hóa input,
- kiểm tra trùng,
- cấu hình middleware lõi,
- xử lý kết quả,
- export module hoàn chỉnh.

Với `uploadHandle.js`, bạn nên làm tương tự:
- chuẩn hóa tên file,
- kiểm tra đích lưu trữ,
- cấu hình multer,
- export middleware upload đã sẵn sàng dùng,
- để route/controller chỉ việc gọi.

## 10. Kết luận ngắn

`authHandler.js` là một module cấu hình middleware theo kiểu "setup một lần, dùng nhiều nơi".

Điểm mấu chốt cần học là:
- phân tách trách nhiệm,
- xử lý dữ liệu đầu vào trước khi lưu,
- giữ phần cấu hình ở mức module,
- export ra một object/middleware hoàn chỉnh.

Đây là kiểu viết rất phù hợp để áp dụng nguyên tắc tương tự cho `uploadHandle.js` khi bạn dùng **multer** để upload ảnh.
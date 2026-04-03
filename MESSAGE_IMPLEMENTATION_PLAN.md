# Ke hoach trien khai chat cham soc khach hang (User <-> Admin)

## 1. Muc tieu
- Xay dung kenh chat ho tro giua nguoi dung va admin/agent CSKH.
- Moi user co the tao yeu cau ho tro (ticket chat) va nhan phan hoi tu admin.
- Admin co man hinh danh sach cuoc hoi thoai de nhan xu ly va tra loi.
- Dam bao phan quyen ro rang: user chi thay chat cua minh, admin thay tat ca hoac chat duoc giao.

## 2. Pham vi V1
- In-scope:
  - User tao conversation ho tro.
  - User gui tin nhan vao conversation cua minh.
  - Admin xem hang cho va nhan (assign) conversation.
  - Admin va user nhan tin 2 chieu trong conversation.
  - Danh dau da doc va cap nhat trang thai conversation.
- Out-of-scope (V2):
  - Live socket real-time.
  - Gui file/hinh.
  - SLA dashboard nang cao.
  - Bot tra loi tu dong.

## 3. Mo hinh du lieu de xuat
### 3.1 SupportConversation
File de xuat: `schemas/supportConversations.js`
- customerId: ObjectId(user), required
- assignedAdminId: ObjectId(user), default null
- status: String, enum [`open`, `pending`, `resolved`, `closed`], default `open`
- priority: String, enum [`low`, `normal`, `high`, `urgent`], default `normal`
- subject: String, required, max 200
- lastMessage: String
- lastMessageAt: Date
- unreadCountForCustomer: Number, default 0
- unreadCountForAdmin: Number, default 0
- isDeleted: Boolean, default false
- timestamps

Index de xuat:
- customerId + status
- assignedAdminId + status + lastMessageAt
- status + priority + lastMessageAt

### 3.2 SupportMessage
File de xuat: `schemas/supportMessages.js`
- conversationId: ObjectId(supportConversation), required
- senderId: ObjectId(user), required
- senderRole: String, enum [`customer`, `admin`], required
- content: String, required, max 2000
- messageType: String, enum [`text`, `system`], default `text`
- readByCustomerAt: Date, default null
- readByAdminAt: Date, default null
- isDeleted: Boolean, default false
- timestamps

Index de xuat:
- conversationId + createdAt
- senderId + createdAt

## 4. API design (V1)
Prefix de xuat: `/support-chat`

### 4.1 User tao ticket chat
- `POST /support-chat/conversations`
- Role: user da login
- Body: `{ subject: string, content: string, priority?: 'low'|'normal'|'high'|'urgent' }`
- Ket qua:
  - Tao conversation moi.
  - Tao message dau tien tu customer.

### 4.2 User lay danh sach chat cua minh
- `GET /support-chat/my-conversations?limit=20&page=1&status=open`
- Role: user

### 4.3 User lay chi tiet message
- `GET /support-chat/conversations/:id/messages?limit=30&page=1`
- Role: user (chi conversation cua minh) hoac admin

### 4.4 User gui them message
- `POST /support-chat/conversations/:id/messages`
- Role: user (chi conversation cua minh)
- Body: `{ content: string }`

### 4.5 Admin lay queue ho tro
- `GET /support-chat/admin/conversations?status=open&assigned=false&limit=20&page=1`
- Role: admin/moderator

### 4.6 Admin nhan xu ly conversation
- `POST /support-chat/admin/conversations/:id/assign`
- Role: admin/moderator
- Rule:
  - Neu chua assigned thi gan cho admin hien tai.
  - Neu da assigned thi tra conflict hoac cho force assign (V2).

### 4.7 Admin tra loi customer
- `POST /support-chat/admin/conversations/:id/messages`
- Role: admin/moderator
- Body: `{ content: string }`

### 4.8 Cap nhat trang thai ticket
- `PATCH /support-chat/admin/conversations/:id/status`
- Role: admin/moderator
- Body: `{ status: 'pending'|'resolved'|'closed' }`

### 4.9 Danh dau da doc
- `POST /support-chat/conversations/:id/read`
- Role: user hoac admin
- Rule:
  - user doc -> reset unreadCountForCustomer
  - admin doc -> reset unreadCountForAdmin

## 5. Bao mat va phan quyen
- Toan bo route su dung `checkLogin`.
- Route admin su dung them `checkRole('ADMIN', 'MODERATOR')`.
- Rule truy cap:
  - User chi truy cap conversation co `customerId = req.userId`.
  - Admin truy cap tat ca hoac theo assigned.
- Validate voi `express-validator`:
  - id hop le
  - content khong rong
  - subject toi da 200 ky tu

## 6. Cau truc code de xuat
- `schemas/supportConversations.js`
- `schemas/supportMessages.js`
- `controllers/supportChat.js`
- `routes/supportChat.js`
- `utils/supportChatValidator.js` (neu can tach)

Them vao `app.js`:
- `app.use('/support-chat', require('./routes/supportChat'));`

## 7. Luong nghiep vu chinh
1. User tao ticket chat (subject + noi dung).
2. Conversation vao queue `open`, chua assigned.
3. Admin vao queue, assign conversation.
4. Hai ben trao doi message.
5. Admin cap nhat trang thai `pending/resolved/closed`.

## 8. Ke hoach trien khai theo giai doan
### Giai doan 1: Data model
- Tao schema conversation + message cho support chat.
- Tao index va enum status/priority.

### Giai doan 2: User flow APIs
- Tao ticket, list ticket cua user, xem message, gui message.
- Validate request va xu ly loi thong nhat.

### Giai doan 3: Admin flow APIs
- Queue list, assign conversation, reply, update status.
- Kiem tra role ADMIN/MODERATOR.

### Giai doan 4: Read state + docs
- Endpoint danh dau da doc va unread count.
- Cap nhat Postman guide va tai lieu.

## 9. Acceptance criteria
- User tao duoc ticket va nhan tin 2 chieu voi admin.
- Admin thay duoc queue, assign duoc, va update status.
- User khong doc duoc conversation cua user khac (403).
- Unread count tang/giam dung theo ben gui/ben doc.
- API response format dong nhat voi he thong auth hien tai.

## 10. Uoc luong
- Giai doan 1: 0.5 ngay
- Giai doan 2: 1 ngay
- Giai doan 3: 1 ngay
- Giai doan 4: 0.5 ngay
- Tong: 3 ngay

## 11. Mo rong V2
- Socket.io de nhan tin real-time.
- Auto assignment theo workload.
- SLA canh bao ticket qua han.
- File attachment va canned responses.

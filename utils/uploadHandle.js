const fs = require('fs');
const path = require('path');
const multer = require('multer'); // Middleware xử lý multipart/form-data, chủ yếu dùng để upload file

const uploadDir = path.join(__dirname, '..', 'public', 'uploads');

if (!fs.existsSync(uploadDir)) {
	fs.mkdirSync(uploadDir, { recursive: true });
}

function normalizeFileName(originalName = '') {
	return originalName
		.toString()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9\s-_.]/g, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-');
}

const storage = multer.diskStorage({    // Cấu hình lưu trữ cho multer (trên cloud thì sẽ khác)
	destination(req, file, cb) {
		cb(null, uploadDir);
	},

	filename(req, file, cb) {       //cd: callback, file: đối tượng file được multer tạo ra sau khi nhận được file từ client
		const ext = path.extname(file.originalname);
		const baseName = normalizeFileName(path.basename(file.originalname, ext)) || 'image';
		const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
		cb(null, baseName + '-' + uniqueSuffix + ext);
	}
});

function fileFilter(req, file, cb) {
	if (!file.mimetype || !file.mimetype.startsWith('image/')) {
		return cb(new Error('Only image files are allowed'), false);
	}
	cb(null, true);
}

const upload = multer({
	storage: storage,
	fileFilter: fileFilter,
	limits: {
		fileSize: 5 * 1024 * 1024
	}
});

module.exports = upload;

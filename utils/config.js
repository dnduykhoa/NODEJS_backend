require('dotenv').config();

function getRequiredEnv(name) {
	const value = process.env[name];
	if (!value) {
		throw new Error('Missing required environment variable: ' + name);
	}
	return value;
}

module.exports = {
	nodeEnv: process.env.NODE_ENV || 'development',
	appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:3000',
	mongodbUri: getRequiredEnv('MONGODB_URI'),
	jwtSecret: getRequiredEnv('JWT_SECRET'),
	jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
	sessionSecret: getRequiredEnv('SESSION_SECRET'),
	defaultRoleId: getRequiredEnv('DEFAULT_ROLE_ID'),
	googleClientId: getRequiredEnv('GOOGLE_CLIENT_ID'),
	googleClientSecret: getRequiredEnv('GOOGLE_CLIENT_SECRET'),
	googleCallbackUrl: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback',
	mailHost: process.env.MAIL_HOST,
	mailPort: Number(process.env.MAIL_PORT || 587),
	mailSecure: process.env.MAIL_SECURE === 'true',
	mailUser: process.env.MAIL_USER,
	mailPass: process.env.MAIL_PASS,
	mailFrom: process.env.MAIL_FROM,
	resetPasswordTokenTtlMs: Number(process.env.RESET_PASSWORD_TOKEN_TTL_MS || 3600000)
};

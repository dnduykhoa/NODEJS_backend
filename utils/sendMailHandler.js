const nodemailer = require('nodemailer');
const config = require('./config');

function createTransporter() {
	if (!config.mailHost || !config.mailUser || !config.mailPass || !config.mailFrom) {
		throw new Error('Mail configuration is incomplete');
	}

	return nodemailer.createTransport({
		host: config.mailHost,
		port: config.mailPort,
		secure: config.mailSecure,
		auth: {
			user: config.mailUser,
			pass: config.mailPass
		}
	});
}

async function sendResetPasswordEmail(toEmail, resetLink) {
	const transporter = createTransporter();

	await transporter.sendMail({
		from: config.mailFrom,
		to: toEmail,
		subject: 'Reset your password',
		text: 'Use this link to reset your password: ' + resetLink,
		html: '<p>Use this link to reset your password:</p><p><a href="' + resetLink + '">' + resetLink + '</a></p>'
	});
}

module.exports = {
	sendResetPasswordEmail
};

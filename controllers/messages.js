const mongoose = require('mongoose');
const { SupportConversation, SupportMessage } = require('../schemas/messages');

function isAdminUser(req) {
	const roleName = req.user && req.user.role && req.user.role.name ? String(req.user.role.name).toUpperCase() : '';
	return roleName === 'ADMIN' || roleName === 'MODERATOR';
}

function normalizePaging(query) {
	const limit = Math.min(parseInt(query.limit || '20', 10), 100);
	const page = Math.max(parseInt(query.page || '1', 10), 1);
	return { limit, page, skip: (page - 1) * limit };
}

async function getConversationById(id) {
	if (!mongoose.Types.ObjectId.isValid(id)) {
		return null;
	}
	return SupportConversation.findOne({ _id: id, isDeleted: false });
}

function ensureConversationAccess(req, conversation) {
	if (!conversation) {
		return { ok: false, status: 404, message: 'Conversation not found', errorCode: 'NOT_FOUND' };
	}

	if (isAdminUser(req)) {
		return { ok: true };
	}

	if (String(conversation.customerId) !== String(req.userId)) {
		return { ok: false, status: 403, message: 'Forbidden', errorCode: 'FORBIDDEN' };
	}

	return { ok: true };
}

async function createConversation(req, res, next) {
	try {
		if (isAdminUser(req)) {
			return res.status(403).json({
				success: false,
				message: 'Admins cannot create customer ticket',
				errorCode: 'FORBIDDEN'
			});
		}

		const conversation = await SupportConversation.create({
			customerId: req.userId,
			subject: req.body.subject,
			priority: req.body.priority || 'normal',
			status: 'open',
			lastMessage: req.body.content,
			lastMessageAt: new Date(),
			unreadCountForCustomer: 0,
			unreadCountForAdmin: 1
		});

		const firstMessage = await SupportMessage.create({
			conversationId: conversation._id,
			senderId: req.userId,
			senderRole: 'customer',
			content: req.body.content,
			readByCustomerAt: new Date(),
			readByAdminAt: null
		});

		return res.status(201).json({
			success: true,
			message: 'Conversation created',
			data: {
				conversation,
				firstMessage
			}
		});
	} catch (error) {
		return next(error);
	}
}

async function getMyConversations(req, res, next) {
	try {
		if (isAdminUser(req)) {
			return res.status(403).json({
				success: false,
				message: 'Admins must use admin queue endpoint',
				errorCode: 'FORBIDDEN'
			});
		}

		const paging = normalizePaging(req.query);
		const filter = { customerId: req.userId, isDeleted: false };
		if (req.query.status) {
			filter.status = req.query.status;
		}

		const items = await SupportConversation.find(filter)
			.sort({ lastMessageAt: -1 })
			.skip(paging.skip)
			.limit(paging.limit)
			.populate('assignedAdminId', 'username email fullName avatarUrl');

		const total = await SupportConversation.countDocuments(filter);

		return res.json({
			success: true,
			data: {
				items,
				pagination: {
					page: paging.page,
					limit: paging.limit,
					total
				}
			}
		});
	} catch (error) {
		return next(error);
	}
}

async function getAdminConversations(req, res, next) {
	try {
		if (!isAdminUser(req)) {
			return res.status(403).json({ success: false, message: 'Forbidden', errorCode: 'FORBIDDEN' });
		}

		const paging = normalizePaging(req.query);
		const filter = { isDeleted: false };

		if (req.query.status) {
			filter.status = req.query.status;
		}

		if (req.query.assigned === 'true') {
			filter.assignedAdminId = { $ne: null };
		} else if (req.query.assigned === 'false') {
			filter.assignedAdminId = null;
		} else if (req.query.assigned === 'mine') {
			filter.assignedAdminId = req.userId;
		}

		const items = await SupportConversation.find(filter)
			.sort({ priority: -1, lastMessageAt: -1 })
			.skip(paging.skip)
			.limit(paging.limit)
			.populate('customerId', 'username email fullName avatarUrl')
			.populate('assignedAdminId', 'username email fullName avatarUrl');

		const total = await SupportConversation.countDocuments(filter);

		return res.json({
			success: true,
			data: {
				items,
				pagination: {
					page: paging.page,
					limit: paging.limit,
					total
				}
			}
		});
	} catch (error) {
		return next(error);
	}
}

async function getConversationMessages(req, res, next) {
	try {
		const conversation = await getConversationById(req.params.id);
		const access = ensureConversationAccess(req, conversation);
		if (!access.ok) {
			return res.status(access.status).json({ success: false, message: access.message, errorCode: access.errorCode });
		}

		const paging = normalizePaging(req.query);
		const items = await SupportMessage.find({ conversationId: conversation._id, isDeleted: false })
			.sort({ createdAt: -1 })
			.skip(paging.skip)
			.limit(paging.limit)
			.populate('senderId', 'username email fullName avatarUrl');

		const total = await SupportMessage.countDocuments({ conversationId: conversation._id, isDeleted: false });

		return res.json({
			success: true,
			data: {
				conversation,
				items,
				pagination: {
					page: paging.page,
					limit: paging.limit,
					total
				}
			}
		});
	} catch (error) {
		return next(error);
	}
}

async function sendCustomerMessage(req, res, next) {
	try {
		if (isAdminUser(req)) {
			return res.status(403).json({ success: false, message: 'Admins must use admin reply endpoint', errorCode: 'FORBIDDEN' });
		}

		const conversation = await getConversationById(req.params.id);
		const access = ensureConversationAccess(req, conversation);
		if (!access.ok) {
			return res.status(access.status).json({ success: false, message: access.message, errorCode: access.errorCode });
		}

		if (conversation.status === 'closed') {
			return res.status(400).json({ success: false, message: 'Conversation is closed', errorCode: 'INVALID_STATE' });
		}

		const message = await SupportMessage.create({
			conversationId: conversation._id,
			senderId: req.userId,
			senderRole: 'customer',
			content: req.body.content,
			readByCustomerAt: new Date(),
			readByAdminAt: null
		});

		conversation.lastMessage = req.body.content;
		conversation.lastMessageAt = new Date();
		conversation.unreadCountForAdmin += 1;
		if (conversation.status === 'resolved') {
			conversation.status = 'pending';
		}
		await conversation.save();

		return res.status(201).json({ success: true, message: 'Message sent', data: message });
	} catch (error) {
		return next(error);
	}
}

async function assignConversation(req, res, next) {
	try {
		if (!isAdminUser(req)) {
			return res.status(403).json({ success: false, message: 'Forbidden', errorCode: 'FORBIDDEN' });
		}

		const conversation = await getConversationById(req.params.id);
		if (!conversation) {
			return res.status(404).json({ success: false, message: 'Conversation not found', errorCode: 'NOT_FOUND' });
		}

		if (conversation.assignedAdminId && String(conversation.assignedAdminId) !== String(req.userId)) {
			return res.status(409).json({ success: false, message: 'Conversation already assigned to another admin', errorCode: 'ASSIGN_CONFLICT' });
		}

		conversation.assignedAdminId = req.userId;
		if (conversation.status === 'open') {
			conversation.status = 'pending';
		}
		await conversation.save();

		return res.json({ success: true, message: 'Conversation assigned', data: conversation });
	} catch (error) {
		return next(error);
	}
}

async function sendAdminMessage(req, res, next) {
	try {
		if (!isAdminUser(req)) {
			return res.status(403).json({ success: false, message: 'Forbidden', errorCode: 'FORBIDDEN' });
		}

		const conversation = await getConversationById(req.params.id);
		if (!conversation) {
			return res.status(404).json({ success: false, message: 'Conversation not found', errorCode: 'NOT_FOUND' });
		}

		if (conversation.status === 'closed') {
			return res.status(400).json({ success: false, message: 'Conversation is closed', errorCode: 'INVALID_STATE' });
		}

		if (!conversation.assignedAdminId) {
			conversation.assignedAdminId = req.userId;
		}

		const message = await SupportMessage.create({
			conversationId: conversation._id,
			senderId: req.userId,
			senderRole: 'admin',
			content: req.body.content,
			readByCustomerAt: null,
			readByAdminAt: new Date()
		});

		conversation.lastMessage = req.body.content;
		conversation.lastMessageAt = new Date();
		conversation.unreadCountForCustomer += 1;
		if (conversation.status === 'open') {
			conversation.status = 'pending';
		}
		await conversation.save();

		return res.status(201).json({ success: true, message: 'Reply sent', data: message });
	} catch (error) {
		return next(error);
	}
}

async function updateConversationStatus(req, res, next) {
	try {
		if (!isAdminUser(req)) {
			return res.status(403).json({ success: false, message: 'Forbidden', errorCode: 'FORBIDDEN' });
		}

		const conversation = await getConversationById(req.params.id);
		if (!conversation) {
			return res.status(404).json({ success: false, message: 'Conversation not found', errorCode: 'NOT_FOUND' });
		}

		conversation.status = req.body.status;
		if (!conversation.assignedAdminId) {
			conversation.assignedAdminId = req.userId;
		}
		await conversation.save();

		return res.json({ success: true, message: 'Conversation status updated', data: conversation });
	} catch (error) {
		return next(error);
	}
}

async function markConversationRead(req, res, next) {
	try {
		const conversation = await getConversationById(req.params.id);
		const access = ensureConversationAccess(req, conversation);
		if (!access.ok) {
			return res.status(access.status).json({ success: false, message: access.message, errorCode: access.errorCode });
		}

		const now = new Date();
		if (isAdminUser(req)) {
			await SupportMessage.updateMany(
				{ conversationId: conversation._id, senderRole: 'customer', readByAdminAt: null, isDeleted: false },
				{ $set: { readByAdminAt: now } }
			);
			conversation.unreadCountForAdmin = 0;
		} else {
			await SupportMessage.updateMany(
				{ conversationId: conversation._id, senderRole: 'admin', readByCustomerAt: null, isDeleted: false },
				{ $set: { readByCustomerAt: now } }
			);
			conversation.unreadCountForCustomer = 0;
		}

		await conversation.save();
		return res.json({ success: true, message: 'Conversation marked as read' });
	} catch (error) {
		return next(error);
	}
}

module.exports = {
	createConversation,
	getMyConversations,
	getAdminConversations,
	getConversationMessages,
	sendCustomerMessage,
	assignConversation,
	sendAdminMessage,
	updateConversationStatus,
	markConversationRead
};

var express = require('express');
var router = express.Router();

const { checkLogin, checkRole } = require('../utils/authHandler');
const validatorHandler = require('../utils/validatorHandler');
const supportChatValidator = require('../utils/supportChatValidator');
const messageController = require('../controllers/messages');

router.use(checkLogin);

router.post(
	'/conversations',
	supportChatValidator.createConversationValidator,
	validatorHandler.validateResult,
	messageController.createConversation
);

router.get(
	'/my-conversations',
	supportChatValidator.conversationListValidator,
	validatorHandler.validateResult,
	messageController.getMyConversations
);

router.get(
	'/conversations/:id/messages',
	supportChatValidator.conversationIdValidator,
	supportChatValidator.conversationListValidator,
	validatorHandler.validateResult,
	messageController.getConversationMessages
);

router.post(
	'/conversations/:id/messages',
	supportChatValidator.conversationIdValidator,
	supportChatValidator.messageContentValidator,
	validatorHandler.validateResult,
	messageController.sendCustomerMessage
);

router.post(
	'/conversations/:id/read',
	supportChatValidator.conversationIdValidator,
	validatorHandler.validateResult,
	messageController.markConversationRead
);

router.get(
	'/admin/conversations',
	checkRole('ADMIN', 'MODERATOR'),
	supportChatValidator.conversationListValidator,
	validatorHandler.validateResult,
	messageController.getAdminConversations
);

router.post(
	'/admin/conversations/:id/assign',
	checkRole('ADMIN', 'MODERATOR'),
	supportChatValidator.conversationIdValidator,
	validatorHandler.validateResult,
	messageController.assignConversation
);

router.post(
	'/admin/conversations/:id/messages',
	checkRole('ADMIN', 'MODERATOR'),
	supportChatValidator.conversationIdValidator,
	supportChatValidator.messageContentValidator,
	validatorHandler.validateResult,
	messageController.sendAdminMessage
);

router.patch(
	'/admin/conversations/:id/status',
	checkRole('ADMIN', 'MODERATOR'),
	supportChatValidator.conversationIdValidator,
	supportChatValidator.updateStatusValidator,
	validatorHandler.validateResult,
	messageController.updateConversationStatus
);

module.exports = router;

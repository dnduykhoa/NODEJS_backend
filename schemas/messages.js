const mongoose = require('mongoose');

const supportConversationSchema = new mongoose.Schema(
	{
		customerId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'user',
			required: true
		},
		assignedAdminId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'user',
			default: null
		},
		status: {
			type: String,
			enum: ['open', 'pending', 'resolved', 'closed'],
			default: 'open'
		},
		priority: {
			type: String,
			enum: ['low', 'normal', 'high', 'urgent'],
			default: 'normal'
		},
		subject: {
			type: String,
			required: true,
			trim: true,
			maxlength: 200
		},
		lastMessage: {
			type: String,
			default: ''
		},
		lastMessageAt: {
			type: Date,
			default: Date.now
		},
		unreadCountForCustomer: {
			type: Number,
			default: 0,
			min: 0
		},
		unreadCountForAdmin: {
			type: Number,
			default: 0,
			min: 0
		},
		isDeleted: {
			type: Boolean,
			default: false
		}
	},
	{
		timestamps: true
	}
);

supportConversationSchema.index({ customerId: 1, status: 1 });
supportConversationSchema.index({ assignedAdminId: 1, status: 1, lastMessageAt: -1 });
supportConversationSchema.index({ status: 1, priority: 1, lastMessageAt: -1 });

const supportMessageSchema = new mongoose.Schema(
	{
		conversationId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'supportConversation',
			required: true
		},
		senderId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'user',
			required: true
		},
		senderRole: {
			type: String,
			enum: ['customer', 'admin'],
			required: true
		},
		content: {
			type: String,
			required: true,
			trim: true,
			maxlength: 2000
		},
		messageType: {
			type: String,
			enum: ['text', 'system'],
			default: 'text'
		},
		readByCustomerAt: {
			type: Date,
			default: null
		},
		readByAdminAt: {
			type: Date,
			default: null
		},
		isDeleted: {
			type: Boolean,
			default: false
		}
	},
	{
		timestamps: true
	}
);

supportMessageSchema.index({ conversationId: 1, createdAt: -1 });
supportMessageSchema.index({ senderId: 1, createdAt: -1 });

const SupportConversation = mongoose.models.supportConversation || mongoose.model('supportConversation', supportConversationSchema);
const SupportMessage = mongoose.models.supportMessage || mongoose.model('supportMessage', supportMessageSchema);

module.exports = {
	SupportConversation,
	SupportMessage
};

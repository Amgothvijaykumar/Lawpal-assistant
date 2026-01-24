const mongoose = require('mongoose');

const chatSessionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    lawyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lawyer' }, // For consultation chats
    title: { type: String, default: 'New Chat' },
    type: { type: String, enum: ['ai', 'lawyer'], default: 'ai' },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Comprehensive list
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ChatSession', chatSessionSchema);

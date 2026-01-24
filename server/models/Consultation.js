const mongoose = require('mongoose');

const consultationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    lawyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lawyer', required: true },
    query: { type: String }, // Legacy field, keeping for compatibility
    initialMessage: { type: String },
    priority: { type: String, enum: ['normal', 'urgent', 'high'], default: 'normal' },
    status: { type: String, enum: ['pending', 'accepted', 'completed', 'rejected'], default: 'pending' },
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatSession' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Consultation', consultationSchema);

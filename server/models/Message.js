const mongoose = require('mongoose');

// Highlight sub-schema for text annotations
const highlightSchema = new mongoose.Schema({
    highlightId: { type: String, required: true },
    start: { type: Number, required: true },
    end: { type: Number, required: true },
    color: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
}, { _id: false });

const messageSchema = new mongoose.Schema({
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatSession' }, // Optional, as it might be a consultation msg
    consultationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Consultation' }, // Optional
    role: { type: String, enum: ['user', 'assistant', 'system', 'lawyer'], required: true },
    content: { type: String, required: true },
    highlights: { type: [highlightSchema], default: [] },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', messageSchema);

const mongoose = require('mongoose');

const lawyerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    specialization: { type: String, required: true },
    rating: { type: Number, default: 0 },
    reviews: { type: Number, default: 0 },
    distance: { type: String },
    available: { type: Boolean, default: true },
    experience: { type: Number },
    avatar: { type: String },
    bio: { type: String },
    expertise: [{ type: String }],
    hourlyRate: { type: Number }
});

module.exports = mongoose.model('Lawyer', lawyerSchema);

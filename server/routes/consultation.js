const express = require('express');
const router = express.Router();
const Consultation = require('../models/Consultation');
const Lawyer = require('../models/Lawyer');
const ChatSession = require('../models/ChatSession');
const mongoose = require('mongoose');
const { validateObjectId } = require('../middleware/validator');

module.exports = (authenticateToken, checkDatabaseConnection, io) => {

    // Request Consultation
    router.post('/', authenticateToken, checkDatabaseConnection, async (req, res) => {
        try {
            const { lawyerId, initialMessage, priority = 'normal' } = req.body;
            if (!lawyerId) return res.status(400).json({ error: 'Lawyer ID required' });

            let lawyer = await Lawyer.findById(lawyerId);
            if (!lawyer) lawyer = await Lawyer.findOne({ userId: lawyerId });
            if (!lawyer) return res.status(404).json({ error: 'Lawyer not found' });

            const consultation = new Consultation({
                userId: req.user.id,
                lawyerId: lawyer._id,
                initialMessage,
                priority,
                status: 'pending'
            });

            await consultation.save();

            const populated = await Consultation.findById(consultation._id)
                .populate('userId', 'displayName email avatarUrl');

            io.to(lawyer.userId.toString()).emit('consultation:new_request', populated);
            res.status(201).json(consultation);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // Get User's Consultations
    router.get('/user', authenticateToken, checkDatabaseConnection, async (req, res) => {
        try {
            const list = await Consultation.find({ userId: req.user.id }).populate('lawyerId').sort({ createdAt: -1 });
            res.json(list);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // Accept
    router.patch('/:id/accept', authenticateToken, checkDatabaseConnection, validateObjectId(['id']), async (req, res) => {
        try {
            if (req.user.role !== 'lawyer') return res.status(403).json({ error: 'Unauthorized' });

            const consultation = await Consultation.findById(req.params.id);
            if (!consultation || consultation.status !== 'pending') {
                return res.status(400).json({ error: 'Invalid consultation request' });
            }

            const lawyer = await Lawyer.findOne({ userId: req.user.id });
            if (!lawyer || consultation.lawyerId.toString() !== lawyer._id.toString()) {
                return res.status(403).json({ error: 'Unauthorized' });
            }

            consultation.status = 'accepted';
            const session = new ChatSession({
                userId: consultation.userId,
                lawyerId: lawyer._id,
                title: `Consultation with ${lawyer.fullName}`,
                type: 'lawyer',
                participants: [consultation.userId, req.user.id]
            });

            await session.save();
            consultation.sessionId = session._id;
            await consultation.save();

            io.to(consultation.userId.toString()).emit('consultation:accepted', {
                requestId: consultation._id,
                sessionId: session._id,
                title: session.title,
                lawyerName: lawyer.fullName
            });

            res.json({ message: 'Accepted', sessionId: session._id });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    return router;
};

const express = require('express');
const router = express.Router();
const Document = require('../models/Document');
const { validateObjectId } = require('../middleware/validator');

module.exports = (authenticateToken, checkDatabaseConnection) => {

    // Get All
    router.get('/', authenticateToken, checkDatabaseConnection, async (req, res) => {
        try {
            const docs = await Document.find({ userId: req.user.id }).sort({ uploadedAt: -1 });
            res.json(docs);
        } catch (err) {
            res.status(500).json({ error: 'Failed to fetch documents' });
        }
    });

    // Create
    router.post('/', authenticateToken, checkDatabaseConnection, async (req, res) => {
        try {
            const doc = new Document({ ...req.body, userId: req.user.id });
            await doc.save();
            res.status(201).json(doc);
        } catch (err) {
            res.status(500).json({ error: 'Failed to save document' });
        }
    });

    // Delete
    router.delete('/:id', authenticateToken, checkDatabaseConnection, validateObjectId(['id']), async (req, res) => {
        try {
            const doc = await Document.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
            if (!doc) return res.status(404).json({ error: 'Document not found' });
            res.json({ message: 'Deleted' });
        } catch (err) {
            res.status(500).json({ error: 'Delete failed' });
        }
    });

    return router;
};

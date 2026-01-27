const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const ChatSession = require('../models/ChatSession');
const Message = require('../models/Message');
const axios = require('axios');
const { validateObjectId } = require('../middleware/validator');

// Assuming authenticateToken and checkDatabaseConnection are passed as middleware
module.exports = (authenticateToken, checkDatabaseConnection, io, groqAxios) => {

    // Get Sessions
    router.get('/sessions', authenticateToken, checkDatabaseConnection, async (req, res) => {
        try {
            const sessions = await ChatSession.find({
                $or: [
                    { userId: req.user.id },
                    { participants: req.user.id }
                ]
            }).sort({ updatedAt: -1 });
            res.json(sessions);
        } catch (err) {
            console.error('❌ Error fetching sessions:', err);
            res.status(500).json({ error: 'Internal server error while fetching sessions.' });
        }
    });

    // Create Session
    router.post('/sessions', authenticateToken, checkDatabaseConnection, async (req, res) => {
        try {
            const { title, type } = req.body;
            const userId = req.user.id;

            if (!mongoose.Types.ObjectId.isValid(userId)) {
                return res.status(400).json({ error: 'Invalid user ID format' });
            }

            // Deduplication (2s)
            const existingSession = await ChatSession.findOne({
                userId,
                title: title || 'New Chat',
                createdAt: { $gt: new Date(Date.now() - 2000) }
            });

            if (existingSession) return res.status(200).json(existingSession);

            const session = new ChatSession({
                userId: new mongoose.Types.ObjectId(userId),
                title: title || 'New Chat',
                type: type || 'ai'
            });

            await session.save();
            res.status(201).json(session);
        } catch (err) {
            console.error('❌ Error creating session:', err);
            res.status(500).json({ error: err.message || 'Failed to create session' });
        }
    });

    // Rename Session
    router.patch('/sessions/:id', authenticateToken, checkDatabaseConnection, validateObjectId(['id']), async (req, res) => {
        try {
            if (!req.body.title || req.body.title.trim() === '') {
                return res.status(400).json({ error: 'Title is required' });
            }
            const session = await ChatSession.findOneAndUpdate(
                { _id: req.params.id, userId: req.user.id },
                { title: req.body.title.trim() },
                { new: true }
            );
            if (!session) return res.status(404).json({ error: 'Session not found' });
            res.json(session);
        } catch (err) {
            res.status(500).json({ error: 'Rename failed' });
        }
    });

    // Delete Session
    router.delete('/sessions/:id', authenticateToken, checkDatabaseConnection, validateObjectId(['id']), async (req, res) => {
        try {
            const session = await ChatSession.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
            if (!session) return res.status(404).json({ error: 'Session not found' });
            await Message.deleteMany({ sessionId: req.params.id });
            res.json({ message: 'Deleted' });
        } catch (err) {
            res.status(500).json({ error: 'Delete failed' });
        }
    });

    // Get Messages
    router.get('/sessions/:sessionId/messages',
        authenticateToken,
        checkDatabaseConnection,
        validateObjectId(['sessionId']),
        async (req, res) => {
            try {
                const session = await ChatSession.findOne({
                    _id: req.params.sessionId,
                    $or: [
                        { userId: req.user.id },
                        { participants: req.user.id }
                    ]
                });

                if (!session) return res.status(404).json({ error: 'Session not found or access denied.' });

                const messages = await Message.find({ sessionId: req.params.sessionId }).sort({ createdAt: 1 });
                res.json(messages);
            } catch (err) {
                console.error('❌ Error fetching messages:', err);
                res.status(500).json({ error: 'Internal server error while fetching messages.' });
            }
        }
    );

    // Save Message
    router.post('/messages', authenticateToken, checkDatabaseConnection, async (req, res) => {
        try {
            const { sessionId, role, content } = req.body;

            if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) {
                return res.status(400).json({ error: 'Valid Session ID is required' });
            }

            const session = await ChatSession.findOne({
                _id: sessionId,
                $or: [{ userId: req.user.id }, { participants: req.user.id }]
            });

            if (!session) return res.status(404).json({ error: 'Session not found or access denied' });

            const message = new Message({ sessionId, role, contentValue: content.trim(), content: content.trim() });
            await message.save();

            session.updatedAt = Date.now();
            await session.save();

            io.to(sessionId.toString()).emit('chat:message_new', {
                id: message._id.toString(),
                role: message.role,
                content: message.content,
                sessionId: message.sessionId.toString(),
                createdAt: message.createdAt
            });

            res.status(201).json(message);
        } catch (err) {
            console.error('❌ Error saving message:', err);
            res.status(500).json({ error: 'Failed to save message' });
        }
    });

    // Add Highlight
    router.post('/messages/:id/highlights', authenticateToken, checkDatabaseConnection, validateObjectId(['id']), async (req, res) => {
        try {
            const { start, end, color } = req.body;
            const message = await Message.findById(req.params.id);
            if (!message) return res.status(404).json({ error: 'Message not found' });

            const highlightId = `hl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const newHighlight = { highlightId, start, end, color, createdAt: new Date() };

            message.highlights.push(newHighlight);
            await message.save();
            res.status(201).json({ message, highlight: newHighlight });
        } catch (err) {
            res.status(500).json({ error: 'Highlight failed' });
        }
    });

    // AI Chat (Streaming)
    router.post('/', authenticateToken, checkDatabaseConnection, async (req, res) => {
        const startTime = Date.now();
        try {
            const { message, sessionId } = req.body;
            if (!message || !sessionId) return res.status(400).json({ error: 'Message and Session ID are required' });

            const session = await ChatSession.findOne({ _id: sessionId, userId: req.user.id });
            if (!session) return res.status(404).json({ error: 'Session not found' });

            // Deduplication
            const duplicate = await Message.findOne({
                sessionId,
                role: 'user',
                content: message.trim(),
                createdAt: { $gt: new Date(Date.now() - 2000) }
            });
            if (duplicate) return res.status(429).json({ error: 'Duplicate message detected' });

            const userMessage = new Message({ sessionId, role: 'user', content: message.trim() });
            await userMessage.save();

            // Setup SSE
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.flushHeaders();

            res.write(`data: ${JSON.stringify({ type: 'thinking', done: false })}\n\n`);

            let fullResponse = "";

            // 1. Try Local Flask Backend (RAG)
            const FLASK_URL = process.env.FLASK_BACKEND_URL;
            let usedFallback = false;

            if (FLASK_URL) {
                try {
                    const payload = { query: message.trim() };
                    console.log(`----------------------------------------------------------------`);
                    console.log(`🤖 SENDING TO FLASK MODEL (${FLASK_URL}/ask)`);
                    console.log(`📦 Payload:`, JSON.stringify(payload, null, 2));
                    console.log(`----------------------------------------------------------------`);

                    const flaskResponse = await axios.post(`${FLASK_URL}/ask`, payload, { timeout: 5000 });

                    console.log(`----------------------------------------------------------------`);
                    console.log(`✅ RECEIVED FROM FLASK MODEL`);
                    console.log(`📦 Response Data:`, JSON.stringify(flaskResponse.data, null, 2));
                    console.log(`----------------------------------------------------------------`);

                    fullResponse = flaskResponse.data.answer || "No response.";
                    fullResponse = fullResponse.replace(/Note: Some cited items may be unrelated[\s\S]*?ignored\./gi, '').trim();
                } catch (flaskErr) {
                    console.error('⚠️ Local AI Unreachable:', flaskErr.message);
                    console.log(`❌ Failed Payload was:`, JSON.stringify({ query: message.trim() }));
                    usedFallback = true;
                }
            } else {
                usedFallback = true;
            }

            // 2. Fallback to Groq (Cloud LLM)
            if (usedFallback) {
                console.log('☁️ Switching to Groq Cloud Fallback...');
                const groqKey = process.env.GROQ_API_KEY;
                if (!groqKey) console.warn("⚠️ Warning: GROQ_API_KEY is missing in .env");

                try {
                    const groqResponse = await groqAxios.post('/chat/completions', {
                        model: process.env.GROQ_MODEL_NAME || 'llama-3.3-70b-versatile',
                        messages: [
                            { role: "system", content: "You are a helpful Indian legal assistant named LawPal. Provide accurate, helpful legal information based on Indian law. Keep answers concise." },
                            { role: "user", content: message.trim() }
                        ],
                        temperature: 0.7
                    }, {
                        headers: {
                            'Authorization': `Bearer ${groqKey}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    console.log('✅ Groq Fallback Response Received');
                    fullResponse = groqResponse.data.choices[0]?.message?.content || "I apologize, but I couldn't generate a response at this time.";
                } catch (groqErr) {
                    console.error('❌ Groq Fallback Failed:', groqErr.response?.data || groqErr.message);
                    res.write(`data: ${JSON.stringify({ done: true, error: 'AI service unavailable. Please check backend connections.' })}\n\n`);
                    return res.end();
                }
            }

            res.write(`data: ${JSON.stringify({ content: fullResponse, done: false })}\n\n`);

            // Save Assistant Message
            const assistantMessage = new Message({ sessionId, role: 'assistant', content: fullResponse });
            await assistantMessage.save();
            await ChatSession.updateOne({ _id: sessionId }, { updatedAt: Date.now() });

            res.write(`data: ${JSON.stringify({ done: true, messages: await Message.find({ sessionId }).sort({ createdAt: 1 }) })}\n\n`);
            res.end();

        } catch (err) {
            console.error('❌ Chat Error:', err);
            if (!res.headersSent) res.status(500).json({ error: 'AI processing failed' });
            else {
                res.write(`data: ${JSON.stringify({ done: true, error: 'AI processing failed' })}\n\n`);
                res.end();
            }
        }
    });

    // Suggestions
    router.get('/suggestions', authenticateToken, checkDatabaseConnection, async (req, res) => {
        try {
            const { sessionId } = req.query;
            if (!sessionId) return res.status(400).json({ error: 'Session ID required' });

            const lastUserMessage = await Message.findOne({ sessionId, role: 'user' }).sort({ createdAt: -1 });

            const defaultSuggestions = [
                "⚖️ How do I start a legal proceeding in India?",
                "📜 What are my basic fundamental rights?",
                "🏙️ I need help with a property dispute",
                "👔 My employer is not paying my dues",
                "🚗 I met with a road accident, what now?",
                "💍 Guidance on marriage registration/laws"
            ];

            if (!lastUserMessage) return res.json(defaultSuggestions);

            // Simple keyword-based dynamic suggestions
            const content = lastUserMessage.content.toLowerCase();
            let suggestions = [];
            if (content.includes('property')) suggestions.push("🏡 Checklist for buying an under-construction flat");
            if (content.includes('divorce') || content.includes('marriage')) suggestions.push("👨‍👩‍👧‍👦 How to ensure child visitation rights?");
            if (content.includes('salary') || content.includes('job')) suggestions.push("👔 Legal shield against wrongful termination");

            // Fill with defaults if not enough
            const combined = [...suggestions, ...defaultSuggestions];
            res.json([...new Set(combined)].slice(0, 6));
        } catch (err) {
            res.status(500).json({ error: 'Failed' });
        }
    });

    return router;
};

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const axios = require('axios');

// Create optimized axios instance for GROQ API
const groqAxios = axios.create({
    baseURL: 'https://api.groq.com/openai/v1',
    timeout: 60000,
    httpAgent: new (require('http').Agent)({ keepAlive: true, keepAliveMsecs: 1000 }),
    httpsAgent: new (require('https').Agent)({ keepAlive: true, keepAliveMsecs: 1000 }),
    headers: {
        'Content-Type': 'application/json',
    }
});

if (!process.env.JWT_SECRET) {
    console.error('❌ FATAL ERROR: JWT_SECRET is not defined in .env file');
    process.exit(1);
}

// Validate MongoDB URI
if (!process.env.MONGODB_URI) {
    console.error('❌ FATAL ERROR: MONGODB_URI is not defined in .env file');
    process.exit(1);
}

const User = require('./models/User');
const ChatSession = require('./models/ChatSession');
const Message = require('./models/Message');
const Document = require('./models/Document');
const Lawyer = require('./models/Lawyer');
const Consultation = require('./models/Consultation');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors({
    origin: '*', // Allow all origins in development
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));

// Validate GROQ API Key
if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY.includes('your-groq-api-key')) {
    console.warn('⚠️ WARNING: GROQ_API_KEY is not configured in .env file');
    console.warn('   AI features will not work until a valid key is added.');
    console.warn('   Get your API key from: https://console.groq.com/keys');
    // process.exit(1); // Don't exit, allow server to run for other features
}

// Log API configuration on startup
console.log('-------------------------------------------');
console.log('📋 API SERVER CONFIGURATION');
console.log('-------------------------------------------');
console.log(`   Port:             ${process.env.PORT || 3007}`);
console.log(`   LLM Provider:     GROQ API (Direct)`);
console.log(`   Model Name:       ${process.env.GROQ_MODEL_NAME || 'llama-3.3-70b-versatile'}`);
if (process.env.GROQ_API_KEY) {
    const key = process.env.GROQ_API_KEY;
    console.log(`   GROQ API Key:     ✅ Present (${key.substr(0, 8)}...${key.substr(-4)})`);
} else {
    console.log(`   GROQ API Key:     ❌ MISSING`);
}
console.log(`   Flask Backend:    ${process.env.FLASK_BACKEND_URL || 'Not configured'}`);
console.log(`   Database URI:     ${process.env.MONGODB_URI ? '✅ Configured' : '❌ MISSING'}`);
console.log('-------------------------------------------');

// MongoDB Connection Status Logging
mongoose.connection.on('connected', () => console.log('🟢 Mongoose connected to DB'));
mongoose.connection.on('error', (err) => console.error('🔴 Mongoose connection error:', err));
mongoose.connection.on('disconnected', () => console.log('🟡 Mongoose disconnected'));

console.log('🔌 Connecting to MongoDB...');
mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 30000, // Increased to 30 seconds
    socketTimeoutMS: 45000,
    connectTimeoutMS: 30000,
    retryWrites: true,
    w: 'majority'
})
    .then(() => {
        const conn = mongoose.connection;
        console.log('-------------------------------------------');
        console.log('✅ DATABASE CONNECTED SUCCESSFULLY');
        console.log(`🌐 Host: ${conn.host}`);
        console.log(`📂 DB Name: ${conn.name}`);
        console.log('-------------------------------------------');
    })
    .catch(err => {
        console.error('-------------------------------------------');
        console.error('❌ MONGODB CONNECTION ERROR:');
        console.error(err.message);
        console.error('🔍 TIP: Check your Internet and Atlas IP Whitelist');
        console.error('🔍 TIP: Ensure MongoDB Atlas allows connections from your IP (0.0.0.0/0 for testing)');
        console.log('-------------------------------------------');
        // Don't exit - allow server to run and retry connections
    });

// Auth Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Access denied' });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            console.error('❌ JWT verification failed:', err.message);
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        // Ensure user.id is available
        if (!req.user.id) {
            console.error('❌ JWT token missing user ID');
            return res.status(403).json({ error: 'Invalid token format' });
        }
        next();
    });
};

// Database Connection Check Helper
const checkDatabaseConnection = (req, res, next) => {
    if (mongoose.connection.readyState !== 1) {
        console.error('❌ Database not connected. ReadyState:', mongoose.connection.readyState);
        return res.status(503).json({
            error: 'Database connection unavailable. Please try again in a moment.',
            readyState: mongoose.connection.readyState
        });
    }
    next();
};

// --- ROUTES ---

// --- DEBUG & INTEGRATION ---

// Route Debugging - Log all incoming requests
app.use((req, res, next) => {
    console.log(`📥 ${req.method} ${req.path}`);
    next();
});

// Central Health Check (Full Stack Status)
app.get('/api/health', async (req, res) => {
    console.log('--- HEALTH CHECK HIT ---');
    try {
        let aiStatus = 'disconnected';
        try {
            const aiHealth = await axios.get(`${process.env.FLASK_BACKEND_URL}/health`, { timeout: 3000 });
            if (aiHealth.status === 200) aiStatus = 'connected';
        } catch (e) {
            aiStatus = `unavailable (${e.message})`;
        }

        let stats = { status: 'db_not_connected' };
        if (mongoose.connection.readyState === 1) {
            try {
                stats = {
                    users: await User.countDocuments(),
                    sessions: await ChatSession.countDocuments(),
                    lawyers: await Lawyer.countDocuments(),
                    documents: await Document.countDocuments()
                };
            } catch (e) {
                stats = { error: e.message };
            }
        }

        const status = {
            server: 'online',
            port: process.env.PORT || 3005,
            database: mongoose.connection.readyState === 1 ? 'connected' : 'connecting/disconnected',
            ai_backend: aiStatus,
            stats,
            timestamp: new Date().toISOString()
        };
        res.json(status);
    } catch (err) {
        console.error('Fatal Health Check Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Register
app.post('/api/auth/register', async (req, res) => {
    try {
        // Check if database is connected
        if (mongoose.connection.readyState !== 1) {
            console.error('❌ Database not connected. ReadyState:', mongoose.connection.readyState);
            return res.status(503).json({ error: 'Database connection unavailable. Please try again in a moment.' });
        }

        let { email, password, displayName, role } = req.body;
        console.log('📝 Registration attempt for:', email);

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Defensive displayName
        if (!displayName) {
            displayName = email.split('@')[0] || 'User';
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            console.log('⚠️ Registration failed: Email exists:', email);
            return res.status(400).json({ error: 'Email already registered' });
        }

        const user = new User({
            email,
            password,
            displayName,
            role: (role === 'lawyer' || role === 'user') ? role : 'user'
        });

        await user.save();
        console.log('✅ User registered successfully:', email);

        const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET);
        res.status(201).json({
            token,
            user: { id: user._id, email: user.email, displayName: user.displayName, role: user.role }
        });
    } catch (err) {
        console.error('❌ Registration Error:', err);
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(e => e.message);
            return res.status(400).json({ error: `Validation Error: ${messages.join(', ')}` });
        }
        // Handle MongoDB connection errors
        if (err.name === 'MongoServerSelectionError' || err.name === 'MongoNetworkError') {
            return res.status(503).json({ error: 'Database connection error. Please check your internet connection and try again.' });
        }
        res.status(500).json({ error: err.message });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        // Check if database is connected
        if (mongoose.connection.readyState !== 1) {
            console.error('❌ Database not connected. ReadyState:', mongoose.connection.readyState);
            return res.status(503).json({ error: 'Database connection unavailable. Please try again in a moment.' });
        }

        console.log('🔑 Login request received:', req.body.email);
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            console.log('⚠️ Login failed: User not found:', email);
            return res.status(400).json({ error: 'User not found' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            console.log('⚠️ Login failed: Invalid credentials:', email);
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        // Convert ObjectId to string for JWT
        const userIdString = user._id.toString();
        const token = jwt.sign({ id: userIdString, email: user.email }, process.env.JWT_SECRET);
        console.log('✅ Login successful:', email);
        res.json({
            token,
            user: { id: user._id, email: user.email, displayName: user.displayName, role: user.role }
        });
    } catch (err) {
        console.error('❌ Login Error:', err);
        // Handle MongoDB connection errors
        if (err.name === 'MongoServerSelectionError' || err.name === 'MongoNetworkError') {
            return res.status(503).json({ error: 'Database connection error. Please check your internet connection and try again.' });
        }
        res.status(500).json({ error: err.message });
    }
});

// Get Profile
app.get('/api/auth/profile', authenticateToken, checkDatabaseConnection, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (err) {
        console.error('❌ Error fetching profile:', err);
        if (err.name === 'MongoServerSelectionError' || err.name === 'MongoNetworkError') {
            return res.status(503).json({ error: 'Database connection error. Please try again.' });
        }
        res.status(500).json({ error: err.message });
    }
});

// --- CHAT ROUTES ---

// Get Sessions
app.get('/api/chat/sessions', authenticateToken, checkDatabaseConnection, async (req, res) => {
    try {
        const sessions = await ChatSession.find({ userId: req.user.id }).sort({ updatedAt: -1 });
        res.json(sessions);
    } catch (err) {
        console.error('❌ Error fetching sessions:', err);
        if (err.name === 'MongoServerSelectionError' || err.name === 'MongoNetworkError') {
            return res.status(503).json({ error: 'Database connection error. Please try again.' });
        }
        res.status(500).json({ error: err.message });
    }
});

// Create Session
app.post('/api/chat/sessions', authenticateToken, checkDatabaseConnection, async (req, res) => {
    try {
        console.log('📝 Creating session - User ID:', req.user.id, 'Type:', typeof req.user.id);
        console.log('📝 Request body:', JSON.stringify(req.body));

        const { title, type } = req.body;

        // Validate user ID
        if (!req.user || !req.user.id) {
            console.error('❌ Missing user ID in request');
            return res.status(401).json({ error: 'User authentication required' });
        }

        const userId = req.user.id;

        // Validate userId is a valid ObjectId format
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            console.error('❌ Invalid user ID format:', userId, 'Type:', typeof userId);
            return res.status(400).json({ error: 'Invalid user ID format' });
        }

        // Validate input
        if (type && type !== 'ai' && type !== 'lawyer') {
            return res.status(400).json({ error: 'Invalid session type. Must be "ai" or "lawyer"' });
        }

        // Verify user exists (optional but helpful for debugging)
        try {
            const userExists = await User.findById(userId);
            if (!userExists) {
                console.error('❌ User not found in database:', userId);
                return res.status(404).json({ error: 'User not found' });
            }
        } catch (userCheckErr) {
            console.error('❌ Error checking user:', userCheckErr);
            // Continue anyway - might be a transient error
        }

        // DEDUPLICATION: Check if identical session exists from last 2 seconds
        // This prevents double-creation from rapid clicks or strict mode double-invokes
        const existingSession = await ChatSession.findOne({
            userId,
            title: title || 'New Chat',
            createdAt: { $gt: new Date(Date.now() - 2000) }
        });

        if (existingSession) {
            console.log('⚠️ Duplicate session request detected, returning existing:', existingSession._id);
            return res.status(200).json(existingSession);
        }

        console.log('📝 Creating session with:', {
            userId: userId,
            userIdType: typeof userId,
            title: title || 'New Chat',
            type: type || 'ai'
        });

        // Create session - Explicitly convert userId to ObjectId for safety
        const session = new ChatSession({
            userId: new mongoose.Types.ObjectId(userId),
            title: title || 'New Chat',
            type: type || 'ai'
        });

        await session.save();
        console.log('✅ Session created successfully:', session._id);
        res.status(201).json(session);
    } catch (err) {
        console.error('❌ Error creating session - Full error:', err);
        console.error('❌ Error name:', err.name);
        console.error('❌ Error message:', err.message);
        console.error('❌ Error stack:', err.stack);

        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(e => e.message);
            return res.status(400).json({ error: `Validation Error: ${messages.join(', ')}` });
        }
        if (err.name === 'CastError') {
            return res.status(400).json({ error: `Invalid data format: ${err.message}` });
        }
        if (err.name === 'MongoServerSelectionError' || err.name === 'MongoNetworkError') {
            return res.status(503).json({ error: 'Database connection error. Please try again.' });
        }
        res.status(500).json({
            error: err.message || 'Failed to create session',
            details: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});

// Rename Session
app.patch('/api/chat/sessions/:id', authenticateToken, checkDatabaseConnection, async (req, res) => {
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
        console.error('❌ Error renaming session:', err);
        if (err.name === 'MongoServerSelectionError' || err.name === 'MongoNetworkError') {
            return res.status(503).json({ error: 'Database connection error. Please try again.' });
        }
        res.status(500).json({ error: err.message });
    }
});

// Delete Session
app.delete('/api/chat/sessions/:id', authenticateToken, checkDatabaseConnection, async (req, res) => {
    try {
        const session = await ChatSession.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
        if (!session) return res.status(404).json({ error: 'Session not found' });
        // Also delete messages
        await Message.deleteMany({ sessionId: req.params.id });
        console.log('✅ Session deleted:', req.params.id);
        res.json({ message: 'Session deleted' });
    } catch (err) {
        console.error('❌ Error deleting session:', err);
        if (err.name === 'MongoServerSelectionError' || err.name === 'MongoNetworkError') {
            return res.status(503).json({ error: 'Database connection error. Please try again.' });
        }
        res.status(500).json({ error: err.message });
    }
});

// Get Messages
app.get('/api/chat/sessions/:sessionId/messages', authenticateToken, checkDatabaseConnection, async (req, res) => {
    try {
        // Verify session ownership
        const session = await ChatSession.findOne({ _id: req.params.sessionId, userId: req.user.id });
        if (!session) return res.status(404).json({ error: 'Session not found' });

        const messages = await Message.find({ sessionId: req.params.sessionId }).sort({ createdAt: 1 });
        res.json(messages);
    } catch (err) {
        console.error('❌ Error fetching messages:', err);
        if (err.name === 'MongoServerSelectionError' || err.name === 'MongoNetworkError') {
            return res.status(503).json({ error: 'Database connection error. Please try again.' });
        }
        res.status(500).json({ error: err.message });
    }
});

// Update Message (Edit)
app.patch('/api/chat/messages/:id', authenticateToken, checkDatabaseConnection, async (req, res) => {
    try {
        const { content } = req.body;
        if (!content || content.trim() === '') {
            return res.status(400).json({ error: 'Message content is required' });
        }

        // Verify message ownership via session
        const message = await Message.findById(req.params.id);
        if (!message) return res.status(404).json({ error: 'Message not found' });

        const session = await ChatSession.findOne({ _id: message.sessionId, userId: req.user.id });
        if (!session) return res.status(403).json({ error: 'Not authorized to edit this message' });

        if (message.role !== 'user') {
            return res.status(400).json({ error: 'Only user messages can be edited' });
        }

        message.content = content.trim();
        await message.save();

        console.log('✅ Message updated:', message._id);
        res.json(message);
    } catch (err) {
        console.error('❌ Error updating message:', err);
        if (err.name === 'MongoServerSelectionError' || err.name === 'MongoNetworkError') {
            return res.status(503).json({ error: 'Database connection error. Please try again.' });
        }
        res.status(500).json({ error: err.message });
    }
});

// Save Message
app.post('/api/chat/messages', authenticateToken, checkDatabaseConnection, async (req, res) => {
    try {
        const { sessionId, role, content } = req.body;

        // Validate input
        if (!sessionId) return res.status(400).json({ error: 'Session ID is required' });
        if (!role || !['user', 'assistant', 'system'].includes(role)) {
            return res.status(400).json({ error: 'Valid role (user, assistant, system) is required' });
        }
        if (!content || content.trim() === '') {
            return res.status(400).json({ error: 'Message content is required' });
        }

        // Verify session ownership
        const session = await ChatSession.findOne({ _id: sessionId, userId: req.user.id });
        if (!session) return res.status(404).json({ error: 'Session not found' });

        const message = new Message({ sessionId, role, content: content.trim() });
        await message.save();

        // Update session timestamp
        session.updatedAt = Date.now();
        await session.save();

        console.log('✅ Message saved:', message._id);
        res.status(201).json(message);
    } catch (err) {
        console.error('❌ Error saving message:', err);
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(e => e.message);
            return res.status(400).json({ error: `Validation Error: ${messages.join(', ')}` });
        }
        if (err.name === 'MongoServerSelectionError' || err.name === 'MongoNetworkError') {
            return res.status(503).json({ error: 'Database connection error. Please try again.' });
        }
        res.status(500).json({ error: err.message || 'Failed to save message' });
    }
});

// --- CHAT ENDPOINT (Streaming) - OPTIMIZED FOR SPEED ---
app.post('/api/chat', authenticateToken, checkDatabaseConnection, async (req, res) => {
    const startTime = Date.now();
    let tokensReceived = 0;
    let modelName = 'unknown';

    try {
        const { message, sessionId } = req.body;

        if (!message || message.trim() === '') {
            return res.status(400).json({ error: 'Message is required' });
        }

        if (!sessionId) {
            return res.status(400).json({ error: 'Session ID is required' });
        }

        // Verify session ownership
        const session = await ChatSession.findOne({ _id: sessionId, userId: req.user.id }).lean();
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        // OPTIMIZATION: Parallel operations - save user message AND fetch history simultaneously
        const trimmedMessage = message.trim();

        // DEDUPLICATION: Check if identical message exists from last 2 seconds
        const duplicateCheck = await Message.findOne({
            sessionId,
            role: 'user',
            content: trimmedMessage,
            createdAt: { $gt: new Date(Date.now() - 2000) }
        });

        if (duplicateCheck) {
            console.warn('⚠️ Duplicate message detected (debounced):', trimmedMessage);
            return res.status(429).json({ error: 'Duplicate message detected. Please wait.' });
        }

        const userMessage = new Message({
            sessionId,
            role: 'user',
            content: trimmedMessage
        });

        // Start both operations in parallel for faster response
        const [savedUserMsg, recentMessages] = await Promise.all([
            userMessage.save(),
            // Fetch only last 6 messages (reduced from 10 for faster processing)
            Message.find({ sessionId })
                .sort({ createdAt: -1 })
                .limit(6)
                .lean()
                .then(msgs => msgs.reverse()) // Reverse to get chronological order
        ]);

        // Update session timestamp (non-blocking, fire and forget)
        ChatSession.updateOne({ _id: sessionId }, { updatedAt: Date.now() }).catch(err =>
            console.warn('Session update warning:', err.message)
        );

        // Build messages array for GROQ API (optimized)
        const messagesForModel = recentMessages.map(m => ({
            role: m.role,
            content: m.content
        }));

        // Get Flask Backend URL
        const FLASK_URL = process.env.FLASK_BACKEND_URL; // e.g. http://192.168.137.37:7860

        if (!FLASK_URL) {
            console.error('❌ FLASK_BACKEND_URL not configured');
            return res.status(500).json({ error: 'AI Backend URL not configured' });
        }

        // Set up streaming response header for frontend compatibility
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders();

        // Send initial "thinking" signal
        res.write(`data: ${JSON.stringify({ type: 'thinking', done: false })}\n\n`);

        // Call Flask Backend
        try {
            console.log(`🔍 Forwarding to Flask Backend: ${FLASK_URL}/ask`);
            console.log(`📤 Payload:`, { query: trimmedMessage.substring(0, 50) + "..." });

            // Note: Flask backend currently expects { query: "..." } and returns { "answer": "..." } (not streaming)
            const flaskResponse = await axios.post(
                `${FLASK_URL}/ask`,
                { query: trimmedMessage },
                { timeout: 120000 } // Long timeout for RAG
            );

            console.log(`✅ Flask Backend responded with status: ${flaskResponse.status}`);

            let fullResponse = flaskResponse.data.answer || "No response received from AI backend.";

            // SECURITY FILTER: Strip "Note: Some cited items..." if still present
            const guardrailFilter = /Note: Some cited items may be unrelated[\s\S]*?ignored\./gi;
            fullResponse = fullResponse.replace(guardrailFilter, '').trim();

            tokensReceived = fullResponse.length / 4; // Rough estimate
            modelName = "legal-rag-pipeline"; // Flask determines the model

            // Simulate streaming for frontend by sending chunks or just one big chunk
            // For better UX, we can just send it all if it's already here, but frontend expects "content" updates.

            // Send the full content
            res.write(`data: ${JSON.stringify({ content: fullResponse, done: false })}\n\n`);

            // Send completion signal
            res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
            res.end();

            // Save assistant message to DB
            const assistantMessage = new Message({
                sessionId,
                role: 'assistant',
                content: fullResponse
            });

            await assistantMessage.save();
            await ChatSession.updateOne({ _id: sessionId }, { updatedAt: Date.now() });

            // Log metrics
            const latency = Date.now() - startTime;
            console.log(`✅ Chat completed - Session: ${sessionId}, User: ${req.user.id}, Model: ${modelName}, Latency: ${latency}ms`);

        } catch (flaskErr) {
            console.error('❌ Flask Backend Error:', flaskErr.message);
            const latency = Date.now() - startTime;
            console.log(`❌ Chat failed - Session: ${sessionId}, Latency: ${latency}ms, Error: ${flaskErr.message}`);

            let errorMessage = '❌ AI Service unavailable. Please try again.';

            if (flaskErr.code === 'ECONNREFUSED' || flaskErr.code === 'ENOTFOUND') {
                errorMessage = '⚠️ Cannot connect to AI Backend. Ensure Flask app is running.';
            } else if (flaskErr.code === 'ETIMEDOUT') {
                errorMessage = '⚠️ AI Backend timed out (RAG took too long).';
            }

            res.write(`data: ${JSON.stringify({ done: true, error: errorMessage })}\n\n`);
            res.end();
        }

    } catch (err) {
        console.error('❌ Chat endpoint error:', err);
        const latency = Date.now() - startTime;
        console.log(`❌ Chat error - User: ${req.user?.id || 'unknown'}, Latency: ${latency}ms, Error: ${err.message}`);

        if (!res.headersSent) {
            res.status(500).json({ error: '❌ Server issue. Please try again.' });
        } else {
            res.write(`data: ${JSON.stringify({ done: true, error: '❌ Server issue. Please try again.' })}\n\n`);
            res.end();
        }
    }
});

// --- SUGGESTIONS ENDPOINT ---
app.get('/api/chat/suggestions', authenticateToken, checkDatabaseConnection, async (req, res) => {
    try {
        const { sessionId } = req.query;

        if (!sessionId) {
            return res.status(400).json({ error: 'Session ID is required' });
        }

        // Verify session ownership
        const session = await ChatSession.findOne({ _id: sessionId, userId: req.user.id });
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        // Get last user message to analyze intent
        const lastUserMessage = await Message.findOne({
            sessionId,
            role: 'user'
        }).sort({ createdAt: -1 });

        if (!lastUserMessage) {
            // Default suggestions for new chat
            return res.json([
                "Summarize this",
                "Explain with example",
                "Convert to code",
                "Optimize this logic"
            ]);
        }

        // Generic fallback/initial suggestions
        const defaultSuggestions = [
            "Summarize the key legal points",
            "Explain in simple terms",
            "What are the risks?",
            "Draft a formal response"
        ];

        // Analyze last message and generate contextual suggestions
        const content = lastUserMessage.content.toLowerCase();
        let suggestions = [];

        // 1. Legal Basics & Rights
        if (content.match(/\b(law|legal|court|judge|procedure|rights)\b/)) {
            suggestions.push("What are my immediate legal rights?");
            suggestions.push("Explain the court procedure step-by-step");
            suggestions.push("What documents are required?");
            suggestions.push("Find relevant case laws");
        }

        // 2. Contracts & Agreements
        if (content.match(/\b(contract|agreement|sign|deal|clause|term|validity)\b/)) {
            suggestions.push("Highlight critical risks in this contract");
            suggestions.push("Explain the termination clause");
            suggestions.push("Is this legally binding?");
            suggestions.push("Draft a counter-offer/amendment");
        }

        // 3. Disputes & Litigation (Civil/Criminal)
        if (content.match(/\b(dispute|conflict|sue|fraud|cheat|money|recover|debt)\b/)) {
            suggestions.push("What are my legal remedies?");
            suggestions.push("Draft a Legal Notice");
            suggestions.push("How to file a consumer complaint?");
            suggestions.push("Statute of limitations for this?");
        }

        // 4. Criminal Law (Police/Arrest/Bail)
        if (content.match(/\b(police|arrest|bail|crime|fir|offence|jail)\b/)) {
            suggestions.push("Procedure for Anticipatory Bail");
            suggestions.push("How to file an FIR online?");
            suggestions.push("Police powers and my rights");
            suggestions.push("Is this a bailable offence?");
        }

        // 5. Family Law (Divorce/Custody)
        if (content.match(/\b(divorce|custody|maintenance|marriage|dowry|alimony|separation)\b/)) {
            suggestions.push("Grounds for contested divorce");
            suggestions.push("Child custody laws in India");
            suggestions.push("Calculate approximate alimony");
            suggestions.push("Legal rights regarding property");
        }

        // 6. Property & Real Estate
        if (content.match(/\b(property|land|rent|tenant|lease|flat|registration|deed)\b/)) {
            suggestions.push("Verify property title/ownership");
            suggestions.push("Draft an eviction notice");
            suggestions.push("Tenant vs Landlord rights");
            suggestions.push("Property registration process");
        }

        // 7. Corporate & Startup
        if (content.match(/\b(startup|company|business|founder|incorporate|share)\b/)) {
            suggestions.push("Steps to incorporate a Pvt Ltd");
            suggestions.push("Draft a Co-founder Agreement");
            suggestions.push("Checklist for compliance");
            suggestions.push("Understand Trademark vs Copyright");
        }

        // 8. Cyber & Internet
        if (content.match(/\b(cyber|internet|data|online|scam|hack)\b/)) {
            suggestions.push("Report cyber crime online");
            suggestions.push("Data privacy laws (DPDP Act)");
            suggestions.push("Legal headers for website");
        }

        // Deduplicate and fill
        suggestions = [...new Set(suggestions)];

        // If we don't have enough context-specific suggestions, append defaults
        if (suggestions.length < 4) {
            // cycle through defaults to fill up to 4
            for (const s of defaultSuggestions) {
                if (!suggestions.includes(s)) suggestions.push(s);
            }
        }

        // Return top 4-5 suggestions
        res.json(suggestions.slice(0, 5));

    } catch (err) {
        console.error('❌ Error fetching suggestions:', err);
        if (err.name === 'MongoServerSelectionError' || err.name === 'MongoNetworkError') {
            return res.status(503).json({ error: 'Database connection error. Please try again.' });
        }
        res.status(500).json({ error: err.message });
    }
});

// --- DOCUMENT ROUTES ---

// Get All Documents
app.get('/api/documents', authenticateToken, checkDatabaseConnection, async (req, res) => {
    try {
        const documents = await Document.find({ userId: req.user.id }).sort({ uploadedAt: -1 });
        res.json(documents);
    } catch (err) {
        console.error('❌ Error fetching documents:', err);
        if (err.name === 'MongoServerSelectionError' || err.name === 'MongoNetworkError') {
            return res.status(503).json({ error: 'Database connection error. Please try again.' });
        }
        res.status(500).json({ error: err.message });
    }
});

// Create Document
app.post('/api/documents', authenticateToken, checkDatabaseConnection, async (req, res) => {
    try {
        const docData = {
            ...req.body,
            userId: req.user.id
        };
        const document = new Document(docData);
        await document.save();
        console.log('✅ Document created:', document._id);
        res.status(201).json(document);
    } catch (err) {
        console.error('❌ Error creating document:', err);
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(e => e.message);
            return res.status(400).json({ error: `Validation Error: ${messages.join(', ')}` });
        }
        if (err.name === 'MongoServerSelectionError' || err.name === 'MongoNetworkError') {
            return res.status(503).json({ error: 'Database connection error. Please try again.' });
        }
        res.status(500).json({ error: err.message || 'Failed to create document' });
    }
});

// Update Document
app.patch('/api/documents/:id', authenticateToken, checkDatabaseConnection, async (req, res) => {
    try {
        const document = await Document.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.id },
            req.body,
            { new: true }
        );
        if (!document) return res.status(404).json({ error: 'Document not found' });
        res.json(document);
    } catch (err) {
        console.error('❌ Error updating document:', err);
        if (err.name === 'MongoServerSelectionError' || err.name === 'MongoNetworkError') {
            return res.status(503).json({ error: 'Database connection error. Please try again.' });
        }
        res.status(500).json({ error: err.message });
    }
});

// Delete Document
app.delete('/api/documents/:id', authenticateToken, checkDatabaseConnection, async (req, res) => {
    try {
        const document = await Document.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
        if (!document) return res.status(404).json({ error: 'Document not found' });
        console.log('✅ Document deleted:', req.params.id);
        res.json({ message: 'Document deleted' });
    } catch (err) {
        console.error('❌ Error deleting document:', err);
        if (err.name === 'MongoServerSelectionError' || err.name === 'MongoNetworkError') {
            return res.status(503).json({ error: 'Database connection error. Please try again.' });
        }
        res.status(500).json({ error: err.message });
    }
});

// --- LAWYER ROUTES ---

// Get All Lawyers
app.get('/api/lawyers', authenticateToken, checkDatabaseConnection, async (req, res) => {
    try {
        const lawyers = await Lawyer.find({ available: true }).sort({ rating: -1 });
        res.json(lawyers);
    } catch (err) {
        console.error('❌ Error fetching lawyers:', err);
        if (err.name === 'MongoServerSelectionError' || err.name === 'MongoNetworkError') {
            return res.status(503).json({ error: 'Database connection error. Please try again.' });
        }
        res.status(500).json({ error: err.message });
    }
});

// Request Consultation
app.post('/api/consultations', authenticateToken, checkDatabaseConnection, async (req, res) => {
    try {
        const { lawyerId, query } = req.body;

        if (!lawyerId) {
            return res.status(400).json({ error: 'Lawyer ID is required' });
        }

        // Verify lawyer exists
        const lawyer = await Lawyer.findById(lawyerId);
        if (!lawyer) {
            return res.status(404).json({ error: 'Lawyer not found' });
        }

        const consultation = new Consultation({
            userId: req.user.id,
            lawyerId,
            query: query || 'General Legal Consultation'
        });
        await consultation.save();
        console.log('✅ Consultation created:', consultation._id);
        res.status(201).json(consultation);
    } catch (err) {
        console.error('❌ Error creating consultation:', err);
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(e => e.message);
            return res.status(400).json({ error: `Validation Error: ${messages.join(', ')}` });
        }
        if (err.name === 'MongoServerSelectionError' || err.name === 'MongoNetworkError') {
            return res.status(503).json({ error: 'Database connection error. Please try again.' });
        }
        res.status(500).json({ error: err.message || 'Failed to create consultation' });
    }
});

// --- SEED ROUTE (Dev Only) ---
app.post('/api/dev/seed', checkDatabaseConnection, async (req, res) => {
    try {
        // Clear existing
        await Lawyer.deleteMany({});

        const mockLawyers = [
            {
                name: 'Adv. Priya Sharma',
                specialization: 'Family Law',
                rating: 4.8,
                reviews: 124,
                distance: '2.3 km',
                available: true,
                experience: 12,
                avatar: 'PS',
                bio: 'Senior advocate specializing in family law with extensive experience in divorce, custody, and matrimonial disputes.',
                expertise: ['Divorce', 'Child Custody', 'Alimony', 'Domestic Violence'],
                hourlyRate: 2500
            },
            {
                name: 'Adv. Rajesh Kumar',
                specialization: 'Property Law',
                rating: 4.6,
                reviews: 89,
                distance: '3.1 km',
                available: true,
                experience: 8,
                avatar: 'RK',
                bio: 'Expert in property law, real estate transactions, and land disputes.',
                expertise: ['Property Disputes', 'Real Estate', 'Title Verification', 'RERA'],
                hourlyRate: 2000
            }
        ];

        await Lawyer.insertMany(mockLawyers);
        console.log('✅ Seed data inserted successfully');
        res.json({ message: 'Seeding successful', count: mockLawyers.length });
    } catch (err) {
        console.error('❌ Error seeding data:', err);
        if (err.name === 'MongoServerSelectionError' || err.name === 'MongoNetworkError') {
            return res.status(503).json({ error: 'Database connection error. Please try again.' });
        }
        res.status(500).json({ error: err.message || 'Failed to seed data' });
    }
});

// Maintenance: Delete duplicate messages
app.post('/api/maintenance/deduplicate', authenticateToken, checkDatabaseConnection, async (req, res) => {
    // Only allow specific users (in prod, use admin check)
    if (req.user.email !== 'test@test.com' && req.user.role !== 'admin') {
        // return res.status(403).json({ error: 'Unauthorized' }); // Disabled for hackathon ease
    }

    try {
        console.log('🧹 Starting message deduplication...');
        const allMessages = await Message.find({}).sort({ createdAt: 1 });
        const uniqueKeys = new Set();
        const duplicates = [];

        for (const msg of allMessages) {
            // Key: sessionId + role + content + (timestamp rounded to 2s)
            // This catches rapid-fire duplicates but allows same message later
            const timeKey = Math.floor(new Date(msg.createdAt).getTime() / 2000);
            const key = `${msg.sessionId}-${msg.role}-${msg.content.substring(0, 50)}-${timeKey}`;

            if (uniqueKeys.has(key)) {
                duplicates.push(msg._id);
            } else {
                uniqueKeys.add(key);
            }
        }

        if (duplicates.length > 0) {
            await Message.deleteMany({ _id: { $in: duplicates } });
            console.log(`🗑️ Deleted ${duplicates.length} duplicate messages.`);
        } else {
            console.log('✅ No duplicates found.');
        }

        res.json({
            message: 'Deduplication complete',
            deletedCount: duplicates.length
        });
    } catch (err) {
        console.error('❌ Deduplication error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Socket.io for real-time (optional for now, but good for "structure")
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_session', (sessionId) => {
        socket.join(sessionId);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// 404 Handler for undefined routes
app.use((req, res) => {
    console.error(`❌ 404 - Route not found: ${req.method} ${req.path}`);
    res.status(404).json({
        error: 'Route not found',
        path: req.path,
        method: req.method,
        availableRoutes: [
            'GET /api/health',
            'POST /api/auth/register',
            'POST /api/auth/login',
            'GET /api/auth/profile',
            'GET /api/chat/sessions',
            'POST /api/chat/sessions',
            'GET /api/chat/sessions/:sessionId/messages',
            'POST /api/chat/messages',
            'POST /api/chat',
            'GET /api/chat/suggestions'
        ]
    });
});

const PORT = process.env.PORT || 3007;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 API Base URL: http://localhost:${PORT}/api`);
    console.log(`🤖 LLM Provider: GROQ API`);
    console.log(`📊 Database: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);
});

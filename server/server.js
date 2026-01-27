require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const rateLimit = require('express-rate-limit');

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: { error: 'Too many requests, please try again later.' }
});

// Models
const User = require('./models/User');
const ChatSession = require('./models/ChatSession');
const Lawyer = require('./models/Lawyer');
const Message = require('./models/Message');
const Document = require('./models/Document');
const Consultation = require('./models/Consultation');

// Middleware
const { validateObjectId } = require('./middleware/validator');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// Axios instances
const groqAxios = axios.create({
    baseURL: 'https://api.groq.com/openai/v1',
    timeout: 60000,
    headers: { 'Content-Type': 'application/json' }
});

// Middleware
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('dev'));
app.use('/api', limiter);

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
}).then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Helpers Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access denied' });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
};

const checkDatabaseConnection = (req, res, next) => {
    if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({ error: 'Database not connected' });
    }
    next();
};

// Route Debugging
app.use((req, res, next) => {
    console.log(`📥 ${req.method} ${req.path}`);
    next();
});

// Health Check
app.get('/api/health', async (req, res) => {
    res.json({
        status: 'online',
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

// --- LOAD MODULAR ROUTES ---
const authRoutes = require('./routes/auth')(authenticateToken, checkDatabaseConnection);
const chatRoutes = require('./routes/chat')(authenticateToken, checkDatabaseConnection, io, groqAxios);
const lawyerRoutes = require('./routes/lawyer')(authenticateToken, checkDatabaseConnection);
const documentRoutes = require('./routes/document')(authenticateToken, checkDatabaseConnection);
const consultationRoutes = require('./routes/consultation')(authenticateToken, checkDatabaseConnection, io);
const trialRoutes = require('./routes/trial')(authenticateToken, checkDatabaseConnection, groqAxios);

app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/lawyers', lawyerRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/consultations', consultationRoutes);
app.use('/api', trialRoutes); // matches /api/simulate-trial

// --- SOCKET HANDLER ---
io.on('connection', (socket) => {
    console.log('📡 Socket connected:', socket.id);
    socket.on('register_user', (userId) => { if (userId) socket.join(userId.toString()); });
    socket.on('join_session', (sessionId) => { if (sessionId) socket.join(sessionId.toString()); });
    socket.on('disconnect', () => console.log('🔌 Socket disconnected'));
});

// 404
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found', path: req.path });
});

// Error Handler
app.use((err, req, res, next) => {
    console.error('❌ Unhandled Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

const PORT = process.env.PORT || 3007;
server.listen(PORT, () => {
    console.log(`🚀 Pro Server running on port ${PORT}`);
});

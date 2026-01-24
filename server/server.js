require('dotenv').config({ path: __dirname + '/.env' });
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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
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
            role: (role === 'lawyer' || role === 'user') ? role : 'user',
            profileCompleted: false
        });

        await user.save();
        console.log('✅ User registered successfully:', email);

        const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, process.env.JWT_SECRET);
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
        const token = jwt.sign({ id: userIdString, email: user.email, role: user.role }, process.env.JWT_SECRET);
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

// --- DEBUG LOGGING FOR ALL REQUESTS ---
app.use((req, res, next) => {
    if (req.path.includes('check-bar-id')) {
        console.log(`🔍 DIAGNOSTIC: Targeted check-bar-id hit: ${req.method} ${req.url}`);
    }
    next();
});

// Check Bar Registration Number Uniqueness (Robust)
app.get('/api/lawyers/check-bar-id', authenticateToken, checkDatabaseConnection, async (req, res) => {
    console.log('📬 Bar ID Verification request received:', req.query.id);
    try {
        const id = (req.query.id || '').trim().toUpperCase();
        if (!id) return res.status(400).json({ error: 'ID is required for verification' });

        // Escape regex special characters and perform case-insensitive search
        const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const lawyer = await Lawyer.findOne({
            barRegistrationNumber: { $regex: new RegExp(`^${escapedId}$`, 'i') }
        });

        if (lawyer) {
            return res.json({
                exists: true,
                verified: false,
                message: 'Already exist'
            });
        }

        res.json({
            exists: false,
            verified: true,
            message: 'Successfully verified'
        });
    } catch (err) {
        console.error('❌ Error checking Bar ID:', err);
        res.status(500).json({ error: 'Verification service temporarily unavailable' });
    }
});

// Get Profile (Enhanced to include Lawyer details)
app.get('/api/auth/profile', authenticateToken, checkDatabaseConnection, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ error: 'User not found' });

        const userData = user.toObject();

        if (user.role === 'lawyer') {
            const lawyerDetails = await Lawyer.findOne({ userId: user._id });
            if (lawyerDetails) {
                userData.lawyerDetails = lawyerDetails;
            }
        }

        res.json(userData);
    } catch (err) {
        console.error('❌ Error fetching profile:', err);
        if (err.name === 'MongoServerSelectionError' || err.name === 'MongoNetworkError') {
            return res.status(503).json({ error: 'Database connection error. Please try again.' });
        }
        res.status(500).json({ error: err.message });
    }
});

// Update Profile
app.patch('/api/auth/profile', authenticateToken, checkDatabaseConnection, async (req, res) => {
    try {
        const { displayName, avatarUrl, location, lawyerDetails } = req.body;
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Update User basic info
        if (displayName) user.displayName = displayName;
        if (avatarUrl) user.avatarUrl = avatarUrl;
        if (location) user.location = location;

        if (user.role === 'lawyer' && lawyerDetails) {
            let lawyer = await Lawyer.findOne({ userId: user._id });
            if (lawyer) {
                // If fullName is updated, keep it in sync with user.displayName
                if (lawyerDetails.fullName) {
                    lawyer.fullName = lawyerDetails.fullName;
                    user.displayName = lawyerDetails.fullName;
                }

                // If location is updated in the request body (which maps to user.location), sync it to lawyer
                if (location) {
                    lawyer.location = location;
                }

                // Update other lawyer-specific fields
                Object.assign(lawyer, lawyerDetails);
                await lawyer.save();
            }
        }

        await user.save();

        // Return full updated profile
        const updatedUser = user.toObject();
        if (user.role === 'lawyer') {
            const finalLawyerDetails = await Lawyer.findOne({ userId: user._id });
            if (finalLawyerDetails) updatedUser.lawyerDetails = finalLawyerDetails;
        }

        res.json({ message: 'Profile updated successfully', user: updatedUser });
    } catch (err) {
        console.error('❌ Error updating profile:', err);
        res.status(500).json({ error: err.message });
    }
});

// Complete Profile
app.patch('/api/auth/profile/complete', authenticateToken, checkDatabaseConnection, async (req, res) => {
    try {
        const { role, details } = req.body;
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (user.role === 'lawyer') {
            // Robust check for Bar ID duplication among OTHER users
            if (details.barRegistrationNumber) {
                const normalizedId = details.barRegistrationNumber.trim().toUpperCase();
                const conflict = await Lawyer.findOne({
                    barRegistrationNumber: { $regex: new RegExp(`^${normalizedId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
                    userId: { $ne: user._id }
                });

                if (conflict) {
                    return res.status(400).json({
                        error: 'Registration failed: This Bar ID already exists in our records. Please verify your entry.'
                    });
                }
            }

            // Sync User DisplayName with Lawyer FullName for consistency
            if (details.fullName) user.displayName = details.fullName;

            // Sync Location structure from User to Lawyer if provided
            if (details.location) {
                user.location = details.location;
            }

            // Update or create lawyer profile
            let lawyer = await Lawyer.findOne({ userId: user._id });
            if (lawyer) {
                Object.assign(lawyer, details);
                // Explicitly sync location to lawyer document to ensure geo-queries work
                if (details.location) lawyer.location = details.location;
                await lawyer.save();
            } else {
                lawyer = new Lawyer({
                    userId: user._id,
                    ...details,
                    email: user.email, // Ensure email matches
                    location: details.location || user.location // Ensure location is set on creation
                });
                await lawyer.save();
            }
        } else {
            // For regular users
            if (details.displayName) user.displayName = details.displayName;
            if (details.location) user.location = details.location;
        }

        user.profileCompleted = true;
        await user.save();

        console.log(`✅ Profile completed: ${user.email} (${user.role})`);
        res.json({
            message: 'Successful: Profile verified and completed',
            user: {
                id: user._id,
                email: user.email,
                displayName: user.displayName,
                role: user.role,
                profileCompleted: user.profileCompleted
            }
        });
    } catch (err) {
        console.error('❌ Error completing profile:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get Ranked Lawyers - Returns exactly 3 recommended lawyers from DATABASE ONLY
app.post('/api/lawyers/ranked', authenticateToken, checkDatabaseConnection, async (req, res) => {
    try {
        console.log('📥 POST /api/lawyers/ranked - Fetching from database');
        const { category, location = [78.4867, 17.3850] } = req.body;

        // Fetch lawyers from database ONLY
        const dbLawyers = await Lawyer.find({ activeStatus: true })
            .limit(10)
            .lean();

        console.log(`📊 Found ${dbLawyers.length} lawyers in database`);

        if (!dbLawyers || dbLawyers.length === 0) {
            return res.status(404).json({
                error: 'No lawyers found in database. Please run the seed script.',
                hint: 'Run: node seed.js'
            });
        }

        // Calculate distances using Haversine formula
        const [userLng, userLat] = location;

        const results = dbLawyers.map(lawyer => {
            let dist = 5; // Default 5km

            // Try to get lawyer coordinates
            if (lawyer.location?.coordinates?.coordinates) {
                const [lawyerLng, lawyerLat] = lawyer.location.coordinates.coordinates;
                if (lawyerLng && lawyerLat && lawyerLng !== 0 && lawyerLat !== 0) {
                    const R = 6371;
                    const dLat = (lawyerLat - userLat) * Math.PI / 180;
                    const dLon = (lawyerLng - userLng) * Math.PI / 180;
                    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                        Math.cos(userLat * Math.PI / 180) * Math.cos(lawyerLat * Math.PI / 180) *
                        Math.sin(dLon / 2) * Math.sin(dLon / 2);
                    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                    dist = R * c;
                }
            } else {
                // Random distance between 1-8 km for demo
                dist = 1 + Math.random() * 7;
            }

            // Calculate scores
            const rating = lawyer.rating?.averageRating || 4.5;
            const experience = lawyer.yearsOfExperience || 5;
            const successRate = lawyer.caseStats?.successRate || 75;

            return {
                _id: lawyer._id.toString(),
                fullName: lawyer.fullName,
                primaryPracticeArea: lawyer.primaryPracticeArea || 'General Practice',
                yearsOfExperience: experience,
                rating: rating,
                totalReviews: lawyer.rating?.totalReviews || Math.floor(50 + Math.random() * 150),
                distanceValue: parseFloat(dist.toFixed(1)),
                distance: `${dist.toFixed(1)} km`,
                available: true,
                activeStatus: true,
                finalScore: Math.floor(70 + rating * 5 + experience * 0.5),
                categorySuccessScore: successRate,
                experienceScore: Math.min(experience * 6, 100),
                responsivenessScore: lawyer.responsiveness?.acceptanceRate || 85,
                bio: lawyer.bio || `Experienced ${lawyer.primaryPracticeArea || 'legal'} professional.`
            };
        });

        // Sort by finalScore descending, then by distance ascending
        results.sort((a, b) => {
            if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
            return a.distanceValue - b.distanceValue;
        });

        // Return exactly 3 lawyers
        const topThree = results.slice(0, 3);
        console.log(`✅ Returning ${topThree.length} recommended lawyers from database`);

        res.json(topThree);
    } catch (err) {
        console.error('❌ Error in /api/lawyers/ranked:', err);
        res.status(500).json({ error: 'Failed to fetch lawyers from database' });
    }
});

// --- CHAT ROUTES ---

// Get Sessions
app.get('/api/chat/sessions', authenticateToken, checkDatabaseConnection, async (req, res) => {
    try {
        // Find sessions where user is owner OR a participant
        const sessions = await ChatSession.find({
            $or: [
                { userId: req.user.id },
                { participants: req.user.id }
            ]
        }).sort({ updatedAt: -1 });
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
        // Verify session access (Owner OR Participant)
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

// Add Highlight to Message
app.post('/api/chat/messages/:id/highlights', authenticateToken, checkDatabaseConnection, async (req, res) => {
    try {
        const { start, end, color } = req.body;

        // Validate input
        if (typeof start !== 'number' || typeof end !== 'number') {
            return res.status(400).json({ error: 'Start and end indices are required' });
        }
        if (!color) {
            return res.status(400).json({ error: 'Color is required' });
        }
        if (start >= end) {
            return res.status(400).json({ error: 'Invalid selection range' });
        }

        // Verify message ownership via session
        const message = await Message.findById(req.params.id);
        if (!message) return res.status(404).json({ error: 'Message not found' });

        const session = await ChatSession.findOne({ _id: message.sessionId, userId: req.user.id });
        if (!session) return res.status(403).json({ error: 'Not authorized to highlight this message' });

        if (message.role !== 'assistant') {
            return res.status(400).json({ error: 'Only assistant messages can be highlighted' });
        }

        // Check for overlapping highlights
        const hasOverlap = message.highlights.some(h =>
            (start < h.end && end > h.start)
        );
        if (hasOverlap) {
            return res.status(400).json({ error: 'Highlight overlaps with existing highlight' });
        }

        // Generate unique highlight ID
        const highlightId = `hl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const newHighlight = {
            highlightId,
            start,
            end,
            color,
            createdAt: new Date()
        };

        message.highlights.push(newHighlight);
        await message.save();

        console.log('✅ Highlight added to message:', message._id, highlightId);
        res.status(201).json({ message, highlight: newHighlight });
    } catch (err) {
        console.error('❌ Error adding highlight:', err);
        if (err.name === 'MongoServerSelectionError' || err.name === 'MongoNetworkError') {
            return res.status(503).json({ error: 'Database connection error. Please try again.' });
        }
        res.status(500).json({ error: err.message });
    }
});

// Remove Highlight from Message
app.delete('/api/chat/messages/:id/highlights/:highlightId', authenticateToken, checkDatabaseConnection, async (req, res) => {
    try {
        const { id, highlightId } = req.params;

        // Verify message ownership via session
        const message = await Message.findById(id);
        if (!message) return res.status(404).json({ error: 'Message not found' });

        const session = await ChatSession.findOne({ _id: message.sessionId, userId: req.user.id });
        if (!session) return res.status(403).json({ error: 'Not authorized to modify this message' });

        // Find and remove highlight
        const highlightIndex = message.highlights.findIndex(h => h.highlightId === highlightId);
        if (highlightIndex === -1) {
            return res.status(404).json({ error: 'Highlight not found' });
        }

        message.highlights.splice(highlightIndex, 1);
        await message.save();

        console.log('✅ Highlight removed from message:', message._id, highlightId);
        res.json({ message });
    } catch (err) {
        console.error('❌ Error removing highlight:', err);
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
        if (!role || !['user', 'assistant', 'system', 'lawyer'].includes(role)) {
            return res.status(400).json({ error: 'Valid role (user, assistant, system, lawyer) is required' });
        }
        if (!content || content.trim() === '') {
            return res.status(400).json({ error: 'Message content is required' });
        }

        // Verify session access (Creator OR Participant)
        const session = await ChatSession.findOne({
            _id: sessionId,
            $or: [
                { userId: req.user.id },
                { participants: req.user.id }
            ]
        });

        if (!session) return res.status(404).json({ error: 'Session not found or access denied' });

        const message = new Message({ sessionId, role, content: content.trim() });
        await message.save();

        // Update session timestamp
        session.updatedAt = Date.now();
        await session.save();

        console.log('✅ Message saved:', message._id);

        // Emit real-time message to the session room
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
            // Default suggestions for a new legal consultation session
            return res.json([
                "⚖️ How do I start a legal proceeding in India?",
                "📜 What are my basic fundamental rights?",
                "🏙️ I need help with a property dispute",
                "👔 My employer is not paying my dues",
                "🚗 I met with a road accident, what now?",
                "💍 Guidance on marriage registration/laws"
            ]);
        }

        // Premium fallback suggestions for general legal guidance
        const defaultSuggestions = [
            "⚖️ What are the immediate legal risks here?",
            "📄 Create a structured summary of this case",
            "🔍 Find relevant Indian case law precedents",
            "📅 List the required documents for this matter",
            "💡 Explain this in simple layman terms",
            "🛡️ What specific Acts/Sections apply here?"
        ];

        const content = lastUserMessage.content.toLowerCase();
        let suggestions = [];

        // 1. Legal Basics & Court Procedure
        if (content.match(/\b(law|legal|court|judge|procedure|rights|constitution|supreme|high court|petition|lawyer)\b/)) {
            suggestions.push("📑 List my fundamental legal rights");
            suggestions.push("🏛️ How to file a case in District Court?");
            suggestions.push("🔍 Search for recent landmark SC judgments");
            suggestions.push("🤝 How to hire the right lawyer for this?");
        }

        // 2. Contracts & Commercial
        if (content.match(/\b(contract|agreement|sign|deal|clause|term|validity|notary|signed|stamp duty|lease|rent|nda)\b/)) {
            suggestions.push("🚩 Highlights the 'hidden' risks in this clause");
            suggestions.push("🔓 Legal grounds for contract termination");
            suggestions.push("✍️ Draft a breach of contract notice");
            suggestions.push("📜 Is this agreement legally binding?");
        }

        // 3. Recovery & Consumer Protection
        if (content.match(/\b(dispute|money|recover|debt|notice|refund|product|service|e-commerce|flipkart|amazon|cheated|warranty)\b/)) {
            suggestions.push("🛍️ How to file a Consumer Court complaint?");
            suggestions.push("📨 Draft a formal 'Legal Notice' for refund");
            suggestions.push("⏳ What is the time limit (statute) for recovery?");
            suggestions.push("💵 Can I claim compensation for mental agony?");
        }

        // 4. Criminal & Police Interaction
        if (content.match(/\b(police|arrest|bail|crime|fir|offence|jail|complaint|police station|warrant|interrogation)\b/)) {
            suggestions.push("🔓 Procedure for getting Anticipatory Bail");
            suggestions.push("📝 Checklist for filing an airtight FIR");
            suggestions.push("🚔 What to do if police refuse to file FIR?");
            suggestions.push("🚔 Rights during custodial interrogation");
        }

        // 5. Family & Personal
        if (content.match(/\b(divorce|custody|marriage|dowry|alimony|will|inheritance|son|daughter|family)\b/)) {
            suggestions.push("💔 Mutual Consent Divorce: Timeline & Cost");
            suggestions.push("👨‍👩‍👧‍👦 How to ensure child visitation rights?");
            suggestions.push("📝 Step-by-step to draft a valid Digital Will");
            suggestions.push("💰 How is maintenance amount decided?");
        }

        // 6. Employment & Workplace
        if (content.match(/\b(job|salary|employer|employee|fired|termination|bonus|pf|gratuity|posh|harassment|notice period)\b/)) {
            suggestions.push("👔 Legal shield against wrongful termination");
            suggestions.push("💵 How to recover unpaid salary & bonus?");
            suggestions.push("⏰ Labor laws on overtime and holidays");
            suggestions.push("🛡️ Filing a POSH complaint at workplace");
        }

        // 7. Property & RERA
        if (content.match(/\b(property|land|rent|tenant|lease|flat|deed|registry|rera|builder|possession|encumbrance)\b/)) {
            suggestions.push("🏡 Checklist for buying an under-construction flat");
            suggestions.push("🏗️ How to file a RERA complaint against builder?");
            suggestions.push("📜 Is a Power of Attorney valid for property sale?");
            suggestions.push("🚪 Legal ways to handle a difficult tenant");
        }

        // 8. RTI & Government Services
        if (content.match(/\b(rti|government|authority|municipality|delay|officer|public|information|scheme)\b/)) {
            suggestions.push("📝 How to draft an effective RTI application?");
            suggestions.push("⏳ What if RTI reply is not received in 30 days?");
            suggestions.push("🏛️ Suing a government body for negligence");
        }

        // 9. Startup, IP & Taxation
        if (content.match(/\b(startup|company|business|gst|tax|income|it|patent|trademark|copyright|brand|logo)\b/)) {
            suggestions.push("🚀 Most tax-efficient structure for my startup");
            suggestions.push("🔖 Trademark vs Copyright: Which do I need?");
            suggestions.push("📨 How to reply to an Income Tax notice?");
            suggestions.push("🤝 Standard terms for an Investor Term Sheet");
        }

        // 10. Cheque Bounce & Cyber Crime
        if (content.match(/\b(cheque|bounce|bank|fraud|cyber|hacked|scam|upi|payment|loan|emi)\b/)) {
            suggestions.push("🏧 Success rate of Section 138 NI Act cases");
            suggestions.push("💻 How to report a UPI/Banking fraud immediately?");
            suggestions.push("📨 Draft a reply to a Cheque Bounce notice");
            suggestions.push("🛡️ Protecting against identity theft online");
        }

        // 11. Motor Vehicle / Traffic
        if (content.match(/\b(accident|traffic|fine|challan|license|rc|insurance|hit and run)\b/)) {
            suggestions.push("🚗 How to contest a wrong traffic challan?");
            suggestions.push("📋 Motor Accident Claims Tribunal (MACT) guide");
            suggestions.push("🛡️ Rules for First Party vs Third Party insurance");
        }

        // --- Contextual Post-Processing ---
        const normalize = (s) => s.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim().toLowerCase().replace(/\s+/g, ' ');
        const finalSet = [];
        const seen = new Set();

        // Combine, shuffle and pick top 6 for variety
        const allPossible = [...suggestions, ...defaultSuggestions]
            .sort(() => Math.random() - 0.5);

        allPossible.forEach(s => {
            const norm = normalize(s);
            if (!seen.has(norm) && finalSet.length < 6) {
                seen.add(norm);
                finalSet.push(s);
            }
        });

        // Ensure we always have at least 4 suggestions
        if (finalSet.length < 4) {
            defaultSuggestions.slice(0, 4).forEach(s => {
                if (!seen.has(normalize(s))) finalSet.push(s);
            });
        }

        res.json(finalSet);


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

// Get All Lawyers (from database only)
app.get('/api/lawyers', authenticateToken, checkDatabaseConnection, async (req, res) => {
    try {
        console.log('📥 GET /api/lawyers - Fetching from database');

        // Fetch lawyers from database only
        const lawyers = await Lawyer.find({ activeStatus: true })
            .sort({ 'rating.averageRating': -1 })
            .limit(10)
            .lean();

        console.log(`📊 Found ${lawyers.length} lawyers in database`);

        if (!lawyers || lawyers.length === 0) {
            return res.status(404).json({
                error: 'No lawyers found in database. Please run the seed script.',
                hint: 'Run: node seed.js'
            });
        }

        // Normalize response for frontend compatibility
        const normalizedLawyers = lawyers.map(l => ({
            _id: l._id,
            name: l.fullName,
            fullName: l.fullName,
            specialization: l.primaryPracticeArea,
            primaryPracticeArea: l.primaryPracticeArea,
            rating: l.rating?.averageRating || 4.5,
            reviews: l.rating?.totalReviews || 0,
            experience: l.yearsOfExperience || 5,
            yearsOfExperience: l.yearsOfExperience || 5,
            available: l.activeStatus ?? true,
            activeStatus: l.activeStatus ?? true,
            hourlyRate: l.hourlyRate || 2000,
            avatar: l.avatar || l.fullName?.split(' ').map(n => n[0]).join(''),
            bio: l.bio || `Experienced ${l.primaryPracticeArea} professional.`,
            expertise: l.expertise || [l.primaryPracticeArea],
            distance: `${(1 + Math.random() * 5).toFixed(1)} km`
        }));

        res.json(normalizedLawyers);
    } catch (err) {
        console.error('❌ Error fetching lawyers:', err);
        res.status(500).json({ error: 'Failed to fetch lawyers from database' });
    }
});



// --- SEED ROUTE (Dev Only) - Adds 25 lawyers with random data ---
app.post('/api/dev/seed', checkDatabaseConnection, async (req, res) => {
    try {
        // Clear existing lawyers
        await Lawyer.deleteMany({});
        console.log('🗑️ Cleared existing lawyers');

        // Data arrays for random generation
        const firstNames = ['Priya', 'Rajesh', 'Anita', 'Vikram', 'Meera', 'Suresh', 'Kavita', 'Amit', 'Deepika', 'Sanjay',
            'Neha', 'Arun', 'Pooja', 'Rahul', 'Sneha', 'Karthik', 'Divya', 'Manish', 'Aarti', 'Rohit',
            'Swati', 'Nikhil', 'Ritu', 'Gaurav', 'Nandini'];
        const lastNames = ['Sharma', 'Kumar', 'Desai', 'Singh', 'Patel', 'Reddy', 'Joshi', 'Verma', 'Gupta', 'Rao',
            'Iyer', 'Nair', 'Mehta', 'Shah', 'Bose', 'Das', 'Choudhury', 'Malhotra', 'Kapoor', 'Agarwal',
            'Pandey', 'Mishra', 'Saxena', 'Banerjee', 'Chatterjee'];

        const practiceAreas = [
            'Criminal Law', 'Family Law', 'Property Law', 'Corporate Law', 'Labour Law',
            'Consumer Law', 'Intellectual Property', 'Tax Law', 'Civil Litigation', 'Constitutional Law',
            'Cyber Law', 'Environmental Law', 'Immigration Law', 'Banking Law', 'Insurance Law'
        ];

        const cities = [
            { city: 'Hyderabad', state: 'Telangana', baseLng: 78.4867, baseLat: 17.3850 },
            { city: 'Secunderabad', state: 'Telangana', baseLng: 78.5018, baseLat: 17.4399 },
            { city: 'Madhapur', state: 'Telangana', baseLng: 78.3915, baseLat: 17.4486 },
            { city: 'Gachibowli', state: 'Telangana', baseLng: 78.3498, baseLat: 17.4401 },
            { city: 'Banjara Hills', state: 'Telangana', baseLng: 78.4340, baseLat: 17.4156 }
        ];

        const expertiseMap = {
            'Criminal Law': ['Criminal Defense', 'Bail Applications', 'White Collar Crime', 'Cyber Crime', 'Murder Defense', 'Fraud Cases'],
            'Family Law': ['Divorce', 'Child Custody', 'Alimony', 'Domestic Violence', 'Adoption', 'Prenuptial Agreements'],
            'Property Law': ['Property Disputes', 'Real Estate', 'Title Verification', 'RERA', 'Land Acquisition', 'Tenancy'],
            'Corporate Law': ['M&A', 'Company Formation', 'Contract Law', 'Due Diligence', 'Startup Advisory', 'Compliance'],
            'Labour Law': ['Employment Disputes', 'Wrongful Termination', 'POSH', 'PF/ESI', 'Union Matters', 'Workplace Safety'],
            'Consumer Law': ['Consumer Complaints', 'Product Liability', 'E-commerce Disputes', 'Banking Issues', 'Service Deficiency'],
            'Intellectual Property': ['Patents', 'Trademarks', 'Copyright', 'IP Litigation', 'Trade Secrets', 'Licensing'],
            'Tax Law': ['Income Tax', 'GST', 'Tax Planning', 'Tax Appeals', 'International Tax', 'Transfer Pricing'],
            'Civil Litigation': ['Contract Disputes', 'Recovery Suits', 'Injunctions', 'Arbitration', 'Mediation'],
            'Constitutional Law': ['Fundamental Rights', 'PIL', 'Writ Petitions', 'Constitutional Remedies'],
            'Cyber Law': ['Data Privacy', 'Cyber Crime', 'IT Act Cases', 'Online Fraud', 'Social Media Issues'],
            'Environmental Law': ['Pollution Control', 'NGT Matters', 'Environmental Clearance', 'Wildlife Protection'],
            'Immigration Law': ['Visa Issues', 'Work Permits', 'Citizenship', 'Deportation Defense', 'NRI Matters'],
            'Banking Law': ['Loan Recovery', 'SARFAESI', 'DRT Matters', 'Banking Fraud', 'NBFC Regulations'],
            'Insurance Law': ['Claim Disputes', 'Policy Interpretation', 'Regulatory Compliance', 'Reinsurance']
        };

        const bios = [
            'Distinguished advocate with extensive courtroom experience and a track record of successful case resolutions.',
            'Senior counsel known for meticulous case preparation and client-focused legal strategies.',
            'Experienced legal professional combining traditional advocacy with modern legal tech approaches.',
            'Renowned for handling complex litigation with precision and dedication to client interests.',
            'Award-winning advocate with expertise in both trial and appellate practice.',
            'Trusted legal advisor to numerous corporations and high-net-worth individuals.',
            'Dynamic lawyer known for innovative legal solutions and exceptional client service.',
            'Seasoned practitioner with deep expertise in specialized legal domains.',
            'Highly rated advocate with consistent success in challenging legal matters.',
            'Dedicated legal professional committed to justice and ethical practice.'
        ];

        // Generate 25 lawyers
        const mockLawyers = [];

        for (let i = 0; i < 25; i++) {
            const firstName = firstNames[i % firstNames.length];
            const lastName = lastNames[i % lastNames.length];
            const fullName = `Adv. ${firstName} ${lastName}`;
            const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@lawfirm.com`;

            const practiceArea = practiceAreas[i % practiceAreas.length];
            const cityData = cities[i % cities.length];

            // Random offsets for coordinates (within ~10km)
            const lngOffset = (Math.random() - 0.5) * 0.15;
            const latOffset = (Math.random() - 0.5) * 0.15;

            const yearsExp = 3 + Math.floor(Math.random() * 20); // 3-22 years
            const avgRating = (4.0 + Math.random() * 0.9).toFixed(1); // 4.0-4.9
            const totalReviews = 20 + Math.floor(Math.random() * 250); // 20-269 reviews
            const successRate = 70 + Math.floor(Math.random() * 25); // 70-94%
            const hourlyRate = 1000 + Math.floor(Math.random() * 4000); // 1000-5000

            const expertise = expertiseMap[practiceArea] || ['General Practice'];
            const selectedExpertise = expertise.slice(0, 3 + Math.floor(Math.random() * 3));

            mockLawyers.push({
                fullName,
                email,
                barRegistrationNumber: `ts/${2005 + Math.floor(Math.random() * 18)}/${1000 + i}`,
                verifiedBarStatus: Math.random() > 0.2, // 80% verified
                activeStatus: true,
                yearsOfExperience: yearsExp,
                primaryPracticeArea: practiceArea,
                secondaryPracticeAreas: [practiceAreas[(i + 3) % practiceAreas.length], practiceAreas[(i + 7) % practiceAreas.length]],
                location: {
                    city: cityData.city,
                    district: 'Hyderabad',
                    state: cityData.state,
                    coordinates: {
                        type: 'Point',
                        coordinates: [cityData.baseLng + lngOffset, cityData.baseLat + latOffset]
                    }
                },
                caseStats: {
                    totalCasesHandled: 50 + Math.floor(Math.random() * 500),
                    successRate: successRate,
                    recentCasesLast6Months: 2 + Math.floor(Math.random() * 15)
                },
                categoryStats: {
                    [practiceArea.toLowerCase().replace(' ', '_')]: {
                        successRate: successRate,
                        casesHandled: 30 + Math.floor(Math.random() * 200)
                    }
                },
                responsiveness: {
                    avgResponseTimeMinutes: 10 + Math.floor(Math.random() * 50),
                    acceptanceRate: 70 + Math.floor(Math.random() * 25)
                },
                rating: {
                    averageRating: parseFloat(avgRating),
                    totalReviews: totalReviews
                },
                disciplinaryActionsCount: Math.random() > 0.95 ? 1 : 0, // 5% have 1 action
                // Legacy/Extra fields for UI
                avatar: `${firstName[0]}${lastName[0]}`,
                bio: bios[i % bios.length],
                expertise: selectedExpertise,
                hourlyRate: hourlyRate,
                available: true
            });
        }

        // Insert all lawyers
        await Lawyer.insertMany(mockLawyers);

        console.log(`✅ Seed data inserted successfully: ${mockLawyers.length} lawyers`);

        // Return summary
        const summary = {
            message: 'Seeding successful',
            totalLawyers: mockLawyers.length,
            practiceAreas: [...new Set(mockLawyers.map(l => l.primaryPracticeArea))],
            cities: [...new Set(mockLawyers.map(l => l.location.city))],
            sampleLawyers: mockLawyers.slice(0, 3).map(l => ({
                name: l.fullName,
                area: l.primaryPracticeArea,
                experience: l.yearsOfExperience,
                rating: l.rating.averageRating
            }))
        };

        res.json(summary);
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

// Request Consultation
app.post('/api/consultations', authenticateToken, checkDatabaseConnection, async (req, res) => {
    try {
        const { lawyerId, initialMessage, priority = 'normal' } = req.body;

        if (!lawyerId) {
            return res.status(400).json({ error: 'Lawyer ID is required' });
        }

        // Verify lawyer exists - check by _id first
        let lawyer = await Lawyer.findById(lawyerId);
        if (!lawyer) {
            // Fallback to searching by userId if client sent that
            lawyer = await Lawyer.findOne({ userId: lawyerId });
        }

        if (!lawyer) {
            console.error('❌ Lawyer not found for consultation request:', lawyerId);
            return res.status(404).json({ error: 'Lawyer not found' });
        }

        const consultation = new Consultation({
            userId: req.user.id,
            lawyerId: lawyer._id, // Ensure we store the Lawyer document ID
            initialMessage: initialMessage,
            priority: priority,
            status: 'pending'
        });

        await consultation.save();
        console.log(`✅ Consultation requested: ${consultation._id} for lawyer ${lawyer._id}`);

        // Notify lawyer via socket instantly
        const populatedConsultation = await Consultation.findById(consultation._id)
            .populate('userId', 'displayName email avatarUrl');

        io.to(lawyer.userId.toString()).emit('consultation:new_request', populatedConsultation);

        res.status(201).json(consultation);
    } catch (err) {
        console.error('❌ Error requesting consultation:', err);
        res.status(500).json({ error: err.message });
    }
});
// Get Current User's Requests (for client portal)
app.get('/api/consultations/user', authenticateToken, checkDatabaseConnection, async (req, res) => {
    try {
        const requests = await Consultation.find({ userId: req.user.id })
            .populate('lawyerId')
            .sort({ createdAt: -1 });
        res.json(requests);
    } catch (err) {
        console.error('❌ Error fetching user requests:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get Pending Requests (Lawyer only)
app.get('/api/consultations/requests', authenticateToken, checkDatabaseConnection, async (req, res) => {
    try {
        if (req.user.role !== 'lawyer') {
            return res.status(403).json({ error: 'Unauthorized: Only lawyers can view consultation requests.' });
        }

        // Get lawyer profile ID first
        const lawyer = await Lawyer.findOne({ userId: req.user.id });
        if (!lawyer) return res.status(404).json({ error: 'Lawyer profile not found. Please complete your profile.' });

        const requests = await Consultation.find({
            lawyerId: lawyer._id,
            status: 'pending'
        })
            .populate('userId', 'displayName email avatarUrl')
            .sort({ createdAt: -1 });

        res.json(requests);
    } catch (err) {
        console.error('❌ Error fetching requests:', err);
        res.status(500).json({ error: err.message });
    }
});

// Accept Request
app.patch('/api/consultations/:id/accept', authenticateToken, checkDatabaseConnection, async (req, res) => {
    try {
        console.log(`📡 Accepting consultation: ${req.params.id} by user: ${req.user.id}`);

        if (req.user.role !== 'lawyer') {
            console.warn(`⚠️ Role mismatch: Expected 'lawyer', got '${req.user.role}'`);
            return res.status(403).json({ error: 'Only lawyers can accept consultation requests.' });
        }

        const consultation = await Consultation.findById(req.params.id);
        if (!consultation) {
            console.warn(`⚠️ Consultation not found: ${req.params.id}`);
            return res.status(404).json({ error: 'Consultation request not found.' });
        }

        if (consultation.status !== 'pending') {
            console.warn(`⚠️ Consultation already ${consultation.status}: ${req.params.id}`);
            return res.status(400).json({ error: `This request is already ${consultation.status}.` });
        }

        // Verify that the current user owns the lawyer profile this consultation was sent to
        const lawyer = await Lawyer.findOne({ userId: req.user.id });
        if (!lawyer) {
            console.error(`❌ Lawyer profile not found for user: ${req.user.id}`);
            return res.status(403).json({ error: 'Lawyer profile not found. Please complete your profile initialization.' });
        }

        console.log(`🔍 Comparing: Consultation LawyerId: ${consultation.lawyerId.toString()} | Actual Lawyer _id: ${lawyer._id.toString()}`);

        if (consultation.lawyerId.toString() !== lawyer._id.toString()) {
            console.warn(`⚠️ Authorization failed: Consultation target (${consultation.lawyerId}) does not match current user's lawyer profile (${lawyer._id})`);
            return res.status(403).json({ error: 'You are not authorized to accept this request. It was sent to another lawyer.' });
        }

        // Atomic update to accepted
        consultation.status = 'accepted';
        await consultation.save();

        // Create Chat Session
        const session = new ChatSession({
            userId: consultation.userId, // The Client (User ID)
            lawyerId: lawyer._id, // The Lawyer (Lawyer Document ID)
            title: `Consultation with ${lawyer.fullName}`,
            type: 'lawyer',
            participants: [
                new mongoose.Types.ObjectId(consultation.userId),
                new mongoose.Types.ObjectId(req.user.id)
            ]
        });
        await session.save();

        // **Link Consultation to Session**
        consultation.sessionId = session._id;
        await consultation.save();

        console.log(`✅ Consultation accepted: ${consultation._id}. Created Chat Session: ${session._id}`);

        // Notify user instantly via socket
        io.to(consultation.userId.toString()).emit('consultation:accepted', {
            requestId: consultation._id,
            sessionId: session._id,
            title: session.title,
            lawyerName: lawyer.fullName
        });

        res.json({
            message: 'Accepted',
            sessionId: session._id,
            requestId: consultation._id
        });
    } catch (err) {
        console.error('❌ CRITICAL Error accepting request:', err);
        res.status(500).json({ error: 'Internal server error while accepting request. ' + err.message });
    }
});

// Reject Request
app.patch('/api/consultations/:id/reject', authenticateToken, checkDatabaseConnection, async (req, res) => {
    try {
        const consultation = await Consultation.findById(req.params.id);
        if (!consultation) return res.status(404).json({ error: 'Consultation not found' });

        // Logic check: ensure lawyer owns this
        const lawyer = await Lawyer.findOne({ userId: req.user.id });
        if (!lawyer || consultation.lawyerId.toString() !== lawyer._id.toString()) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        consultation.status = 'rejected';
        await consultation.save();

        res.json({ message: 'Rejected' });
    } catch (err) {
        console.error('❌ Error rejecting request:', err);
        res.status(500).json({ error: err.message });
    }
});

// Delete/Cancel Consultation Request (Both User and Lawyer)
app.delete('/api/consultations/:id', authenticateToken, checkDatabaseConnection, async (req, res) => {
    try {
        const consultation = await Consultation.findById(req.params.id);
        if (!consultation) return res.status(404).json({ error: 'Consultation not found' });

        // Identify requester
        const isUser = consultation.userId.toString() === req.user.id;

        // Find lawyer record if requester is a lawyer
        const lawyer = await Lawyer.findOne({ userId: req.user.id });
        const isLawyer = lawyer && consultation.lawyerId.toString() === lawyer._id.toString();

        if (!isUser && !isLawyer) {
            return res.status(403).json({ error: 'You are not authorized to delete this request.' });
        }

        await Consultation.findByIdAndDelete(req.params.id);

        // Notify other party if needed (Socket.io)
        const targetId = isUser ? consultation.lawyerId : consultation.userId;
        io.to(targetId.toString()).emit('consultation:deleted', { requestId: req.params.id });

        res.json({ message: 'Consultation request deleted successfully' });
    } catch (err) {
        console.error('❌ Error deleting request:', err);
        res.status(500).json({ error: err.message });
    }
});

// Socket.io for real-time communication
io.on('connection', (socket) => {
    console.log('📡 Socket connected:', socket.id);

    // Register user to their own private room for notifications
    socket.on('register_user', (userId) => {
        if (userId) {
            socket.join(userId.toString());
            console.log(`👤 User joined private room: ${userId}`);
        }
    });

    // Join a specific chat session room
    socket.on('join_session', (sessionId) => {
        if (sessionId) {
            socket.join(sessionId.toString());
            console.log(`💬 Joined session room: ${sessionId}`);
        }
    });

    socket.on('disconnect', () => {
        console.log('🔌 Socket disconnected');
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
            'PATCH /api/auth/profile/complete',
            'GET /api/lawyers/check-bar-id',
            'POST /api/lawyers/ranked',
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

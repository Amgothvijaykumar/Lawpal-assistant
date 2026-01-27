const axios = require('axios');

const API_URL = 'http://localhost:3007/api';

async function testChat() {
    try {
        console.log('🚀 Starting Chat Verification Test...');

        // 1. Register/Login User
        const email = `testuser_${Date.now()}@example.com`;
        const password = 'TestPassword123!';

        console.log(`👤 Registering test user: ${email}`);

        let token;
        try {
            const regRes = await axios.post(`${API_URL}/auth/register`, {
                email,
                password,
                displayName: 'Test User'
            });
            token = regRes.data.token;
            console.log('✅ Registered successfully.');
        } catch (e) {
            console.log('⚠️ Registration failed (might exist), trying login...');
            // In a real reusable test we'd login, but unique email prevents this need mostly
        }

        if (!token) return;

        // 2. Create Session
        console.log('📝 Creating Chat Session...');
        const sessionRes = await axios.post(`${API_URL}/chat/sessions`, {
            title: 'Test Session ' + Date.now()
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const sessionId = sessionRes.data._id;
        console.log(`✅ Session Created: ${sessionId}`);

        // 3. Send Stream Message (Simulating frontend SSE connection is hard in Node script without EventSource polyfill,
        // so we'll just hit the endpoint and read the raw stream or just expect the logs on server side to appear).

        console.log('💬 Sending Message: "What is 2+2?" (Expect trigger of AI model)');

        // We use a simple promise wrapper to read the stream or at least trigger it
        const responseProxy = await axios.post(`${API_URL}/chat`, {
            message: "What is 2+2?",
            sessionId
        }, {
            headers: { Authorization: `Bearer ${token}` },
            responseType: 'stream'
        });

        console.log('✅ Request sent to server. Check SERVER CONSOLE for "SENDING TO FLASK" logs.');

        // Consume stream to ensure it triggers
        responseProxy.data.on('data', chunk => {
            const str = chunk.toString();
            console.log('📥 Received Chunk:', str.substring(0, 50) + '...'); // just show start
        });

        responseProxy.data.on('end', () => {
            console.log('✅ Stream finished.');
        });

    } catch (err) {
        console.error('❌ Test Failed:', err.response?.data || err.message);
    }
}

testChat();

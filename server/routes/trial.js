const express = require('express');
const router = express.Router();

module.exports = (authenticateToken, checkDatabaseConnection, groqAxios) => {

    router.post('/simulate-trial', authenticateToken, checkDatabaseConnection, async (req, res) => {
        try {
            const { description, evidence_files } = req.body;
            if (!description) return res.status(400).json({ error: 'Description required' });

            const GROQ_API_KEY = process.env.GROQ_API_KEY;
            if (!GROQ_API_KEY) return res.status(500).json({ error: 'AI key missing' });

            const systemPrompt = `You are a legal AI system simulating a mini-trial...`;
            const userPrompt = `Case Description: ${description}...`;

            const response = await groqAxios.post('/chat/completions', {
                model: process.env.GROQ_MODEL_NAME || 'llama-3.3-70b-versatile',
                messages: [
                    {
                        role: 'system',
                        content: `You are a high-stakes AI Judge and Legal Strategist for the Indian Legal System. 
                        User will provide a case description and evidence.
                        You must output a JSON object with these exact keys:
                        {
                            "petitioner_argument": "Strongest legal points for the petitioner (bullet points)",
                            "respondent_argument": "Strongest counter-arguments/risks (bullet points)",
                            "judge_verdict": "A concise, decisive verdict based on Indian Law.",
                            "win_probability": 85,
                            "critical_warning": "Any major legal loophole or risk."
                        }
                        Do not include markdown formatting, just raw JSON.`
                    },
                    { role: 'user', content: `Case Description: ${description}\nEvidence: ${evidence_files?.join(', ') || 'None'}` }
                ],
                temperature: 0.5,
                response_format: { type: "json_object" }
            }, {
                headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` }
            });

            console.log('✅ Trial Simulation Success');
            res.json(JSON.parse(response.data.choices[0].message.content));
        } catch (err) {
            console.error('❌ Trial Error:', err.message);
            if (err.response) console.error('📦 API Error Data:', JSON.stringify(err.response.data, null, 2));
            res.status(500).json({ error: 'Trial simulation failed', details: err.message });
        }
    });

    return router;
};

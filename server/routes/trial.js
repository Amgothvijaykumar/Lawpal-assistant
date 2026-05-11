const express = require('express');
const router = express.Router();
const axios = require('axios');

module.exports = (authenticateToken, checkDatabaseConnection, groqAxios) => {

    router.post('/simulate-trial', authenticateToken, checkDatabaseConnection, async (req, res) => {
        try {
            const { description, evidence_files } = req.body;
            if (!description) return res.status(400).json({ error: 'Description required' });

            const FLASK_URL = process.env.FLASK_BACKEND_URL;
            if (!FLASK_URL) return res.status(500).json({ error: 'Flask backend not configured' });

            const prompt = `You are a high-stakes AI Judge and Legal Strategist for the Indian Legal System. 
            User will provide a case description and evidence.
            
            Case Description: ${description}
            Evidence: ${evidence_files?.join(', ') || 'None'}

            You must output a VALID JSON object with these exact keys:
            {
                "petitioner_argument": "Strongest legal points for the petitioner (bullet points)",
                "respondent_argument": "Strongest counter-arguments/risks (bullet points)",
                "judge_verdict": "A concise, decisive verdict based on Indian Law.",
                "win_probability": 85,
                "critical_warning": "Any major legal loophole or risk."
            }
            Do not include markdown formatting, markdown code blocks, or any other text. JUST THE RAW JSON.`;

            console.log(`----------------------------------------------------------------`);
            console.log(`⚖️  SIMULATING TRIAL VIA FLASK(${FLASK_URL})`);
            console.log(`----------------------------------------------------------------`);

            const flaskResponse = await axios.post(`${FLASK_URL}/ask`, { query: prompt }, { timeout: 30000 });

            let answer = flaskResponse.data.answer || "{}";
            // Clean up potentially messy response
            answer = answer.replace(/Note: Some cited items may be unrelated[\s\S]*?ignored\./gi, '').trim();
            // Try to extract JSON if wrapped in markdown
            const jsonMatch = answer.match(/\{[\s\S]*\}/);
            if (jsonMatch) answer = jsonMatch[0];

            let result;
            try {
                result = JSON.parse(answer);
            } catch (e) {
                console.error("Failed to parse JSON from Flask:", answer);
                // Fallback structure if parsing fails
                result = {
                    petitioner_argument: "Could not generate arguments.",
                    respondent_argument: "Could not generate arguments.",
                    judge_verdict: "Trial simulation inconclusive due to AI format error.",
                    win_probability: 0,
                    critical_warning: "AI response was not valid JSON."
                };
            }

            console.log('✅ Trial Simulation Success');
            res.json(result);
        } catch (err) {
            console.error('❌ Trial Error:', err.message);
            res.status(500).json({ error: 'Trial simulation failed', details: err.message });
        }
    });

    return router;
};

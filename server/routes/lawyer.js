const express = require('express');
const router = express.Router();
const Lawyer = require('../models/Lawyer');
const { validateObjectId } = require('../middleware/validator');

module.exports = (authenticateToken, checkDatabaseConnection) => {

    // Get All Lawyers
    router.get('/', authenticateToken, checkDatabaseConnection, async (req, res) => {
        try {
            const lawyers = await Lawyer.find({ activeStatus: true })
                .sort({ 'rating.averageRating': -1 })
                .limit(20)
                .lean();

            if (!lawyers || lawyers.length === 0) {
                return res.status(404).json({ error: 'No lawyers found' });
            }

            const normalized = lawyers.map(l => ({
                _id: l._id,
                fullName: l.fullName,
                primaryPracticeArea: l.primaryPracticeArea,
                rating: l.rating?.averageRating || 4.5,
                experience: l.yearsOfExperience || 5,
                available: l.activeStatus,
                avatar: l.avatar || l.fullName?.[0],
                bio: l.bio
            }));

            res.json(normalized);
        } catch (err) {
            console.error('❌ Error:', err);
            res.status(500).json({ error: 'Failed to fetch lawyers' });
        }
    });

    // Ranked Lawyers
    router.post('/ranked', authenticateToken, checkDatabaseConnection, async (req, res) => {
        try {
            const { category, location = [78.4867, 17.3850] } = req.body;
            const lawyers = await Lawyer.find({ activeStatus: true }).limit(10).lean();

            // Re-using the Haversine logic from server.js
            const [userLng, userLat] = location;
            const results = lawyers.map(lawyer => {
                let dist = 5;
                if (lawyer.location?.coordinates?.coordinates) {
                    const [lawyerLng, lawyerLat] = lawyer.location.coordinates.coordinates;
                    const R = 6371;
                    const dLat = (lawyerLat - userLat) * Math.PI / 180;
                    const dLon = (lawyerLng - userLng) * Math.PI / 180;
                    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                        Math.cos(userLat * Math.PI / 180) * Math.cos(lawyerLat * Math.PI / 180) *
                        Math.sin(dLon / 2) * Math.sin(dLon / 2);
                    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                    dist = R * c;
                }

                const rating = lawyer.rating?.averageRating || 4.5;
                const experience = lawyer.yearsOfExperience || 5;

                return {
                    ...lawyer,
                    distanceValue: dist,
                    distance: `${dist.toFixed(1)} km`,
                    finalScore: Math.floor(70 + rating * 5 + experience * 0.5)
                };
            });

            results.sort((a, b) => b.finalScore - a.finalScore);
            res.json(results.slice(0, 3));
        } catch (err) {
            res.status(500).json({ error: 'Ranking failed' });
        }
    });

    // Check Bar ID
    router.get('/check-bar-id', authenticateToken, checkDatabaseConnection, async (req, res) => {
        try {
            const id = (req.query.id || '').trim().toUpperCase();
            if (!id) return res.status(400).json({ error: 'ID is required' });

            const lawyer = await Lawyer.findOne({
                barRegistrationNumber: { $regex: new RegExp(`^${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
            });

            res.json({
                exists: !!lawyer,
                verified: !lawyer,
                message: lawyer ? 'Already exists' : 'Available'
            });
        } catch (err) {
            res.status(500).json({ error: 'Verification failed' });
        }
    });

    return router;
};

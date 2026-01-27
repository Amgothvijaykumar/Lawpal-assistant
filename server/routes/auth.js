const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Lawyer = require('../models/Lawyer');
const mongoose = require('mongoose');

module.exports = (authenticateToken, checkDatabaseConnection) => {

    // Login
    router.post('/login', async (req, res) => {
        try {
            const { email, password } = req.body;
            const user = await User.findOne({ email });
            if (!user) return res.status(400).json({ error: 'User not found' });

            const isMatch = await user.comparePassword(password);
            if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

            const token = jwt.sign({ id: user._id.toString(), email: user.email, role: user.role }, process.env.JWT_SECRET);
            res.json({
                token,
                user: { id: user._id, email: user.email, displayName: user.displayName, role: user.role }
            });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // Register
    router.post('/register', async (req, res) => {
        try {
            const { email, password, displayName, role } = req.body;
            if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

            const existing = await User.findOne({ email });
            if (existing) return res.status(400).json({ error: 'Email already registered' });

            const user = new User({
                email,
                password,
                displayName: displayName || email.split('@')[0],
                role: role === 'lawyer' ? 'lawyer' : 'user'
            });

            await user.save();
            const token = jwt.sign({ id: user._id.toString(), email: user.email, role: user.role }, process.env.JWT_SECRET);
            res.status(201).json({ token, user: { id: user._id, email: user.email, displayName: user.displayName, role: user.role } });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // Get Profile
    router.get('/profile', authenticateToken, checkDatabaseConnection, async (req, res) => {
        try {
            const user = await User.findById(req.user.id).select('-password');
            if (!user) return res.status(404).json({ error: 'User not found' });

            const userData = user.toObject();
            if (user.role === 'lawyer') {
                const lawyer = await Lawyer.findOne({ userId: user._id });
                if (lawyer) userData.lawyerDetails = lawyer;
            }
            res.json(userData);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // Complete Profile
    router.patch('/profile/complete', authenticateToken, checkDatabaseConnection, async (req, res) => {
        try {
            const { details } = req.body;
            const user = await User.findById(req.user.id);
            if (!user) return res.status(404).json({ error: 'User not found' });

            if (user.role === 'lawyer' && details.barRegistrationNumber) {
                const conflict = await Lawyer.findOne({
                    barRegistrationNumber: { $regex: new RegExp(`^${details.barRegistrationNumber.trim().toUpperCase()}$`, 'i') },
                    userId: { $ne: user._id }
                });
                if (conflict) return res.status(400).json({ error: 'Bar ID already exists' });

                let lawyer = await Lawyer.findOne({ userId: user._id });
                if (lawyer) {
                    Object.assign(lawyer, details);
                    await lawyer.save();
                } else {
                    lawyer = new Lawyer({ userId: user._id, ...details, email: user.email });
                    await lawyer.save();
                }
            }

            if (details.displayName) user.displayName = details.displayName;
            user.profileCompleted = true;
            await user.save();

            res.json({ message: 'Profile completed', user });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    return router;
};

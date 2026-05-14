const express = require('express');
const router = express.Router();
const FirestoreDAO = require('../utils/firestore-dao');

// Faculty profiles stored in Firestore 'faculty-profiles' collection
// (replaces old fs-based JSON file which was wiped on every Render restart)
const facultyProfilesDAO = new FirestoreDAO('faculty-profiles');

// GET faculty profile
router.get('/profile/:email', async (req, res) => {
    try {
        const email = req.params.email;
        const profile = await facultyProfilesDAO.findById(email);

        if (profile) {
            res.json({ success: true, profile });
        } else {
            res.status(404).json({ success: false, message: 'Profile not found' });
        }
    } catch (error) {
        console.error('Error fetching faculty profile:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch profile' });
    }
});

// POST faculty profile (first time submission)
router.post('/profile', async (req, res) => {
    try {
        const profileData = req.body;
        const email = profileData.email;

        if (!email) {
            return res.status(400).json({ success: false, error: 'Email is required' });
        }

        // Check if profile already exists
        const existing = await facultyProfilesDAO.findById(email);
        if (existing && existing.profileCompleted) {
            return res.status(400).json({
                success: false,
                error: 'Profile already exists. Contact admin to update.'
            });
        }

        // Save profile to Firestore
        await facultyProfilesDAO.create({
            ...profileData,
            profileCompleted: true,
            completedAt: new Date().toISOString(),
            lastUpdatedBy: email,
            lastUpdatedAt: new Date().toISOString()
        }, email); // use email as document ID for easy lookup

        console.log(`\u2705 Faculty profile saved to Firestore for: ${email}`);
        res.json({ success: true, message: 'Profile submitted successfully' });
    } catch (error) {
        console.error('Error creating faculty profile:', error);
        res.status(500).json({ success: false, error: 'Failed to create profile' });
    }
});

// PUT faculty profile (admin update only)
router.put('/profile/:email', async (req, res) => {
    try {
        const email = req.params.email;
        const updates = req.body;
        const updatedBy = req.body.updatedBy || 'admin';

        const existing = await facultyProfilesDAO.findById(email);
        if (!existing) {
            return res.status(404).json({ success: false, error: 'Profile not found' });
        }

        await facultyProfilesDAO.update(email, {
            ...updates,
            lastUpdatedBy: updatedBy,
            lastUpdatedAt: new Date().toISOString()
        });

        console.log(`\u2705 Faculty profile updated in Firestore for: ${email} by ${updatedBy}`);
        res.json({ success: true, message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Error updating faculty profile:', error);
        res.status(500).json({ success: false, error: 'Failed to update profile' });
    }
});

module.exports = router;

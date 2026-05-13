const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const PROFILES_FILE = path.join(__dirname, '../data/faculty-profiles.json');

// Load profiles
const loadProfiles = () => {
    try {
        if (fs.existsSync(PROFILES_FILE)) {
            const data = fs.readFileSync(PROFILES_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading faculty profiles:', error);
    }
    return {};
};

// Save profiles
const saveProfiles = (profiles) => {
    try {
        fs.writeFileSync(PROFILES_FILE, JSON.stringify(profiles, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving faculty profiles:', error);
        return false;
    }
};

// GET faculty profile
router.get('/profile/:email', (req, res) => {
    try {
        const email = req.params.email;
        const profiles = loadProfiles();
        const profile = profiles[email];

        if (profile) {
            res.json({
                success: true,
                profile: profile
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'Profile not found'
            });
        }
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch profile'
        });
    }
});

// POST faculty profile (first time submission)
router.post('/profile', (req, res) => {
    try {
        const profileData = req.body;
        const email = profileData.email;

        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email is required'
            });
        }

        const profiles = loadProfiles();

        // Check if profile already exists
        if (profiles[email] && profiles[email].profileCompleted) {
            return res.status(400).json({
                success: false,
                error: 'Profile already exists. Contact admin to update.'
            });
        }

        // Save profile
        profiles[email] = {
            ...profileData,
            profileCompleted: true,
            completedAt: new Date().toISOString(),
            lastUpdatedBy: email,
            lastUpdatedAt: new Date().toISOString()
        };

        if (saveProfiles(profiles)) {
            console.log(`✅ Faculty profile created for: ${email}`);
            res.json({
                success: true,
                message: 'Profile submitted successfully'
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to save profile'
            });
        }
    } catch (error) {
        console.error('Error creating profile:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create profile'
        });
    }
});

// PUT faculty profile (admin update only)
router.put('/profile/:email', (req, res) => {
    try {
        const email = req.params.email;
        const updates = req.body;
        const updatedBy = req.body.updatedBy || 'admin';

        const profiles = loadProfiles();

        if (!profiles[email]) {
            return res.status(404).json({
                success: false,
                error: 'Profile not found'
            });
        }

        // Update profile
        profiles[email] = {
            ...profiles[email],
            ...updates,
            lastUpdatedBy: updatedBy,
            lastUpdatedAt: new Date().toISOString()
        };

        if (saveProfiles(profiles)) {
            console.log(`✅ Faculty profile updated for: ${email} by ${updatedBy}`);
            res.json({
                success: true,
                message: 'Profile updated successfully'
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to update profile'
            });
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update profile'
        });
    }
});

module.exports = router;

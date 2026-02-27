const express = require('express');
const sessionManager = require('../utils/sharedSessionManager');
const bcrypt = require('bcryptjs');
const firestoreService = require('../utils/firestore-service');

const router = express.Router();


// Middleware to validate email domain
const validateEmailDomain = (req, res, next) => {
    const { email } = req.body;
    if (!email || !email.endsWith('@gmcpnalanda.com')) {
        return res.status(400).json({
            success: false,
            error: 'Only @gmcpnalanda.com email addresses are allowed'
        });
    }
    next();
};

// Middleware to validate session token
const validateSession = (req, res, next) => {
    const sessionToken = req.headers['authorization']?.replace('Bearer ', '') || 
                        req.cookies?.sessionToken || 
                        req.body.sessionToken;
    
    if (!sessionToken) {
        return res.status(401).json({
            success: false,
            error: 'No session token provided'
        });
    }

    const validation = sessionManager.validateSession(sessionToken);
    if (!validation.valid) {
        return res.status(401).json({
            success: false,
            error: validation.error || 'Invalid session'
        });
    }

    req.session = validation.session;
    req.user = validation.userData;
    next();
};

// Login endpoint - supports email, studentId, or employeeId
router.post('/login', async (req, res) => {
    try {
        const { email, password, forceLogin = false } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email/ID and password are required'
            });
        }

        // Get user from Firestore - try email first, then search by ID
        let user = null;
        let userEmail = email;
        
        // Check if input looks like an email
        if (email.includes('@')) {
            // Try email login
            user = await firestoreService.getUser(email);
        } else {
            // Try to find user by Student ID or Employee ID
            const allUsers = await firestoreService.getAllUsers();
            user = allUsers.find(u => 
                u.studentId === email || 
                u.employeeId === email ||
                u.rollNumber === email
            );
            
            if (user) {
                userEmail = user.email; // Use the user's email for further operations
            }
        }
        
        // Authenticate user
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'No account found with this email/ID'
            });
        }
        
        // Verify password using bcrypt
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                error: 'Incorrect password'
            });
        }
        
        if (user.status !== 'active') {
            return res.status(401).json({
                success: false,
                error: 'Your account is inactive. Please contact administrator'
            });
        }
        
        // Update last login in Firestore
        await firestoreService.updateUser(userEmail, { lastLogin: new Date().toISOString() });
        
        // Prepare user data (remove password)
        const userData = { ...user };
        delete userData.password;

        // Determine portal type from referrer or user agent
        const referrer = req.headers.referer || '';
        const userAgent = req.headers['user-agent'] || '';
        let portalType = 'default';
        
        if (referrer.includes('admin-portal') || referrer.includes('admin')) {
            portalType = 'admin';
        } else if (referrer.includes('student-portal') || referrer.includes('student')) {
            portalType = 'student';
        } else if (referrer.includes('faculty-portal') || referrer.includes('faculty')) {
            portalType = 'faculty';
        } else if (referrer.includes('management-portal') || referrer.includes('management')) {
            portalType = 'management';
        }
        
        // Create session
        const sessionResult = sessionManager.createSession(email, userData, {
            forceLogin: forceLogin,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: userAgent,
            portalType: portalType,
            autoCleanup: true // Automatically clean old sessions if needed
        });

        if (!sessionResult.success) {
            // Handle session limit cases
            if (sessionResult.code === 'DUPLICATE_SESSION' || sessionResult.code === 'MAX_SESSIONS_REACHED') {
                return res.status(409).json({
                    success: false,
                    error: sessionResult.error,
                    code: sessionResult.code,
                    // Provide option for force login
                    canForceLogin: true
                });
            }
            
            return res.status(500).json({
                success: false,
                error: sessionResult.error
            });
        }

        // Set session cookie
        res.cookie('sessionToken', sessionResult.sessionId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            sameSite: 'lax' // Allow cookie on same-site redirects
        });

        console.log(`✅ User logged in: ${userData.name} (${userData.role}) from ${req.ip}`);

        res.json({
            success: true,
            message: 'Login successful',
            user: sessionResult.userData,
            sessionId: sessionResult.sessionId,
            expiresAt: sessionResult.expiresAt,
            redirectUrl: getPortalUrl(userData.role),
            requirePasswordReset: user.mustChangePassword || false
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// Force login endpoint (for duplicate sessions)
router.post('/force-login', validateEmailDomain, async (req, res) => {
    // Set forceLogin to true and use the same logic as login
    req.body.forceLogin = true;
    return router.stack.find(layer => layer.route?.path === '/login').route.stack[1].handle(req, res);
});

// Logout endpoint (logout from current session only)
router.post('/logout', validateSession, (req, res) => {
    try {
        const sessionId = req.session.sessionId;
        const userEmail = req.user.email;
        const portalType = req.session.portalType || 'default';
        
        const result = sessionManager.logoutUserFromSession(sessionId);
        
        // Clear session cookie
        res.clearCookie('sessionToken');
        
        console.log(`👋 User logged out from ${portalType} portal: ${userEmail}`);
        
        res.json({
            success: true,
            message: `Logout successful from ${portalType} portal`,
            remainingSessions: sessionManager.getUserSessions(userEmail).length
        });
        
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            error: 'Logout failed'
        });
    }
});

// Logout from all sessions endpoint
router.post('/logout-all', validateSession, (req, res) => {
    try {
        const userEmail = req.user.email;
        
        const result = sessionManager.logoutUser(userEmail);
        
        // Clear session cookie
        res.clearCookie('sessionToken');
        
        console.log(`👋 User logged out from ALL sessions: ${userEmail}`);
        
        res.json({
            success: true,
            message: result.message || 'Logged out from all sessions'
        });
        
    } catch (error) {
        console.error('Logout all error:', error);
        res.status(500).json({
            success: false,
            error: 'Logout failed'
        });
    }
});

// Check session endpoint (alias for validate)
router.get('/check', validateSession, async (req, res) => {
    try {
        // Fetch fresh user data from Firestore
        const freshUserData = await firestoreService.getUser(req.user.email);
        
        if (!freshUserData) {
            return res.status(401).json({
                success: false,
                error: 'User not found'
            });
        }
        
        // Remove password from response
        const userForResponse = { ...freshUserData };
        delete userForResponse.password;
        
        res.json({
            success: true,
            authenticated: true,
            user: userForResponse,
            session: {
                sessionId: req.session.sessionId,
                createdAt: req.session.createdAt,
                expiresAt: req.session.expiresAt,
                lastAccessedAt: req.session.lastAccessedAt
            }
        });
    } catch (error) {
        console.error('Auth check error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// Validate session endpoint
router.get('/validate', validateSession, (req, res) => {
    res.json({
        success: true,
        valid: true,
        user: req.user,
        session: {
            sessionId: req.session.sessionId,
            createdAt: req.session.createdAt,
            expiresAt: req.session.expiresAt,
            lastAccessedAt: req.session.lastAccessedAt
        }
    });
});

// Extend session endpoint
router.post('/extend-session', validateSession, (req, res) => {
    try {
        const { extensionTime } = req.body; // Optional custom extension time
        const result = sessionManager.extendSession(req.session.sessionId, extensionTime);
        
        if (result.success) {
            res.json({
                success: true,
                message: 'Session extended successfully',
                newExpiryTime: result.newExpiryTime
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        console.error('Session extension error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to extend session'
        });
    }
});

// Admin: Get active sessions
router.get('/admin/sessions', validateSession, (req, res) => {
    // Check if user is admin
    if (req.user.role !== 'admin' && req.user.role !== 'management') {
        return res.status(403).json({
            success: false,
            error: 'Access denied. Admin privileges required.'
        });
    }
    
    try {
        const activeSessions = sessionManager.getActiveSessions();
        const stats = sessionManager.getSessionStats();
        
        res.json({
            success: true,
            sessions: activeSessions,
            stats: stats
        });
    } catch (error) {
        console.error('Get sessions error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch sessions'
        });
    }
});

// Admin: Force logout user
router.post('/admin/force-logout', validateSession, (req, res) => {
    // Check if user is admin
    if (req.user.role !== 'admin' && req.user.role !== 'management') {
        return res.status(403).json({
            success: false,
            error: 'Access denied. Admin privileges required.'
        });
    }
    
    try {
        const { userEmail } = req.body;
        
        if (!userEmail) {
            return res.status(400).json({
                success: false,
                error: 'User email is required'
            });
        }
        
        const result = sessionManager.forceLogoutUser(userEmail);
        
        res.json({
            success: result.success,
            message: result.success ? 
                `User ${userEmail} has been logged out` : 
                result.error
        });
    } catch (error) {
        console.error('Force logout error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to force logout user'
        });
    }
});

// Admin: Cleanup expired sessions
router.post('/admin/cleanup-sessions', validateSession, (req, res) => {
    // Check if user is admin
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            error: 'Access denied. Admin privileges required.'
        });
    }
    
    try {
        const cleanedCount = sessionManager.cleanupExpiredSessions();
        
        res.json({
            success: true,
            message: `Cleaned up ${cleanedCount} expired sessions`
        });
    } catch (error) {
        console.error('Cleanup sessions error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to cleanup sessions'
        });
    }
});

// Helper function to get portal URL based on role
function getPortalUrl(role) {
    const portals = {
        'admin': 'admin-portal.html',
        'management': 'management-portal.html', 
        'teacher': 'faculty-portal.html',
        'student': 'student-portal.html'
    };
    return portals[role] || 'login.html';
}

module.exports = router;
module.exports.sessionManager = sessionManager;

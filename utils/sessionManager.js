// Session Manager for GMCP LMS
// Handles concurrent user sessions while preventing duplicate logins for same user

class SessionManager {
    constructor() {
        // In-memory session store (in production, use Redis or database)
        this.sessions = new Map();
        this.userSessions = new Map(); // userId -> Array of sessionIds mapping
        this.sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours
        this.maxSessionsPerUser = 5; // Allow multiple concurrent sessions
        
        // Start cleanup interval
        this.startCleanupInterval();
    }

    // Generate a secure session token
    generateSessionToken() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 15);
        const extra = Math.random().toString(36).substr(2, 10);
        return `${timestamp}_${random}_${extra}`;
    }

    // Create new session
    createSession(userEmail, userData, options = {}) {
        try {
            // Get existing sessions for user
            const existingSessions = this.userSessions.get(userEmail) || [];
            
            // Clean up expired sessions first
            const activeSessions = existingSessions.filter(sessionId => {
                const session = this.sessions.get(sessionId);
                if (!session || new Date() > new Date(session.expiresAt)) {
                    this.sessions.delete(sessionId);
                    return false;
                }
                return true;
            });
            
            // Check if user has too many active sessions
            if (activeSessions.length >= this.maxSessionsPerUser && !options.forceLogin) {
                // Optionally remove oldest session automatically
                if (options.autoCleanup !== false) {
                    const oldestSessionId = activeSessions[0]; // First one is oldest
                    this.destroySession(oldestSessionId);
                    console.log(`🧹 Automatically removed oldest session for user: ${userEmail}`);
                } else {
                    return {
                        success: false,
                        error: `Maximum ${this.maxSessionsPerUser} concurrent sessions reached. Please logout from other devices.`,
                        code: 'MAX_SESSIONS_REACHED'
                    };
                }
            }

            // Create new session
            const sessionId = this.generateSessionToken();
            const session = {
                sessionId: sessionId,
                userEmail: userEmail,
                userData: { ...userData }, // Clone to avoid reference issues
                createdAt: new Date().toISOString(),
                lastAccessedAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + this.sessionTimeout).toISOString(),
                ipAddress: options.ipAddress || null,
                userAgent: options.userAgent || null,
                portalType: options.portalType || 'default', // Track which portal this session is for
                isActive: true
            };

            // Store session
            this.sessions.set(sessionId, session);
            
            // Add to user's sessions array
            const updatedSessions = [...(this.userSessions.get(userEmail) || []), sessionId];
            this.userSessions.set(userEmail, updatedSessions);

            console.log(`✅ Session created for user: ${userEmail} (Portal: ${session.portalType}, Session: ${sessionId.substr(0, 8)}...)`);

            return {
                success: true,
                sessionId: sessionId,
                expiresAt: session.expiresAt,
                userData: session.userData
            };

        } catch (error) {
            console.error('Error creating session:', error);
            return {
                success: false,
                error: 'Failed to create session'
            };
        }
    }

    // Validate session
    validateSession(sessionId) {
        try {
            const session = this.sessions.get(sessionId);
            
            if (!session) {
                return {
                    valid: false,
                    error: 'Session not found'
                };
            }

            // Check if session is expired
            if (new Date() > new Date(session.expiresAt)) {
                this.destroySession(sessionId);
                return {
                    valid: false,
                    error: 'Session expired'
                };
            }

            // Update last accessed time
            session.lastAccessedAt = new Date().toISOString();
            this.sessions.set(sessionId, session);

            return {
                valid: true,
                session: session,
                userData: session.userData
            };

        } catch (error) {
            console.error('Error validating session:', error);
            return {
                valid: false,
                error: 'Session validation failed'
            };
        }
    }

    // Destroy session
    destroySession(sessionId) {
        try {
            const session = this.sessions.get(sessionId);
            if (session) {
                // Remove from user sessions array
                const userSessions = this.userSessions.get(session.userEmail) || [];
                const updatedSessions = userSessions.filter(id => id !== sessionId);
                
                if (updatedSessions.length > 0) {
                    this.userSessions.set(session.userEmail, updatedSessions);
                } else {
                    this.userSessions.delete(session.userEmail);
                }
                
                // Remove session
                this.sessions.delete(sessionId);
                
                console.log(`🗑️  Session destroyed for user: ${session.userEmail} (Portal: ${session.portalType}, Session: ${sessionId.substr(0, 8)}...)`);
                
                return { success: true };
            }
            
            return { success: false, error: 'Session not found' };
        } catch (error) {
            console.error('Error destroying session:', error);
            return { success: false, error: 'Failed to destroy session' };
        }
    }

    // Logout user (destroy all their sessions)
    logoutUser(userEmail) {
        try {
            const sessionIds = this.userSessions.get(userEmail) || [];
            let successCount = 0;
            
            for (const sessionId of sessionIds) {
                const result = this.destroySession(sessionId);
                if (result.success) successCount++;
            }
            
            return { 
                success: true,
                message: `Logged out from ${successCount} session(s)`
            };
        } catch (error) {
            console.error('Error logging out user:', error);
            return { success: false, error: 'Logout failed' };
        }
    }
    
    // Logout user from specific session only
    logoutUserFromSession(sessionId) {
        try {
            return this.destroySession(sessionId);
        } catch (error) {
            console.error('Error logging out user from session:', error);
            return { success: false, error: 'Logout failed' };
        }
    }

    // Get active sessions
    getActiveSessions() {
        const activeSessions = [];
        for (const [sessionId, session] of this.sessions.entries()) {
            if (session.isActive && new Date() <= new Date(session.expiresAt)) {
                activeSessions.push({
                    sessionId: sessionId,
                    userEmail: session.userEmail,
                    userName: session.userData.name,
                    userRole: session.userData.role,
                    createdAt: session.createdAt,
                    lastAccessedAt: session.lastAccessedAt,
                    expiresAt: session.expiresAt,
                    ipAddress: session.ipAddress,
                    userAgent: session.userAgent
                });
            }
        }
        return activeSessions;
    }

    // Get session count by user
    getSessionStats() {
        const stats = {
            totalSessions: this.sessions.size,
            activeSessions: 0,
            expiredSessions: 0,
            userStats: {},
            byRole: {
                admin: 0,
                management: 0,
                teacher: 0,
                student: 0
            }
        };

        const now = new Date();
        
        for (const [sessionId, session] of this.sessions.entries()) {
            if (now <= new Date(session.expiresAt)) {
                stats.activeSessions++;
                
                // Count by role
                const role = session.userData.role;
                if (stats.byRole[role] !== undefined) {
                    stats.byRole[role]++;
                }
                
                // Count by user
                if (!stats.userStats[session.userEmail]) {
                    stats.userStats[session.userEmail] = {
                        name: session.userData.name,
                        role: session.userData.role,
                        sessionCount: 0
                    };
                }
                stats.userStats[session.userEmail].sessionCount++;
            } else {
                stats.expiredSessions++;
            }
        }

        return stats;
    }

    // Cleanup expired sessions
    cleanupExpiredSessions() {
        let cleanedCount = 0;
        const now = new Date();
        
        for (const [sessionId, session] of this.sessions.entries()) {
            if (now > new Date(session.expiresAt)) {
                this.destroySession(sessionId);
                cleanedCount++;
            }
        }
        
        if (cleanedCount > 0) {
            console.log(`🧹 Cleaned up ${cleanedCount} expired sessions`);
        }
        
        return cleanedCount;
    }

    // Start periodic cleanup
    startCleanupInterval() {
        // Run cleanup every hour
        setInterval(() => {
            this.cleanupExpiredSessions();
        }, 60 * 60 * 1000);
        
        console.log('🕒 Session cleanup interval started (every hour)');
    }

    // Force logout all sessions for a user (admin function)
    forceLogoutUser(userEmail) {
        try {
            const sessionId = this.userSessions.get(userEmail);
            if (sessionId) {
                const result = this.destroySession(sessionId);
                console.log(`👮 Admin forced logout for user: ${userEmail}`);
                return result;
            }
            return { success: true, message: 'User was not logged in' };
        } catch (error) {
            console.error('Error in force logout:', error);
            return { success: false, error: 'Force logout failed' };
        }
    }

    // Extend session expiry
    extendSession(sessionId, extensionTime = null) {
        try {
            const session = this.sessions.get(sessionId);
            if (!session) {
                return { success: false, error: 'Session not found' };
            }

            const extension = extensionTime || this.sessionTimeout;
            session.expiresAt = new Date(Date.now() + extension).toISOString();
            this.sessions.set(sessionId, session);

            return { 
                success: true, 
                newExpiryTime: session.expiresAt 
            };
        } catch (error) {
            console.error('Error extending session:', error);
            return { success: false, error: 'Failed to extend session' };
        }
    }

    // Check if user is currently logged in (has any active sessions)
    isUserLoggedIn(userEmail) {
        const sessionIds = this.userSessions.get(userEmail) || [];
        
        for (const sessionId of sessionIds) {
            const validation = this.validateSession(sessionId);
            if (validation.valid) return true;
        }
        
        return false;
    }

    // Get user's most recent active session info
    getUserSession(userEmail) {
        const sessionIds = this.userSessions.get(userEmail) || [];
        
        // Return the most recent valid session
        for (let i = sessionIds.length - 1; i >= 0; i--) {
            const validation = this.validateSession(sessionIds[i]);
            if (validation.valid) return validation.session;
        }
        
        return null;
    }
    
    // Get all active sessions for a user
    getUserSessions(userEmail) {
        const sessionIds = this.userSessions.get(userEmail) || [];
        const activeSessions = [];
        
        for (const sessionId of sessionIds) {
            const validation = this.validateSession(sessionId);
            if (validation.valid) {
                activeSessions.push(validation.session);
            }
        }
        
        return activeSessions;
    }
}

module.exports = SessionManager;

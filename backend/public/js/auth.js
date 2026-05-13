// Shared Authentication Utilities for GMCP LMS
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        // Load session data from localStorage on initialization
        const sessionData = localStorage.getItem('gmcp_lms_user');
        if (sessionData) {
            try {
                const data = JSON.parse(sessionData);
                // Check if it's new format with session info
                if (data.user && data.sessionId) {
                    // Check if session is expired
                    if (new Date() < new Date(data.expiresAt)) {
                        this.currentUser = data.user;
                    } else {
                        // Session expired, clear it
                        localStorage.removeItem('gmcp_lms_user');
                    }
                } else {
                    // Old format or invalid, clear it
                    localStorage.removeItem('gmcp_lms_user');
                }
            } catch (e) {
                localStorage.removeItem('gmcp_lms_user');
            }
        }
    }

    // Validate email domain
    isValidEmail(email) {
        if (!email) return false;
        return email.endsWith('@gmcpnalanda.com');
    }

    // Initialize user manager (will be loaded from userManager.js)
    getUserManager() {
        return window.userManager;
    }

    // Login function
    async login(email, password, forceLogin = false) {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    email, 
                    password, 
                    forceLogin 
                }),
                credentials: 'include'
            });

            const result = await response.json();
            
            if (result.success) {
                // Store user data and session info
                this.currentUser = result.user;
                localStorage.setItem('gmcp_lms_user', JSON.stringify({
                    user: result.user,
                    sessionId: result.sessionId || 'temp_session',
                    expiresAt: result.expiresAt || new Date(Date.now() + 24*60*60*1000).toISOString() // 24 hours from now
                }));
                
                // Add redirect URL based on user role
                result.redirectUrl = this.getPortalUrl(result.user.role);
                
                // Pass through requirePasswordReset flag
                result.requirePasswordReset = result.requirePasswordReset;
            } else if (result.code === 'DUPLICATE_SESSION') {
                // Handle duplicate session - offer force login option
                result.canForceLogin = true;
            }

            return result;

        } catch (error) {
            return {
                success: false,
                error: 'Network error. Please check your connection and try again.'
            };
        }
    }

    // Force login function (for handling duplicate sessions)
    async forceLogin(email, password) {
        return this.login(email, password, true);
    }

    // Validate current session with server
    async validateSession() {
        try {
            const response = await fetch('/api/auth/check', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            const result = await response.json();
            
            if (result.authenticated && result.user) {
                // Update current user data
                this.currentUser = result.user;
                
                // Update localStorage with fresh session info
                const sessionData = localStorage.getItem('gmcp_lms_user');
                if (sessionData) {
                    const data = JSON.parse(sessionData);
                    data.user = result.user;
                    // Update session info if available
                    if (result.session) {
                        data.sessionId = result.session.sessionId;
                        data.expiresAt = result.session.expiresAt;
                        data.portalType = result.session.portalType || 'default';
                    }
                    localStorage.setItem('gmcp_lms_user', JSON.stringify(data));
                }
                
                return true;
            } else {
                // Session invalid for this portal, but don't logout completely
                // Just clear current user for this portal
                this.currentUser = null;
                return false;
            }
        } catch (error) {
            console.error('Session validation error:', error);
            return false;
        }
    }

    // Extend current session
    async extendSession() {
        try {
            const response = await fetch('/api/auth/extend-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();
            
            if (result.success) {
                // Update expiry time in localStorage
                const sessionData = localStorage.getItem('gmcp_lms_user');
                if (sessionData) {
                    const data = JSON.parse(sessionData);
                    data.expiresAt = result.newExpiryTime;
                    localStorage.setItem('gmcp_lms_user', JSON.stringify(data));
                }
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Session extension error:', error);
            return false;
        }
    }

    // Get portal URL based on role
    getPortalUrl(role) {
        const portals = {
            'admin': 'admin-portal.html',
            'management': 'management-portal.html',
            'teacher': 'faculty-portal.html',
            'student': 'student-portal.html'
        };
        return portals[role] || 'login.html';
    }

    // Logout function (logout from current portal only)
    async logout(logoutAll = false) {
        try {
            // Choose endpoint based on whether to logout all sessions
            const endpoint = logoutAll ? '/api/auth/logout-all' : '/api/auth/logout';
            
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });
            
            const result = await response.json();
            
            if (result.success) {
                console.log('Logout response:', result.message);
                if (result.remainingSessions && result.remainingSessions > 0 && !logoutAll) {
                    console.log(`User still has ${result.remainingSessions} active session(s) in other portals`);
                }
            }
        } catch (error) {
            console.error('Logout API error:', error);
        } finally {
            // Clear current user and redirect (but keep localStorage for other portals unless logging out all)
            this.currentUser = null;
            
            if (logoutAll) {
                localStorage.removeItem('gmcp_lms_user');
            }
            
            window.location.href = '/';
        }
    }
    
    // Logout from all portals/sessions
    async logoutAll() {
        return this.logout(true);
    }

    // Check if user is logged in
    isLoggedIn() {
        return this.currentUser !== null;
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }

    // Check user role
    hasRole(role) {
        return this.currentUser && this.currentUser.role === role;
    }

    // Check multiple roles
    hasAnyRole(roles) {
        return this.currentUser && roles.includes(this.currentUser.role);
    }

    // Require authentication
    requireAuth() {
        if (!this.isLoggedIn()) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }

    // Require specific role
    requireRole(role) {
        if (!this.requireAuth()) return false;
        if (!this.hasRole(role)) {
            alert('Access denied. Insufficient privileges.');
            this.logout();
            return false;
        }
        return true;
    }

    // Require any of the specified roles
    requireAnyRole(roles) {
        if (!this.requireAuth()) return false;
        if (!this.hasAnyRole(roles)) {
            alert('Access denied. Insufficient privileges.');
            this.logout();
            return false;
        }
        return true;
    }

    // Update profile (would sync with Firebase in production)
    async updateProfile(updates) {
        try {
            if (!this.currentUser) {
                throw new Error('Not logged in');
            }

            // Update current user data
            this.currentUser = { ...this.currentUser, ...updates };
            
            // Save to localStorage
            localStorage.setItem('gmcp_lms_user', JSON.stringify(this.currentUser));

            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Change password (would use Firebase in production)
    async changePassword(currentPassword, newPassword) {
        try {
            if (!this.currentUser) {
                throw new Error('Not logged in');
            }

            // In production, this would validate with Firebase
            const testUsers = this.getTestUsers();
            const user = testUsers[this.currentUser.email];
            
            if (!user || user.password !== currentPassword) {
                throw new Error('Current password is incorrect');
            }

            // Password validation
            if (newPassword.length < 8) {
                throw new Error('New password must be at least 8 characters long');
            }

            // In production, update in Firebase
            // For now, we'll just return success
            return { success: true, message: 'Password updated successfully' };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

// Utility functions
const authManager = new AuthManager();

// Show loading spinner
function showLoading(element, text = 'Loading...') {
    if (element) {
        element.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                <div style="width: 20px; height: 20px; border: 2px solid #f3f3f3; border-top: 2px solid #667eea; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                ${text}
            </div>
        `;
        element.disabled = true;
    }
}

// Hide loading spinner
function hideLoading(element, originalText) {
    if (element) {
        element.innerHTML = originalText;
        element.disabled = false;
    }
}

// Show message with different types
function showMessage(message, type = 'info', containerId = 'messageContainer') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const messageClass = {
        'error': 'error-message',
        'success': 'success-message',
        'info': 'info-message',
        'warning': 'warning-message'
    }[type] || 'info-message';

    container.innerHTML = `
        <div class="${messageClass} message" style="display: block;">
            ${message}
        </div>
    `;

    // Auto-hide after 5 seconds for non-error messages
    if (type !== 'error') {
        setTimeout(() => {
            if (container.innerHTML.includes(message)) {
                container.innerHTML = '';
            }
        }, 5000);
    }
}

// Format date
function formatDate(dateString) {
    const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString('en-IN', options);
}

// Format date (date only)
function formatDateOnly(dateString) {
    const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric'
    };
    return new Date(dateString).toLocaleDateString('en-IN', options);
}

// Generate random ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// CSS for spinner animation
const spinnerCSS = `
@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
`;

// Inject spinner CSS
if (!document.querySelector('#spinner-css')) {
    const style = document.createElement('style');
    style.id = 'spinner-css';
    style.textContent = spinnerCSS;
    document.head.appendChild(style);
}

// Export for use in other files
window.authManager = authManager;
window.showMessage = showMessage;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.formatDate = formatDate;
window.formatDateOnly = formatDateOnly;
window.generateId = generateId;

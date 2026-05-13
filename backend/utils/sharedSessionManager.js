// Shared SessionManager instance (Singleton pattern)
const SessionManager = require('./sessionManager');

// Create single instance
const sessionManagerInstance = new SessionManager();

// Export the same instance everywhere
module.exports = sessionManagerInstance;


const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const cookieParser = require('cookie-parser');
require('dotenv').config();

// Initialize Firebase
const { initializeFirebase } = require('./config/firebase-config');
initializeFirebase();

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const profileRoutes = require('./routes/profile');
const hostelRoutes = require('./routes/hostel');
const documentRoutes = require('./routes/documents');
const hostelIssuesRoutes = require('./routes/hostel-issues');
const notificationsRoutes = require('./routes/notifications');
const feedbackLinksRoutes = require('./routes/feedback-links');
const biometricRoutes = require('./routes/biometric');
const biometricSimpleRoutes = require('./routes/biometric-simple');
const adminRoutes = require('./routes/admin');
const facultyRoutes = require('./routes/faculty');
const attendanceRoutes = require('./routes/attendance');
const attendanceConfigRoutes = require('./routes/attendance-config');
const subjectsRoutes = require('./routes/subjects');

const app = express();
const PORT = process.env.PORT || 3000;

// SECURITY: Enforce strong JWT_SECRET
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
    console.error('\n❌ CRITICAL SECURITY ERROR: JWT_SECRET must be set in environment variables');
    console.error('   JWT_SECRET must be at least 32 characters long');
    console.error('   Generate one using: https://www.grc.com/passwords.htm');
    console.error('   Set it in your .env file or deployment platform environment variables\n');
    process.exit(1);
}

// Middleware - IMPORTANT: Must be before routes
// CRITICAL: Biometric text parser MUST come before JSON parser
// X2008 device sends text/plain data that must not be parsed as JSON
app.use('/api/biometric/iclock', express.text({ type: 'text/plain' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'https://www.gmcpnalanda.com',
    'https://gmcp-lms-frontend.onrender.com',
    'https://gmcp-lms-backend.onrender.com'
  ],
  credentials: true
}));
app.use(cookieParser());

// Add request logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`🔄 [${timestamp}] ${req.method} ${req.url}`);
    if (req.method === 'DELETE') {
        console.log(`🗑️  DELETE request detected: ${req.url}`);
    }
    next();
});

// Session middleware disabled - using custom session manager
// app.use(session({
//   secret: JWT_SECRET,
//   resave: false,
//   saveUninitialized: false,
//   cookie: { 
//     secure: process.env.NODE_ENV === 'production', 
//     maxAge: 24 * 60 * 60 * 1000 // 24 hours
//   }
// }));

// Authentication middleware for protected HTML files
const sessionManager = require('./utils/sharedSessionManager');

app.use((req, res, next) => {
  // ONLY protect these specific portal HTML files
  const protectedPortals = ['/admin-portal.html', '/faculty-portal.html', '/student-portal.html'];
  
  // If not requesting a protected portal, allow through
  if (!protectedPortals.includes(req.path)) {
    return next();
  }
  
  // Get session token from cookie
  const sessionToken = req.cookies?.sessionToken;
  
  console.log(`🔐 Protected portal access: ${req.path}`);
  console.log(`   Cookie: ${sessionToken ? 'Present' : 'Missing'}`);
  
  // No cookie = redirect to login
  if (!sessionToken) {
    const portalName = req.path.replace('/', '').replace('.html', '');
    console.log(`   ❌ No cookie - redirecting to login`);
    return res.redirect(`/login.html?redirect=${portalName}`);
  }
  
  // Validate session
  const validation = sessionManager.validateSession(sessionToken);
  console.log(`   Valid: ${validation.valid}, Role: ${validation.userData?.role}`);
  
  if (!validation.valid) {
    console.log(`   ❌ Invalid session`);
    return res.redirect('/login.html?error=session_expired');
  }
  
  // Check role-based access
  const userRole = validation.userData?.role;
  const allowAccess = (
    (req.path === '/admin-portal.html' && userRole === 'admin') ||
    (req.path === '/faculty-portal.html' && ['teacher', 'faculty', 'admin'].includes(userRole)) ||
    (req.path === '/student-portal.html' && ['student', 'admin'].includes(userRole))
  );
  
  if (!allowAccess) {
    const portalName = req.path.replace('/', '').replace('.html', '');
    console.log(`   ❌ Role '${userRole}' not allowed for ${req.path}`);
    return res.redirect(`/login.html?error=unauthorized&redirect=${portalName}`);
  }
  
  console.log(`   ✅ Access granted`);
  next();
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/hostel', hostelRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/hostel-issues', hostelIssuesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/feedback-links', feedbackLinksRoutes);
app.use('/api/biometric', biometricRoutes);
app.use('/api/biometric-simple', biometricSimpleRoutes);
// Route for X2008 device (it sends to /iclock/cdata.aspx)
app.use('/iclock', biometricSimpleRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/faculty', facultyRoutes);
// IMPORTANT: More specific routes must come BEFORE general routes
app.use('/api/attendance/subjects', subjectsRoutes);
app.use('/api/attendance', attendanceConfigRoutes);
app.use('/api/attendance', attendanceRoutes);


// Default route - serve single login portal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/login.html'));
});

// Redirect all login-related routes to main portal
app.get(['/login', '/login.html'], (req, res) => {
  res.redirect('/');
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'GMCP LMS Unified Portal'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

// 404 handler for non-API routes - serve login.html for SPA routing
app.use('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    console.log(`\u274c API route not found: ${req.method} ${req.path}`);
    res.status(404).json({ error: `API route not found: ${req.method} ${req.path}` });
  } else {
    res.sendFile(path.join(__dirname, 'public/login.html'));
  }
});


// Start server
app.listen(PORT, () => {
  console.log(`🚀 GMCP LMS Unified Portal running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Single Portal: http://localhost:${PORT}`);
  console.log(`📋 Setup Page: http://localhost:${PORT}/setup.html`);
  console.log(`🧪 Integration Test: http://localhost:${PORT}/test-integration.html`);
  console.log(`\n⚡ All login routes now redirect to main portal for simplicity`);
});

module.exports = app;

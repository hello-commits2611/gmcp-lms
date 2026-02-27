const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// Admin credentials (In production, store these in database)
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: '$2b$10$maFL1CWAtb.sIFL8l6grQuW4GelnQxx/zKmP9LyL8cgN9PQNqI4fi' // password: "password"
};

// Middleware to check if user is authenticated as admin
const authenticateAdmin = (req, res, next) => {
  if (req.session.isAdmin) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized access' });
  }
};

// Middleware to check if user is authenticated as student
const authenticateStudent = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]; // Bearer token
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role === 'student') {
      req.user = decoded;
      next();
    } else {
      res.status(403).json({ error: 'Student access required' });
    }
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Middleware to check if user is authenticated as faculty
const authenticateFaculty = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]; // Bearer token
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role === 'faculty') {
      req.user = decoded;
      next();
    } else {
      res.status(403).json({ error: 'Faculty access required' });
    }
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Middleware to check if user is authenticated (any role)
const authenticateUser = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]; // Bearer token
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Function to generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { 
      userId: user.id,
      email: user.email, 
      role: user.role,
      sinId: user.sinId 
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// Function to verify admin credentials
const verifyAdminCredentials = async (username, password) => {
  if (username === ADMIN_CREDENTIALS.username) {
    return await bcrypt.compare(password, ADMIN_CREDENTIALS.password);
  }
  return false;
};

module.exports = {
  authenticateAdmin,
  authenticateStudent,
  authenticateFaculty,
  authenticateUser,
  generateToken,
  verifyAdminCredentials,
  ADMIN_CREDENTIALS
};

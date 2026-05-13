const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
// Import the shared session manager
const { sessionManager } = require('./auth');

// Configure multer for profile picture uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/profiles');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// File paths
const PROFILES_FILE = path.join(__dirname, '../data/profiles.json');
const USERS_FILE = path.join(__dirname, '../data/users.json');

// Ensure data directory and files exist
const ensureDataFiles = () => {
  const dataDir = path.dirname(PROFILES_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  if (!fs.existsSync(PROFILES_FILE)) {
    fs.writeFileSync(PROFILES_FILE, '{}');
  }
  
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, '{}');
  }
};

// Helper functions
const loadProfiles = () => {
  ensureDataFiles();
  try {
    const data = fs.readFileSync(PROFILES_FILE, 'utf8');
    return JSON.parse(data) || {};
  } catch (error) {
    console.error('Error loading profiles:', error);
    return {};
  }
};

const saveProfiles = (profiles) => {
  try {
    fs.writeFileSync(PROFILES_FILE, JSON.stringify(profiles, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving profiles:', error);
    return false;
  }
};

const loadUsers = () => {
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(data) || {};
  } catch (error) {
    console.error('Error loading users:', error);
    return {};
  }
};

const saveUsers = (users) => {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving users:', error);
    return false;
  }
};

// Middleware to validate session token (same as auth routes)
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

// Admin-only middleware
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// GET /api/profile - Get current user's profile
router.get('/', validateSession, (req, res) => {
  try {
    const profiles = loadProfiles();
    const profile = profiles[req.user.email];
    
    if (!profile) {
      return res.json({ 
        exists: false, 
        message: 'Profile not found. Please complete your profile.' 
      });
    }
    
    res.json({ 
      exists: true, 
      profile: profile,
      editable: req.user.role === 'admin' // Only admin can edit after submission
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// GET /api/profile/status - Check if profile is complete
router.get('/status', validateSession, (req, res) => {
  try {
    console.log('📋 Profile status check for:', req.user.email);
    const profiles = loadProfiles();
    const profile = profiles[req.user.email];
    
    const isComplete = profile && profile.isComplete === true;
    
    console.log(`Profile complete: ${isComplete}, Has profile: ${!!profile}`);
    
    res.json({ 
      profileComplete: isComplete,
      hasProfile: !!profile,
      canAccessDashboard: isComplete
    });
  } catch (error) {
    console.error('Error checking profile status:', error);
    res.status(500).json({ 
      profileComplete: false,
      hasProfile: false,
      canAccessDashboard: false,
      error: 'Failed to check profile status' 
    });
  }
});

// POST /api/profile - Create or update profile (students can only create, admin can update)
router.post('/', validateSession, upload.single('profilePicture'), (req, res) => {
  try {
    console.log('📝 Profile submission received from:', req.user.email);
    console.log('📦 Request body keys:', Object.keys(req.body));
    console.log('🎓 Session field value:', req.body.session);
    console.log('📚 Course field value:', req.body.course);
    
    const profiles = loadProfiles();
    const existingProfile = profiles[req.user.email];
    
    // Check if user can modify profile
    if (existingProfile && existingProfile.isComplete && req.user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Profile already submitted. Only admin can make changes.' 
      });
    }
    
    const {
      studentName,
      studentId,
      admissionNumber,
      bloodGroup,
      gender,
      dateOfBirth,
      fatherName,
      motherName,
      studentContact,
      parentsContact,
      address,
      pincode,
      district,
      state,
      residenceType,
      currentSemester,
      session,
      course
    } = req.body;
    
    // Validation
    const requiredFields = {
      studentName: 'Student Name',
      studentId: 'Student ID',
      admissionNumber: 'Admission Number',
      bloodGroup: 'Blood Group',
      gender: 'Gender',
      dateOfBirth: 'Date of Birth',
      fatherName: "Father's Name",
      motherName: "Mother's Name",
      studentContact: 'Student Contact',
      parentsContact: 'Parents Contact',
      address: 'Address',
      pincode: 'Pincode',
      district: 'District',
      state: 'State',
      residenceType: 'Residence Type',
      currentSemester: 'Current Semester',
      session: 'Session',
      course: 'Course'
    };
    
    const missingFields = [];
    for (const [field, label] of Object.entries(requiredFields)) {
      if (!req.body[field] || req.body[field].trim() === '') {
        missingFields.push(label);
      }
    }
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        error: `Missing required fields: ${missingFields.join(', ')}` 
      });
    }
    
    // Validate phone numbers
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(studentContact)) {
      return res.status(400).json({ error: 'Invalid student contact number' });
    }
    
    if (!phoneRegex.test(parentsContact)) {
      return res.status(400).json({ error: 'Invalid parents contact number' });
    }
    
    // Validate pincode
    if (!/^\d{6}$/.test(pincode)) {
      return res.status(400).json({ error: 'Invalid pincode' });
    }
    
    // Validate residence type
    if (!['hosteller', 'day-boarder'].includes(residenceType)) {
      return res.status(400).json({ error: 'Invalid residence type' });
    }
    
    // Validate gender
    if (!['male', 'female', 'other'].includes(gender)) {
      return res.status(400).json({ error: 'Invalid gender selection' });
    }
    
    // Validate date of birth
    const dobDate = new Date(dateOfBirth);
    const today = new Date();
    const minDate = new Date('1990-01-01');
    const maxDate = new Date('2010-12-31');
    
    if (isNaN(dobDate.getTime()) || dobDate > today || dobDate < minDate || dobDate > maxDate) {
      return res.status(400).json({ error: 'Invalid date of birth. Must be between 1990 and 2010.' });
    }
    
    // Handle profile picture
    let profilePicture = existingProfile ? existingProfile.profilePicture : null;
    if (req.file) {
      profilePicture = `/uploads/profiles/${req.file.filename}`;
      
      // Delete old profile picture if it exists
      if (existingProfile && existingProfile.profilePicture) {
        const oldPicturePath = path.join(__dirname, '..', existingProfile.profilePicture);
        if (fs.existsSync(oldPicturePath)) {
          fs.unlinkSync(oldPicturePath);
        }
      }
    }
    
    // Create profile object
    const profileData = {
      username: req.user.email,
      studentName: studentName.trim(),
      studentId: studentId.trim(),
      admissionNumber: admissionNumber.trim(),
      bloodGroup: bloodGroup.trim(),
      gender: gender.trim(),
      dateOfBirth: dateOfBirth,
      fatherName: fatherName.trim(),
      motherName: motherName.trim(),
      studentContact: studentContact.trim(),
      parentsContact: parentsContact.trim(),
      address: address.trim(),
      pincode: pincode.trim(),
      district: district.trim(),
      state: state.trim(),
      residenceType: residenceType,
      currentSemester: parseInt(currentSemester),
      session: session.trim(),
      course: course.trim(),
      profilePicture: profilePicture,
      isComplete: true,
      submittedAt: existingProfile ? existingProfile.submittedAt : new Date().toISOString(),
      lastModifiedAt: new Date().toISOString(),
      modifiedBy: req.user.role === 'admin' ? 'admin' : 'student'
    };
    
    // Save profile
    profiles[req.user.email] = profileData;
    
    console.log('✅ Profile data to be saved:', JSON.stringify({
      email: req.user.email,
      course: profileData.course,
      session: profileData.session,
      currentSemester: profileData.currentSemester
    }, null, 2));
    
    if (!saveProfiles(profiles)) {
      return res.status(500).json({ error: 'Failed to save profile' });
    }
    
    console.log('💾 Profile saved successfully with course:', profileData.course);
    
    // Update user's profile completion status
    const users = loadUsers();
    if (users[req.user.email]) {
      users[req.user.email].profileComplete = true;
      users[req.user.email].lastProfileUpdate = new Date().toISOString();
      saveUsers(users);
    }
    
    // AUTO-ENROLL STUDENT INTO ATTENDANCE SYSTEM
    // Only auto-enroll if this is a student and they're completing profile for the first time
    if (req.user.role === 'student' && !existingProfile) {
      try {
        console.log('🎓 Auto-enrolling student into attendance system...');
        
        // Map course to branch code
        const courseToBranchMap = {
          'Diploma in Civil Engineering': 'CE',
          'Diploma in Mechanical Engineering': 'ME',
          'Diploma in Electrical Engineering': 'EE',
          'Diploma in Computer Science Engineering': 'CSE'
        };
        
        const branchId = courseToBranchMap[course];
        
        if (!branchId) {
          console.warn(`⚠️ Unknown course: ${course}, cannot auto-enroll`);
        } else {
          // Read enrollment file
          const ENROLLMENTS_FILE = path.join(__dirname, '../data/attendance-enrollments.json');
          let enrollments = {};
          
          if (fs.existsSync(ENROLLMENTS_FILE)) {
            try {
              const enrollData = fs.readFileSync(ENROLLMENTS_FILE, 'utf8');
              enrollments = JSON.parse(enrollData) || {};
            } catch (e) {
              console.error('Error reading enrollments:', e);
              enrollments = {};
            }
          }
          
          // Create enrollment ID
          const enrollmentId = `${req.user.email}_${session}_${branchId}_${currentSemester}`;
          
          // Check if enrollment already exists
          if (!enrollments[enrollmentId]) {
            enrollments[enrollmentId] = {
              id: enrollmentId,
              studentEmail: req.user.email,
              studentId: studentId.trim(),
              studentName: studentName.trim(),
              sessionId: session.trim(),
              branchId: branchId,
              semester: parseInt(currentSemester),
              status: 'active',
              createdAt: new Date().toISOString(),
              createdBy: 'system-auto-enrollment'
            };
            
            // Save enrollment
            fs.writeFileSync(ENROLLMENTS_FILE, JSON.stringify(enrollments, null, 2));
            
            console.log(`✅ Auto-enrolled: ${studentName} (${studentId}) -> ${session}/${branchId}/Sem-${currentSemester}`);
            
            // Add audit log
            const AUDIT_FILE = path.join(__dirname, '../data/attendance-audit-logs.json');
            let auditLogs = [];
            if (fs.existsSync(AUDIT_FILE)) {
              try {
                const auditData = fs.readFileSync(AUDIT_FILE, 'utf8');
                auditLogs = JSON.parse(auditData) || [];
              } catch (e) {
                auditLogs = [];
              }
            }
            
            auditLogs.push({
              id: Date.now().toString(),
              action: 'AUTO_ENROLL_STUDENT',
              details: {
                studentEmail: req.user.email,
                studentId: studentId.trim(),
                studentName: studentName.trim(),
                sessionId: session.trim(),
                branchId: branchId,
                semester: parseInt(currentSemester)
              },
              userEmail: 'system',
              timestamp: new Date().toISOString()
            });
            
            if (auditLogs.length > 1000) {
              auditLogs.splice(0, auditLogs.length - 1000);
            }
            
            fs.writeFileSync(AUDIT_FILE, JSON.stringify(auditLogs, null, 2));
          } else {
            console.log('ℹ️ Enrollment already exists, skipping auto-enrollment');
          }
        }
      } catch (enrollError) {
        console.error('❌ Error during auto-enrollment:', enrollError);
        // Don't fail profile submission if auto-enrollment fails
      }
    }
    
    res.json({ 
      message: 'Profile saved successfully',
      profile: profileData
    });
    
  } catch (error) {
    console.error('Error saving profile:', error);
    res.status(500).json({ error: 'Failed to save profile' });
  }
});

// GET /api/profile/all - Admin only: Get all student profiles
router.get('/all', validateSession, requireAdmin, (req, res) => {
  try {
    const profiles = loadProfiles();
    const users = loadUsers();
    
    // Combine profile data with user data
    const allProfiles = Object.keys(profiles).map(username => {
      const profile = profiles[username];
      const user = users[username];
      
      return {
        ...profile,
        role: user ? user.role : 'unknown',
        email: user ? user.email : null,
        lastLogin: user ? user.lastLogin : null,
        accountCreated: user ? user.createdAt : null
      };
    }).filter(profile => profile.role === 'student'); // Only return student profiles
    
    res.json({ profiles: allProfiles });
  } catch (error) {
    console.error('Error fetching all profiles:', error);
    res.status(500).json({ error: 'Failed to fetch profiles' });
  }
});

// GET /api/profile/:username - Admin only: Get specific student profile
// TEMPORARILY ALLOW WITHOUT AUTH FOR DEBUGGING
router.get('/:username', (req, res) => {
  try {
    const profiles = loadProfiles();
    const users = loadUsers();
    const { username } = req.params;
    
    const profile = profiles[username];
    const user = users[username];
    
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Profile not found' });
    }
    
    // Allow access to any profile for now (admin portal needs this)
    // if (user && user.role !== 'student') {
    //   return res.status(403).json({ error: 'Can only access student profiles' });
    // }
    
    res.json({
      success: true,
      profile: {
        ...profile,
        role: user ? user.role : 'unknown',
        email: user ? user.email : null,
        lastLogin: user ? user.lastLogin : null,
        accountCreated: user ? user.createdAt : null
      }
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PUT /api/profile/:username/semester - Admin only: Update student semester
router.put('/:username/semester', validateSession, requireAdmin, (req, res) => {
  try {
    const profiles = loadProfiles();
    const { username } = req.params;
    const { semester } = req.body;
    
    if (!profiles[username]) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    if (!semester || isNaN(semester) || semester < 1 || semester > 8) {
      return res.status(400).json({ error: 'Invalid semester. Must be between 1 and 8.' });
    }
    
    profiles[username].currentSemester = parseInt(semester);
    profiles[username].lastModifiedAt = new Date().toISOString();
    profiles[username].modifiedBy = 'admin';
    profiles[username].semesterPromotedAt = new Date().toISOString();
    
    if (!saveProfiles(profiles)) {
      return res.status(500).json({ error: 'Failed to update semester' });
    }
    
    res.json({ 
      message: 'Semester updated successfully',
      newSemester: parseInt(semester)
    });
    
  } catch (error) {
    console.error('Error updating semester:', error);
    res.status(500).json({ error: 'Failed to update semester' });
  }
});

// PUT /api/profile/:username - Admin only: Update any student profile
router.put('/:username', validateSession, requireAdmin, upload.single('profilePicture'), (req, res) => {
  try {
    const profiles = loadProfiles();
    const { username } = req.params;
    
    if (!profiles[username]) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    // Use the same validation logic as POST route
    const {
      studentName,
      studentId,
      bloodGroup,
      dateOfBirth,
      fatherName,
      motherName,
      studentContact,
      parentsContact,
      address,
      pincode,
      district,
      state,
      residenceType,
      currentSemester
    } = req.body;
    
    // Validation (same as POST route)
    const requiredFields = {
      studentName: 'Student Name',
      studentId: 'Student ID',
      bloodGroup: 'Blood Group',
      dateOfBirth: 'Date of Birth',
      fatherName: "Father's Name",
      motherName: "Mother's Name",
      studentContact: 'Student Contact',
      parentsContact: 'Parents Contact',
      address: 'Address',
      pincode: 'Pincode',
      district: 'District',
      state: 'State',
      residenceType: 'Residence Type'
    };
    
    const missingFields = [];
    for (const [field, label] of Object.entries(requiredFields)) {
      if (!req.body[field] || req.body[field].trim() === '') {
        missingFields.push(label);
      }
    }
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        error: `Missing required fields: ${missingFields.join(', ')}` 
      });
    }
    
    // Phone validation
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(studentContact)) {
      return res.status(400).json({ error: 'Invalid student contact number' });
    }
    
    if (!phoneRegex.test(parentsContact)) {
      return res.status(400).json({ error: 'Invalid parents contact number' });
    }
    
    // Pincode validation
    if (!/^\d{6}$/.test(pincode)) {
      return res.status(400).json({ error: 'Invalid pincode' });
    }
    
    // Residence type validation
    if (!['hosteller', 'day-boarder'].includes(residenceType)) {
      return res.status(400).json({ error: 'Invalid residence type' });
    }
    
    const existingProfile = profiles[username];
    
    // Handle profile picture
    let profilePicture = existingProfile.profilePicture;
    if (req.file) {
      profilePicture = `/uploads/profiles/${req.file.filename}`;
      
      // Delete old profile picture if it exists
      if (existingProfile.profilePicture) {
        const oldPicturePath = path.join(__dirname, '..', existingProfile.profilePicture);
        if (fs.existsSync(oldPicturePath)) {
          fs.unlinkSync(oldPicturePath);
        }
      }
    }
    
    // Update profile
    profiles[username] = {
      ...existingProfile,
      studentName: studentName.trim(),
      studentId: studentId.trim(),
      bloodGroup: bloodGroup.trim(),
      dateOfBirth: dateOfBirth || existingProfile.dateOfBirth,
      fatherName: fatherName.trim(),
      motherName: motherName.trim(),
      studentContact: studentContact.trim(),
      parentsContact: parentsContact.trim(),
      address: address.trim(),
      pincode: pincode.trim(),
      district: district.trim(),
      state: state.trim(),
      residenceType: residenceType,
      currentSemester: currentSemester ? parseInt(currentSemester) : existingProfile.currentSemester,
      profilePicture: profilePicture,
      lastModifiedAt: new Date().toISOString(),
      modifiedBy: 'admin'
    };
    
    if (!saveProfiles(profiles)) {
      return res.status(500).json({ error: 'Failed to update profile' });
    }
    
    res.json({ 
      message: 'Profile updated successfully',
      profile: profiles[username]
    });
    
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// DELETE /api/profile/:username - Admin only: Delete individual student profile
router.delete('/:username', validateSession, requireAdmin, (req, res) => {
  try {
    const profiles = loadProfiles();
    const users = loadUsers();
    const { username } = req.params;
    
    if (!profiles[username]) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found'
      });
    }
    
    const profile = profiles[username];
    const user = users[username];
    
    // Only allow deletion of student profiles
    if (user && user.role !== 'student') {
      return res.status(403).json({
        success: false,
        error: 'Can only delete student profiles'
      });
    }
    
    // Delete profile picture if it exists
    if (profile.profilePicture) {
      const picturePath = path.join(__dirname, '..', profile.profilePicture);
      if (fs.existsSync(picturePath)) {
        try {
          fs.unlinkSync(picturePath);
          console.log(`🗑️ Deleted profile picture: ${picturePath}`);
        } catch (err) {
          console.warn(`⚠️ Failed to delete profile picture: ${err.message}`);
        }
      }
    }
    
    // Store info for response
    const deletedInfo = {
      username: profile.username,
      studentName: profile.studentName,
      studentId: profile.studentId
    };
    
    // Delete from profiles
    delete profiles[username];
    
    // Update user's profile completion status
    if (users[username]) {
      users[username].profileComplete = false;
      users[username].profileDeletedAt = new Date().toISOString();
      saveUsers(users);
    }
    
    if (!saveProfiles(profiles)) {
      return res.status(500).json({
        success: false,
        error: 'Failed to save changes after deletion'
      });
    }
    
    console.log(`🗑️ Student profile deleted: ${username} (${deletedInfo.studentName})`);
    
    res.json({
      success: true,
      message: 'Profile deleted successfully',
      deletedProfile: deletedInfo
    });
    
  } catch (error) {
    console.error('Delete profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete profile'
    });
  }
});

// POST /api/profile/bulk-delete - Admin only: Bulk delete student profiles
router.post('/bulk-delete', validateSession, requireAdmin, (req, res) => {
  try {
    const { usernames } = req.body;
    
    if (!usernames || !Array.isArray(usernames) || usernames.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Usernames array is required and must not be empty'
      });
    }
    
    const profiles = loadProfiles();
    const users = loadUsers();
    const deletedProfiles = [];
    const notFoundUsernames = [];
    const skippedProfiles = [];
    
    // Process each username
    usernames.forEach(username => {
      if (!profiles[username]) {
        notFoundUsernames.push(username);
        return;
      }
      
      const profile = profiles[username];
      const user = users[username];
      
      // Only allow deletion of student profiles
      if (user && user.role !== 'student') {
        skippedProfiles.push({
          username: username,
          reason: 'Not a student profile'
        });
        return;
      }
      
      // Delete profile picture if it exists
      if (profile.profilePicture) {
        const picturePath = path.join(__dirname, '..', profile.profilePicture);
        if (fs.existsSync(picturePath)) {
          try {
            fs.unlinkSync(picturePath);
            console.log(`🗑️ Deleted profile picture: ${picturePath}`);
          } catch (err) {
            console.warn(`⚠️ Failed to delete profile picture for ${username}: ${err.message}`);
          }
        }
      }
      
      // Store info for response
      deletedProfiles.push({
        username: profile.username,
        studentName: profile.studentName,
        studentId: profile.studentId
      });
      
      // Delete from profiles
      delete profiles[username];
      
      // Update user's profile completion status
      if (users[username]) {
        users[username].profileComplete = false;
        users[username].profileDeletedAt = new Date().toISOString();
      }
    });
    
    if (deletedProfiles.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No profiles were deleted',
        notFoundUsernames: notFoundUsernames,
        skippedProfiles: skippedProfiles
      });
    }
    
    // Save changes
    const profilesSaved = saveProfiles(profiles);
    const usersSaved = saveUsers(users);
    
    if (!profilesSaved || !usersSaved) {
      return res.status(500).json({
        success: false,
        error: 'Failed to save changes after bulk deletion'
      });
    }
    
    console.log(`🗑️ Bulk profile deletion completed: ${deletedProfiles.length} profiles deleted`);
    deletedProfiles.forEach(profile => {
      console.log(`   - ${profile.username} (${profile.studentName})`);
    });
    
    res.json({
      success: true,
      message: `Successfully deleted ${deletedProfiles.length} profile(s)`,
      deletedCount: deletedProfiles.length,
      deletedProfiles: deletedProfiles,
      notFoundUsernames: notFoundUsernames.length > 0 ? notFoundUsernames : undefined,
      skippedProfiles: skippedProfiles.length > 0 ? skippedProfiles : undefined
    });
    
  } catch (error) {
    console.error('Bulk delete profiles error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform bulk delete operation'
    });
  }
});

module.exports = router;

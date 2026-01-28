const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const FirestoreDAO = require('../utils/firestore-dao');
const admin = require('firebase-admin');
const moment = require('moment-timezone');
// Biometric ID generator deprecated - now using Student/Employee ID directly

// Initialize DAOs
const usersDAO = new FirestoreDAO('users');
const enrollmentTasksDAO = new FirestoreDAO('enrollment_tasks');
const attendanceDAO = new FirestoreDAO('attendance');

/**
 * POST /api/admin/users/create
 * Create new user with auto-generated biometric ID
 */
router.post('/users/create', async (req, res) => {
  try {
    const { name, email, password, role, employeeId, studentId, department } = req.body;
    
    console.log('📝 Creating new user:', email);
    
    // Validate required fields
    if (!name || !email || !role) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing required fields: name, email, and role are required' 
      });
    }
    
    // Validate Student ID / Employee ID based on role
    if (role === 'student' && !studentId) {
      return res.status(400).json({
        success: false,
        error: 'Student ID is required for students'
      });
    }
    
    if (role !== 'student' && !employeeId) {
      return res.status(400).json({
        success: false,
        error: 'Employee ID is required for faculty and staff'
      });
    }
    
    // Validate email format
    if (!email.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }
    
    // Validate role
    const validRoles = ['admin', 'management', 'teacher', 'staff', 'student'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: `Invalid role. Must be one of: ${validRoles.join(', ')}`
      });
    }
    
    // Check if user already exists
    const existingUser = await usersDAO.findById(email);
    if (existingUser) {
      return res.status(409).json({ 
        success: false,
        error: 'User with this email already exists' 
      });
    }
    
    // Check if Student ID already exists (for students)
    if (role === 'student' && studentId) {
      const existingStudentId = await usersDAO.findOneByField('studentId', studentId);
      if (existingStudentId) {
        return res.status(409).json({
          success: false,
          error: `Student ID ${studentId} is already assigned to another user`
        });
      }
    }
    
    // Check if Employee ID already exists (for non-students)
    if (role !== 'student' && employeeId) {
      const existingEmployeeId = await usersDAO.findOneByField('employeeId', employeeId);
      if (existingEmployeeId) {
        return res.status(409).json({
          success: false,
          error: `Employee ID ${employeeId} is already assigned to another user`
        });
      }
    }
    
    // Use Student ID / Employee ID as unified biometric identifier
    const unifiedId = role === 'student' ? studentId : employeeId;
    const biometricId = unifiedId; // Single source of truth
    
    // Calculate device PIN from unified ID
    // Strategy: Use numeric digits from ID, or full ID if short
    let devicePIN;
    const numericOnly = unifiedId.replace(/\D/g, ''); // Extract digits only
    
    if (numericOnly.length >= 4) {
      // Use last 4-6 digits for numeric IDs
      devicePIN = numericOnly.slice(-Math.min(6, numericOnly.length));
    } else if (unifiedId.length <= 8) {
      // Use full ID if it's short enough (device supports up to 8 chars)
      devicePIN = unifiedId;
    } else {
      // For long alphanumeric IDs, use last 6 characters
      devicePIN = unifiedId.slice(-6);
    }
    
    console.log(`🔐 Unified ID: ${unifiedId} → Device PIN: ${devicePIN}`);
    
    // Hash password if provided, otherwise generate temporary password
    const tempPassword = password || `Welcome@${unifiedId}`;
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    
    // Create user object with biometric data
    const newUser = {
      id: email,
      email,
      name,
      role,
      hashedPassword,
      // Student ID or Employee ID - required and permanent
      employeeId: role !== 'student' ? employeeId : null,
      studentId: role === 'student' ? studentId : null,
      department: department || null,
      
      // Biometric integration fields
      biometricId,
      biometricData: {
        enrolled: false, // Will be set to true after fingerprint enrollment
        devicePIN,
        deviceIds: [],
        enrollmentStatus: 'pending',
        enrolledAt: null,
        enrolledBy: req.user?.email || 'system',
        lastVerified: null,
        fingerprintCount: 0
      },
      
      // Default attendance profile
      attendanceProfile: {
        type: 'regular',
        requiredHours: 8,
        checkInTime: '09:00',
        checkOutTime: '17:00',
        graceMinutes: 15,
        workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        allowWeekendPunch: false,
        requiresApproval: false
      },
      
      status: 'active',
      permissions: role === 'admin' ? ['all'] : [],
      mustChangePassword: true, // ALWAYS force password change on first login
      profileComplete: false,
      
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: req.user?.email || 'system',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Save user to Firestore with email as document ID
    await usersDAO.create(newUser, email);
    console.log(`✅ User created: ${email} with doc ID: ${email}`);
    
    // Create enrollment task
    const enrollmentTask = {
      userId: email,
      userName: name,
      biometricId,
      devicePIN,
      status: 'pending',
      deviceId: null,
      enrolledAt: null,
      expiresAt: admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      ),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: req.user?.email || 'system'
    };
    
    await enrollmentTasksDAO.create(enrollmentTask);
    console.log(`📋 Enrollment task created for ${email}`);
    
    // Remove sensitive data from response
    const { hashedPassword: _, ...safeUser } = newUser;
    
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        ...safeUser,
        tempPassword: !password ? tempPassword : undefined
      },
      enrollment: {
        biometricId,
        devicePIN,
        status: 'pending',
        instructions: [
          'Go to the biometric device',
          'Navigate to: Menu → User Management → New User',
          `Enter PIN: ${devicePIN}`,
          'Enroll fingerprint (scan finger 3 times)',
          'Save on device',
          'User will be auto-activated on first punch'
        ]
      },
      nextSteps: {
        action: 'enroll_fingerprint',
        message: `Ask ${name} to enroll their fingerprint on the biometric device using PIN: ${devicePIN}`
      }
    });
    
  } catch (error) {
    console.error('❌ Error creating user:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create user',
      details: error.message 
    });
  }
});

/**
 * POST /api/admin/users/change-password-self
 * Allow a user to change their own password using Firestore-backed data
 */
router.post('/users/change-password-self', async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;

    if (!email || !currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Email, current password, and new password are required'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 8 characters long'
      });
    }

    // Fetch user from Firestore
    const user = await usersDAO.findById(email);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Verify current password against bcrypt hash
    if (!user.hashedPassword) {
      return res.status(400).json({
        success: false,
        error: 'Password change is not supported for this account type'
      });
    }

    const passwordMatch = await bcrypt.compare(currentPassword, user.hashedPassword);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await usersDAO.update(email, {
      hashedPassword,
      mustChangePassword: false,
      passwordChangedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Error changing password (self):', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to change password'
    });
  }
});

/**
 * GET /api/admin/users/list
 * Get all users with enrollment status
 */
router.get('/users/list', async (req, res) => {
  try {
    const { role, enrollmentStatus, limit = 100 } = req.query;
    
    let conditions = [];
    
    if (role) {
      conditions.push({ field: 'role', operator: '==', value: role });
    }
    
    if (enrollmentStatus) {
      conditions.push({ 
        field: 'biometricData.enrollmentStatus', 
        operator: '==', 
        value: enrollmentStatus 
      });
    }
    
    const users = conditions.length > 0
      ? await usersDAO.query(conditions, parseInt(limit))
      : await usersDAO.findAll();
    
    // Remove sensitive data
    const safeUsers = users.map(user => {
      const { hashedPassword, ...safe } = user;
      return safe;
    });
    
    // Get enrollment statistics
    const stats = {
      total: safeUsers.length,
      enrolled: safeUsers.filter(u => u.biometricData?.enrolled).length,
      pending: safeUsers.filter(u => u.biometricData?.enrollmentStatus === 'pending').length,
      active: safeUsers.filter(u => u.biometricData?.enrollmentStatus === 'active').length
    };
    
    res.json({
      success: true,
      statistics: stats,
      users: safeUsers
    });
    
  } catch (error) {
    console.error('Error listing users:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

/**
 * GET /api/admin/users/:userId
 * Get specific user details
 */
router.get('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`🔍 Admin API: Fetching user with ID: ${userId}`);
    
    const user = await usersDAO.findById(userId);
    console.log(`📊 User found:`, user ? 'YES' : 'NO');
    
    if (!user) {
      console.log(`❌ User not found: ${userId}`);
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    console.log(`✅ User data:`, { email: user.email, name: user.name, role: user.role });
    
    // Remove password
    const { hashedPassword, ...safeUser } = user;
    
    // Get enrollment task if exists
    console.log(`📋 Fetching enrollment tasks for: ${userId}`);
    const tasks = await enrollmentTasksDAO.query([
      { field: 'userId', operator: '==', value: userId }
    ], 10); // Get up to 10 tasks, sort in memory if needed
    console.log(`📊 Enrollment tasks found: ${tasks.length}`);
    
    // Sort tasks by createdAt in memory (most recent first)
    const sortedTasks = tasks.sort((a, b) => {
      const timeA = a.createdAt?.toDate?.() || new Date(a.createdAt?._seconds * 1000);
      const timeB = b.createdAt?.toDate?.() || new Date(b.createdAt?._seconds * 1000);
      return timeB - timeA; // Descending order
    });
    
    res.json({
      success: true,
      user: safeUser,
      enrollmentTask: sortedTasks[0] || null
    });
    
  } catch (error) {
    console.error('❌ Error getting user:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

/**
 * PUT /api/admin/users/:userId/attendance-profile
 * Update user's attendance configuration
 */
router.put('/users/:userId/attendance-profile', async (req, res) => {
  try {
    const { userId } = req.params;
    const { requiredHours, checkInTime, checkOutTime, graceMinutes, workingDays, type } = req.body;
    
    const user = await usersDAO.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const updateData = {};
    if (requiredHours) updateData['attendanceProfile.requiredHours'] = requiredHours;
    if (checkInTime) updateData['attendanceProfile.checkInTime'] = checkInTime;
    if (checkOutTime) updateData['attendanceProfile.checkOutTime'] = checkOutTime;
    if (graceMinutes !== undefined) updateData['attendanceProfile.graceMinutes'] = graceMinutes;
    if (workingDays) updateData['attendanceProfile.workingDays'] = workingDays;
    if (type) updateData['attendanceProfile.type'] = type;
    
    updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    
    await usersDAO.update(userId, updateData);
    
    res.json({
      success: true,
      message: 'Attendance profile updated'
    });
    
  } catch (error) {
    console.error('Error updating attendance profile:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

/**
 * DELETE /api/admin/users/:userId
 * Delete a user and related data
 */
router.delete('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log(`🗑️ Attempting to delete user: ${userId}`);
    
    // Try to find user by document ID first
    let user = await usersDAO.findById(userId);
    let actualUserId = userId;
    
    // If not found by ID, try searching by email field (for old users)
    if (!user) {
      console.log(`⚠️ User not found by ID, searching by email field...`);
      const usersByEmail = await usersDAO.findByField('email', userId, 1);
      if (usersByEmail.length > 0) {
        user = usersByEmail[0];
        actualUserId = user.id; // Use the actual document ID
        console.log(`✅ Found user by email field with doc ID: ${actualUserId}`);
      }
    }
    
    if (!user) {
      console.log(`❌ User not found with ID or email: ${userId}`);
      return res.status(404).json({
        success: false,
        error: `User not found with ID: ${userId}`
      });
    }
    
    console.log(`✅ Found user: ${user.name} (${user.email}), doc ID: ${actualUserId}`);
    
    // COMPLETE DELETION: Remove ALL traces of the user from database
    let deletedCounts = {
      enrollmentTasks: 0,
      attendanceRecords: 0,
      profileData: 0,
      hostelData: 0,
      documents: 0
    };
    
    // 1. Delete enrollment tasks
    const enrollmentTasks = await enrollmentTasksDAO.query([
      { field: 'userId', operator: '==', value: user.email }
    ]);
    for (const task of enrollmentTasks) {
      await enrollmentTasksDAO.delete(task.id);
      deletedCounts.enrollmentTasks++;
    }
    console.log(`✅ Deleted ${deletedCounts.enrollmentTasks} enrollment task(s)`);
    
    // 2. Delete ALL attendance records (PERMANENT - no recovery)
    const attendanceRecords = await attendanceDAO.query([
      { field: 'userId', operator: '==', value: user.email }
    ]);
    for (const record of attendanceRecords) {
      await attendanceDAO.delete(record.id);
      deletedCounts.attendanceRecords++;
    }
    console.log(`✅ Deleted ${deletedCounts.attendanceRecords} attendance record(s)`);
    
    // 3. Delete user profile data (if exists in separate collection)
    try {
      const profileDAO = new FirestoreDAO('profiles');
      const profiles = await profileDAO.query([
        { field: 'email', operator: '==', value: user.email }
      ]);
      for (const profile of profiles) {
        await profileDAO.delete(profile.id);
        deletedCounts.profileData++;
      }
      console.log(`✅ Deleted ${deletedCounts.profileData} profile(s)`);
    } catch (e) {
      console.log('⚠️ No profile collection or error:', e.message);
    }
    
    // 4. Delete hostel information (if exists)
    try {
      const hostelDAO = new FirestoreDAO('hostel_info');
      const hostelRecords = await hostelDAO.query([
        { field: 'email', operator: '==', value: user.email }
      ]);
      for (const record of hostelRecords) {
        await hostelDAO.delete(record.id);
        deletedCounts.hostelData++;
      }
      console.log(`✅ Deleted ${deletedCounts.hostelData} hostel record(s)`);
    } catch (e) {
      console.log('⚠️ No hostel collection or error:', e.message);
    }
    
    // 5. Delete any requests/documents submitted by user
    try {
      const requestsDAO = new FirestoreDAO('requests');
      const requests = await requestsDAO.query([
        { field: 'userEmail', operator: '==', value: user.email }
      ]);
      for (const request of requests) {
        await requestsDAO.delete(request.id);
        deletedCounts.documents++;
      }
      console.log(`✅ Deleted ${deletedCounts.documents} request(s)`);
    } catch (e) {
      console.log('⚠️ No requests collection or error:', e.message);
    }
    
    // 6. Delete from local JSON files (profiles.json, hostel.json, etc.)
    try {
      const fs = require('fs');
      const path = require('path');
      const dataDir = path.join(__dirname, '../data');
      
      // Delete from profiles.json
      const profilesFile = path.join(dataDir, 'profiles.json');
      if (fs.existsSync(profilesFile)) {
        const profiles = JSON.parse(fs.readFileSync(profilesFile, 'utf8'));
        if (profiles[user.email]) {
          delete profiles[user.email];
          fs.writeFileSync(profilesFile, JSON.stringify(profiles, null, 2));
          deletedCounts.profileData++;
          console.log(`✅ Deleted profile from profiles.json`);
        }
      }
      
      // Delete from hostel.json
      const hostelFile = path.join(dataDir, 'hostel.json');
      if (fs.existsSync(hostelFile)) {
        const hostelData = JSON.parse(fs.readFileSync(hostelFile, 'utf8'));
        if (hostelData[user.email]) {
          delete hostelData[user.email];
          fs.writeFileSync(hostelFile, JSON.stringify(hostelData, null, 2));
          deletedCounts.hostelData++;
          console.log(`✅ Deleted hostel data from hostel.json`);
        }
      }
      
      // Delete from hostel-requests.json
      const hostelRequestsFile = path.join(dataDir, 'hostel-requests.json');
      if (fs.existsSync(hostelRequestsFile)) {
        let requests = JSON.parse(fs.readFileSync(hostelRequestsFile, 'utf8'));
        if (Array.isArray(requests)) {
          const originalLength = requests.length;
          requests = requests.filter(r => r.email !== user.email && r.userEmail !== user.email);
          if (requests.length < originalLength) {
            fs.writeFileSync(hostelRequestsFile, JSON.stringify(requests, null, 2));
            deletedCounts.documents += (originalLength - requests.length);
            console.log(`✅ Deleted hostel requests from hostel-requests.json`);
          }
        }
      }
      
      // Delete from notifications.json
      const notificationsFile = path.join(dataDir, 'notifications.json');
      if (fs.existsSync(notificationsFile)) {
        let notifications = JSON.parse(fs.readFileSync(notificationsFile, 'utf8'));
        if (Array.isArray(notifications)) {
          const originalLength = notifications.length;
          notifications = notifications.filter(n => n.recipientEmail !== user.email);
          if (notifications.length < originalLength) {
            fs.writeFileSync(notificationsFile, JSON.stringify(notifications, null, 2));
            console.log(`✅ Deleted notifications from notifications.json`);
          }
        }
      }
      
    } catch (e) {
      console.log('⚠️ Error cleaning JSON files:', e.message);
    }
    
    // 7. Finally, delete the user account itself (PERMANENT)
    await usersDAO.delete(actualUserId);
    
    console.log(`✅ User PERMANENTLY deleted: ${userId}`);
    console.log(`📄 Deletion summary:`, deletedCounts);
    
    res.json({
      success: true,
      message: `User ${user.name} permanently deleted`,
      deletionSummary: {
        user: user.name,
        email: user.email,
        deletedData: deletedCounts,
        totalRecordsDeleted: Object.values(deletedCounts).reduce((a, b) => a + b, 0) + 1 // +1 for user account
      },
      warning: 'This action is PERMANENT and cannot be undone'
    });
    
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

/**
 * POST /api/admin/users/bulk-delete
 * Bulk delete multiple users
 */
router.post('/users/bulk-delete', async (req, res) => {
  try {
    const { emails } = req.body;
    
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No emails provided for deletion'
      });
    }
    
    console.log(`🗑️ Bulk delete request for ${emails.length} users:`, emails);
    
    const results = [];
    let deletedCount = 0;
    
    for (const email of emails) {
      try {
        // Try to find user by document ID first
        let user = await usersDAO.findById(email);
        let actualUserId = email;
        
        // If not found by ID, try searching by email field
        if (!user) {
          const usersByEmail = await usersDAO.findByField('email', email, 1);
          if (usersByEmail.length > 0) {
            user = usersByEmail[0];
            actualUserId = user.id;
          }
        }
        
        if (!user) {
          results.push({ email, status: 'not_found', message: 'User not found' });
          continue;
        }
        
        // COMPLETE DELETION for bulk operation
        let recordsDeleted = 0;
        
        // Delete enrollment tasks
        const enrollmentTasks = await enrollmentTasksDAO.query([
          { field: 'userId', operator: '==', value: user.email }
        ]);
        for (const task of enrollmentTasks) {
          await enrollmentTasksDAO.delete(task.id);
          recordsDeleted++;
        }
        
        // Delete attendance records
        const attendanceRecords = await attendanceDAO.query([
          { field: 'userId', operator: '==', value: user.email }
        ]);
        for (const record of attendanceRecords) {
          await attendanceDAO.delete(record.id);
          recordsDeleted++;
        }
        
        // Delete profile data
        try {
          const profileDAO = new FirestoreDAO('profiles');
          const profiles = await profileDAO.query([{ field: 'email', operator: '==', value: user.email }]);
          for (const profile of profiles) {
            await profileDAO.delete(profile.id);
            recordsDeleted++;
          }
        } catch (e) { /* Collection might not exist */ }
        
        // Delete hostel data
        try {
          const hostelDAO = new FirestoreDAO('hostel_info');
          const hostelRecords = await hostelDAO.query([{ field: 'email', operator: '==', value: user.email }]);
          for (const record of hostelRecords) {
            await hostelDAO.delete(record.id);
            recordsDeleted++;
          }
        } catch (e) { /* Collection might not exist */ }
        
        // Delete requests
        try {
          const requestsDAO = new FirestoreDAO('requests');
          const requests = await requestsDAO.query([{ field: 'userEmail', operator: '==', value: user.email }]);
          for (const request of requests) {
            await requestsDAO.delete(request.id);
            recordsDeleted++;
          }
        } catch (e) { /* Collection might not exist */ }
        
        // Delete from local JSON files
        try {
          const fs = require('fs');
          const path = require('path');
          const dataDir = path.join(__dirname, '../data');
          
          // profiles.json
          const profilesFile = path.join(dataDir, 'profiles.json');
          if (fs.existsSync(profilesFile)) {
            const profiles = JSON.parse(fs.readFileSync(profilesFile, 'utf8'));
            if (profiles[user.email]) {
              delete profiles[user.email];
              fs.writeFileSync(profilesFile, JSON.stringify(profiles, null, 2));
              recordsDeleted++;
            }
          }
          
          // hostel.json
          const hostelFile = path.join(dataDir, 'hostel.json');
          if (fs.existsSync(hostelFile)) {
            const hostelData = JSON.parse(fs.readFileSync(hostelFile, 'utf8'));
            if (hostelData[user.email]) {
              delete hostelData[user.email];
              fs.writeFileSync(hostelFile, JSON.stringify(hostelData, null, 2));
              recordsDeleted++;
            }
          }
          
          // hostel-requests.json
          const hostelRequestsFile = path.join(dataDir, 'hostel-requests.json');
          if (fs.existsSync(hostelRequestsFile)) {
            let requests = JSON.parse(fs.readFileSync(hostelRequestsFile, 'utf8'));
            if (Array.isArray(requests)) {
              const originalLength = requests.length;
              requests = requests.filter(r => r.email !== user.email && r.userEmail !== user.email);
              if (requests.length < originalLength) {
                fs.writeFileSync(hostelRequestsFile, JSON.stringify(requests, null, 2));
                recordsDeleted += (originalLength - requests.length);
              }
            }
          }
          
          // notifications.json
          const notificationsFile = path.join(dataDir, 'notifications.json');
          if (fs.existsSync(notificationsFile)) {
            let notifications = JSON.parse(fs.readFileSync(notificationsFile, 'utf8'));
            if (Array.isArray(notifications)) {
              const originalLength = notifications.length;
              notifications = notifications.filter(n => n.recipientEmail !== user.email);
              if (notifications.length < originalLength) {
                fs.writeFileSync(notificationsFile, JSON.stringify(notifications, null, 2));
                recordsDeleted += (originalLength - notifications.length);
              }
            }
          }
        } catch (e) { /* JSON file cleanup errors ignored */ }
        
        // Finally delete the user
        await usersDAO.delete(actualUserId);
        recordsDeleted++; // Count the user itself
        
        results.push({ 
          email, 
          status: 'deleted', 
          message: 'Permanently deleted',
          recordsDeleted: recordsDeleted 
        });
        deletedCount++;
        
        console.log(`✅ Permanently deleted user: ${email} (${recordsDeleted} total records)`);
        
      } catch (error) {
        console.error(`❌ Error deleting user ${email}:`, error);
        results.push({ email, status: 'error', message: error.message });
      }
    }
    
    res.json({
      success: deletedCount > 0,
      message: `Deleted ${deletedCount} out of ${emails.length} users`,
      deletedCount,
      totalRequested: emails.length,
      results
    });
    
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/admin/enrollment/pending
 * Get list of pending enrollments
 */
router.get('/enrollment/pending', async (req, res) => {
  try {
    const tasks = await enrollmentTasksDAO.query([
      { field: 'status', operator: '==', value: 'pending' }
    ], 100, 'createdAt', 'desc');
    
    res.json({
      success: true,
      count: tasks.length,
      tasks
    });
    
  } catch (error) {
    console.error('Error getting pending enrollments:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

/**
 * GET /api/admin/attendance/today
 * Get today's attendance records
 */
router.get('/attendance/today', async (req, res) => {
  try {
    const today = moment().tz('Asia/Kolkata').format('YYYY-MM-DD');
    
    // Query without ordering to avoid index requirement
    const records = await attendanceDAO.query([
      { field: 'attendance.date', operator: '==', value: today }
    ], 1000);
    
    // Sort in memory instead
    records.sort((a, b) => {
      const timeA = a.attendance?.timestamp?.toDate?.() || new Date(a.attendance?.timestamp?._seconds * 1000);
      const timeB = b.attendance?.timestamp?.toDate?.() || new Date(b.attendance?.timestamp?._seconds * 1000);
      return timeB - timeA;
    });
    
    // Fetch user details for each record
    const enrichedRecords = await Promise.all(records.map(async (record) => {
      const user = await usersDAO.findById(record.userId);
      return {
        ...record,
        userName: user?.name || 'Unknown',
        userEmail: user?.email || '',
        biometricId: user?.biometricId || ''
      };
    }));
    
    res.json({
      success: true,
      date: today,
      totalRecords: enrichedRecords.length,
      records: enrichedRecords
    });
  } catch (error) {
    console.error('Error fetching today attendance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/attendance/date/:date
 * Get attendance records for a specific date
 */
router.get('/attendance/date/:date', async (req, res) => {
  try {
    const { date } = req.params;
    
    // Query without ordering to avoid index requirement
    const records = await attendanceDAO.query([
      { field: 'attendance.date', operator: '==', value: date }
    ], 1000);
    
    // Sort in memory instead
    records.sort((a, b) => {
      const timeA = a.attendance?.timestamp?.toDate?.() || new Date(a.attendance?.timestamp?._seconds * 1000);
      const timeB = b.attendance?.timestamp?.toDate?.() || new Date(b.attendance?.timestamp?._seconds * 1000);
      return timeB - timeA;
    });
    
    // Fetch user details for each record
    const enrichedRecords = await Promise.all(records.map(async (record) => {
      const user = await usersDAO.findById(record.userId);
      return {
        ...record,
        userName: user?.name || 'Unknown',
        userEmail: user?.email || '',
        biometricId: user?.biometricId || ''
      };
    }));
    
    res.json({
      success: true,
      date: date,
      totalRecords: enrichedRecords.length,
      records: enrichedRecords
    });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/attendance/user/:userId
 * Get attendance history for a specific user
 */
router.get('/attendance/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate, limit = 100 } = req.query;
    
    // Only query by userId to avoid index requirement
    const allRecords = await attendanceDAO.query([
      { field: 'userId', operator: '==', value: userId }
    ], 1000);
    
    // Filter by date range in memory
    let records = allRecords;
    if (startDate) {
      records = records.filter(r => r.attendance?.date >= startDate);
    }
    if (endDate) {
      records = records.filter(r => r.attendance?.date <= endDate);
    }
    
    // Sort and limit in memory
    records.sort((a, b) => {
      const timeA = a.attendance?.timestamp?.toDate?.() || new Date(a.attendance?.timestamp?._seconds * 1000);
      const timeB = b.attendance?.timestamp?.toDate?.() || new Date(b.attendance?.timestamp?._seconds * 1000);
      return timeB - timeA;
    });
    records = records.slice(0, parseInt(limit));
    
    const user = await usersDAO.findById(userId);
    
    res.json({
      success: true,
      user: {
        id: user?.id,
        name: user?.name,
        email: user?.email,
        biometricId: user?.biometricId
      },
      totalRecords: records.length,
      records: records
    });
  } catch (error) {
    console.error('Error fetching user attendance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/attendance/summary/:date
 * Get attendance summary with IN/OUT pairs for a date
 */
router.get('/attendance/summary/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const { role } = req.query; // Optional role filter: 'student', 'teacher', 'staff', etc.
    
    // Get all records for the date (no ordering to avoid index requirement)
    const records = await attendanceDAO.query([
      { field: 'attendance.date', operator: '==', value: date }
    ], 1000);
    
    // Sort in memory by timestamp
    records.sort((a, b) => {
      const timeA = a.attendance?.timestamp?.toDate?.() || new Date(a.attendance?.timestamp?._seconds * 1000);
      const timeB = b.attendance?.timestamp?.toDate?.() || new Date(b.attendance?.timestamp?._seconds * 1000);
      return timeA - timeB; // Ascending order for proper IN/OUT sequence
    });
    
    // Group by user
    const userAttendance = {};
    
    for (const record of records) {
      if (!userAttendance[record.userId]) {
        const user = await usersDAO.findById(record.userId);
        userAttendance[record.userId] = {
          userId: record.userId,
          userName: user?.name || 'Unknown',
          userEmail: user?.email || '',
          biometricId: user?.biometricId || '',
          studentId: user?.studentId || null,
          employeeId: user?.employeeId || null,
          role: user?.role || 'unknown',
          department: user?.department || null,
          punches: []
        };
      }
      
      userAttendance[record.userId].punches.push({
        type: record.attendance.type,
        timestamp: record.attendance.timestamp,
        location: record.attendance.location
      });
    }
    
    // Calculate first IN and last OUT for each user
    let summary = Object.values(userAttendance).map(userRecord => {
      const inPunches = userRecord.punches.filter(p => p.type === 'IN');
      const outPunches = userRecord.punches.filter(p => p.type === 'OUT');
      
      return {
        ...userRecord,
        firstIn: inPunches.length > 0 ? inPunches[0].timestamp : null,
        lastOut: outPunches.length > 0 ? outPunches[outPunches.length - 1].timestamp : null,
        totalPunches: userRecord.punches.length,
        status: inPunches.length > 0 ? (outPunches.length > 0 ? 'COMPLETED' : 'IN_PROGRESS') : 'ABSENT'
      };
    });
    
    // Apply role filter if specified
    if (role) {
      summary = summary.filter(s => s.role === role);
    }
    
    res.json({
      success: true,
      date: date,
      role: role || 'all',
      totalUsers: summary.length,
      presentCount: summary.filter(s => s.status !== 'ABSENT').length,
      summary: summary
    });
  } catch (error) {
    console.error('Error fetching attendance summary:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/attendance/debug/all
 * Debug endpoint to see all attendance records
 */
router.get('/attendance/debug/all', async (req, res) => {
  try {
    // Get ALL attendance records (no filtering)
    const allRecords = await attendanceDAO.findAll({}, 50);
    
    console.log(`📊 Found ${allRecords.length} total attendance records`);
    
    res.json({
      success: true,
      totalRecords: allRecords.length,
      records: allRecords.map(r => ({
        id: r.id,
        userId: r.userId,
        date: r.attendance?.date,
        type: r.attendance?.type,
        timestamp: r.attendance?.timestamp,
        devicePIN: r.biometricData?.templateId,
        rawData: r.metadata?.rawData
      }))
    });
    
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

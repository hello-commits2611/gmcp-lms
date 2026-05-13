const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const router = express.Router();

// Path to users database file (to link hostel data with users)
const USERS_DB_PATH = path.join(__dirname, '../data/users.json');
const HOSTEL_DB_PATH = path.join(__dirname, '../data/hostel.json');
const REQUESTS_DB_PATH = path.join(__dirname, '../data/hostel-requests.json');
const NOTIFICATIONS_DB_PATH = path.join(__dirname, '../data/notifications.json');
const PROFILES_DB_PATH = path.join(__dirname, '../data/profiles.json');

// Configure multer for file uploads (PDF only)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/supporting-documents');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'document-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const uploadDocument = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'), false);
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Ensure data directory exists
const ensureDataDirectory = () => {
    const dataDir = path.dirname(HOSTEL_DB_PATH);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    
    const uploadDir = path.join(__dirname, '../uploads/supporting-documents');
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
};

// Load users from file
const loadUsers = () => {
    if (fs.existsSync(USERS_DB_PATH)) {
        try {
            const data = fs.readFileSync(USERS_DB_PATH, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error loading users:', error);
            return {};
        }
    }
    return {};
};

// Save users to file
const saveUsers = (users) => {
    try {
        fs.writeFileSync(USERS_DB_PATH, JSON.stringify(users, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving users:', error);
        return false;
    }
};

// Load hostel data from file
const loadHostelData = () => {
    ensureDataDirectory();
    
    if (fs.existsSync(HOSTEL_DB_PATH)) {
        try {
            const data = fs.readFileSync(HOSTEL_DB_PATH, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error loading hostel data:', error);
            return {};
        }
    }
    return {};
};

// Save hostel data to file
const saveHostelData = (hostelData) => {
    ensureDataDirectory();
    try {
        fs.writeFileSync(HOSTEL_DB_PATH, JSON.stringify(hostelData, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving hostel data:', error);
        return false;
    }
};

// Load requests from file
const loadRequests = () => {
    ensureDataDirectory();
    
    if (fs.existsSync(REQUESTS_DB_PATH)) {
        try {
            const data = fs.readFileSync(REQUESTS_DB_PATH, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error loading requests:', error);
            return [];
        }
    }
    return [];
};

// Save requests to file
const saveRequests = (requests) => {
    ensureDataDirectory();
    try {
        fs.writeFileSync(REQUESTS_DB_PATH, JSON.stringify(requests, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving requests:', error);
        return false;
    }
};

// Load notifications from file
const loadNotifications = () => {
    ensureDataDirectory();
    
    if (fs.existsSync(NOTIFICATIONS_DB_PATH)) {
        try {
            const data = fs.readFileSync(NOTIFICATIONS_DB_PATH, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error loading notifications:', error);
            return [];
        }
    }
    return [];
};

// Save notifications to file
const saveNotifications = (notifications) => {
    ensureDataDirectory();
    try {
        fs.writeFileSync(NOTIFICATIONS_DB_PATH, JSON.stringify(notifications, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving notifications:', error);
        return false;
    }
};

// Load profiles from file
const loadProfiles = () => {
    ensureDataDirectory();

    if (fs.existsSync(PROFILES_DB_PATH)) {
        try {
            const data = fs.readFileSync(PROFILES_DB_PATH, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error loading profiles:', error);
            return {};
        }
    }
    return {};
};

// Generate unique request ID
const generateRequestId = () => {
    return 'REQ-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
};

// Create notification for admin
const createNotification = (type, studentEmail, studentName, requestId, requestType) => {
    const notifications = loadNotifications();
    const notification = {
        id: 'NOTIF-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        type: type, // 'new_request', 'request_approved', 'request_declined'
        message: `New ${requestType} request from ${studentName} (${studentEmail})`,
        studentEmail: studentEmail,
        studentName: studentName,
        requestId: requestId,
        requestType: requestType,
        timestamp: new Date().toISOString(),
        read: false,
        forAdmin: type === 'new_request',
        forStudent: type !== 'new_request'
    };
    
    notifications.push(notification);
    saveNotifications(notifications);
    
    console.log(`📧 Notification created: ${notification.message}`);
    return notification;
};

// Import session manager from auth routes
const { sessionManager } = require('./auth');

// Session validation middleware
const validateSession = (req, res, next) => {
    const sessionToken = req.headers['authorization']?.replace('Bearer ', '') || 
                        req.cookies?.sessionToken;
    
    if (!sessionToken) {
        return res.status(401).json({
            success: false,
            error: 'No session token provided',
            message: 'Please login to access this feature'
        });
    }

    const validation = sessionManager.validateSession(sessionToken);
    if (!validation.valid) {
        return res.status(401).json({
            success: false,
            error: validation.error || 'Invalid session',
            message: 'Your session has expired. Please login again.'
        });
    }

    req.session = validation.session;
    req.user = validation.userData;
    next();
};

// Get current user's hostel information
router.get('/my-hostel', validateSession, (req, res) => {
    try {
        const userEmail = req.query.email;
        
        if (!userEmail) {
            return res.status(400).json({
                success: false,
                error: 'User email is required'
            });
        }

        const users = loadUsers();
        const user = users[userEmail];
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        if (user.role !== 'student') {
            return res.status(403).json({
                success: false,
                error: 'Hostel management is only available for students'
            });
        }

        // Return hostel data from user profile
        const hostelData = user.hostelInfo || null;
        
        res.json({
            success: true,
            hostelData: hostelData
        });

    } catch (error) {
        console.error('Get hostel info error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch hostel information'
        });
    }
});

// Update/Create hostel information for current user
router.post('/update-hostel', validateSession, (req, res) => {
    try {
        const {
            email,
            roomNumber,
            roommates,
            roommatesContacts,
            allotmentDate,
            wardenName,
            contactNumber
        } = req.body;

        // Validation
        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'User email is required'
            });
        }

        if (!roomNumber || !allotmentDate || !contactNumber) {
            return res.status(400).json({
                success: false,
                error: 'Room number, allotment date, and contact number are required'
            });
        }

        const users = loadUsers();
        const user = users[email];
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        if (user.role !== 'student') {
            return res.status(403).json({
                success: false,
                error: 'Hostel management is only available for students'
            });
        }
        
        // Check if student already has complete hostel information
        if (user.hostelInfo && user.hostelInfo.isComplete) {
            return res.status(403).json({
                success: false,
                error: 'Hostel information is already complete and cannot be edited by students. Please contact administration for any changes.'
            });
        }

        // Create hostel information object
        const hostelInfo = {
            roomNumber: roomNumber.trim(),
            roommates: Array.isArray(roommates) ? roommates.filter(name => name.trim()).map(name => name.trim()) : [],
            roommatesContacts: Array.isArray(roommatesContacts) ? roommatesContacts.filter(contact => contact.trim()).map(contact => contact.trim()) : [],
            allotmentDate: allotmentDate,
            wardenName: wardenName?.trim() || 'Akarshan Raj Rohan',
            contactNumber: contactNumber.trim(),
            lastUpdated: new Date().toISOString(),
            isComplete: true
        };

        // Validate roommates and contacts arrays match
        if (hostelInfo.roommates.length !== hostelInfo.roommatesContacts.length) {
            return res.status(400).json({
                success: false,
                error: 'Number of roommate names must match number of contact numbers'
            });
        }

        // Update user profile with hostel information
        users[email].hostelInfo = hostelInfo;
        users[email].lastHostelUpdate = new Date().toISOString();

        // Also maintain a separate hostel database for admin queries
        const hostelData = loadHostelData();
        hostelData[email] = {
            ...hostelInfo,
            studentEmail: email,
            studentName: user.name,
            studentId: user.studentId,
            course: user.course,
            year: user.year,
            semester: user.semester
        };

        // Save both files
        const usersSaved = saveUsers(users);
        const hostelSaved = saveHostelData(hostelData);

        if (usersSaved && hostelSaved) {
            console.log(`✅ Hostel information updated for: ${email}`);
            res.json({
                success: true,
                message: 'Hostel information updated successfully',
                hostelData: hostelInfo
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to save hostel information'
            });
        }

    } catch (error) {
        console.error('Update hostel info error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update hostel information'
        });
    }
});

// Admin: Get all hostel data
router.get('/admin/all-hostelers', validateSession, (req, res) => {
    try {
        // Note: In production, add admin role validation here
        
        const hostelData = loadHostelData();
        const hostelers = Object.values(hostelData);

        res.json({
            success: true,
            hostelers: hostelers,
            totalCount: hostelers.length
        });

    } catch (error) {
        console.error('Get all hostelers error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch hostelers data'
        });
    }
});

// Admin: Get hostel statistics
router.get('/admin/hostel-stats', validateSession, (req, res) => {
    try {
        const hostelData = loadHostelData();
        const hostelers = Object.values(hostelData);
        
        // Calculate statistics
        const totalHostelers = hostelers.length;
        const roomStats = {};
        const wardenStats = {};
        const courseStats = {};
        
        hostelers.forEach(hosteler => {
            // Room occupancy
            const occupancy = hosteler.roommates.length + 1; // +1 for the student themselves
            if (!roomStats[occupancy]) roomStats[occupancy] = 0;
            roomStats[occupancy]++;
            
            // Warden distribution
            const warden = hosteler.wardenName || 'Akarshan Raj Rohan';
            if (!wardenStats[warden]) wardenStats[warden] = 0;
            wardenStats[warden]++;
            
            // Course distribution
            const course = hosteler.course || 'Unknown';
            if (!courseStats[course]) courseStats[course] = 0;
            courseStats[course]++;
        });
        
        res.json({
            success: true,
            stats: {
                totalHostelers,
                roomOccupancyStats: roomStats,
                wardenStats: wardenStats,
                courseStats: courseStats
            }
        });

    } catch (error) {
        console.error('Get hostel stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch hostel statistics'
        });
    }
});

// Admin: Update student's hostel information
router.post('/admin/update-student-hostel', validateSession, (req, res) => {
    try {
        // Note: In production, add admin role validation here
        
        const {
            studentEmail,
            roomNumber,
            roommates,
            roommatesContacts,
            allotmentDate,
            wardenName,
            contactNumber
        } = req.body;

        if (!studentEmail) {
            return res.status(400).json({
                success: false,
                error: 'Student email is required'
            });
        }

        const users = loadUsers();
        const user = users[studentEmail];
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Student not found'
            });
        }

        if (user.role !== 'student') {
            return res.status(403).json({
                success: false,
                error: 'Can only manage hostel data for students'
            });
        }

        // Create updated hostel information object
        const hostelInfo = {
            roomNumber: roomNumber?.trim() || '',
            roommates: Array.isArray(roommates) ? roommates.filter(name => name.trim()).map(name => name.trim()) : [],
            roommatesContacts: Array.isArray(roommatesContacts) ? roommatesContacts.filter(contact => contact.trim()).map(contact => contact.trim()) : [],
            allotmentDate: allotmentDate || '',
            wardenName: wardenName?.trim() || 'Akarshan Raj Rohan',
            contactNumber: contactNumber?.trim() || '',
            lastUpdated: new Date().toISOString(),
            updatedByAdmin: true,
            isComplete: !!(roomNumber && allotmentDate && contactNumber)
        };

        // Update user profile
        users[studentEmail].hostelInfo = hostelInfo;
        users[studentEmail].lastHostelUpdate = new Date().toISOString();

        // Update hostel database
        const hostelData = loadHostelData();
        hostelData[studentEmail] = {
            ...hostelInfo,
            studentEmail: studentEmail,
            studentName: user.name,
            studentId: user.studentId,
            course: user.course,
            year: user.year,
            semester: user.semester
        };

        // Save both files
        const usersSaved = saveUsers(users);
        const hostelSaved = saveHostelData(hostelData);

        if (usersSaved && hostelSaved) {
            console.log(`✅ Hostel information updated by admin for: ${studentEmail}`);
            res.json({
                success: true,
                message: 'Student hostel information updated successfully',
                hostelData: hostelInfo
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to save hostel information'
            });
        }

    } catch (error) {
        console.error('Admin update hostel info error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update student hostel information'
        });
    }
});

// Admin: Delete student's hostel information
router.delete('/admin/delete-student-hostel/:email', validateSession, (req, res) => {
    try {
        // Note: In production, add admin role validation here
        
        const studentEmail = req.params.email;

        if (!studentEmail) {
            return res.status(400).json({
                success: false,
                error: 'Student email is required'
            });
        }

        // Load both databases
        const users = loadUsers();
        const hostelData = loadHostelData();
        const user = users[studentEmail];
        const hostelRecord = hostelData[studentEmail];
        
        // Check if hostel record exists
        if (!hostelRecord) {
            return res.status(404).json({
                success: false,
                error: 'Hostel record not found'
            });
        }

        let usersSaved = true; // Default to true if no user record exists
        
        // If user record exists, remove hostel info from it
        if (user) {
            delete users[studentEmail].hostelInfo;
            delete users[studentEmail].lastHostelUpdate;
            usersSaved = saveUsers(users);
        }

        // Remove from hostel database
        delete hostelData[studentEmail];
        const hostelSaved = saveHostelData(hostelData);

        if (usersSaved && hostelSaved) {
            console.log(`✅ Hostel information deleted for: ${studentEmail}`);
            res.json({
                success: true,
                message: 'Student hostel information deleted successfully',
                deletedRecord: {
                    email: hostelRecord.studentEmail,
                    name: hostelRecord.studentName,
                    room: hostelRecord.roomNumber
                }
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to delete hostel information'
            });
        }

    } catch (error) {
        console.error('Admin delete hostel info error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete student hostel information'
        });
    }
});

// =======================
// QUICK ACTION ENDPOINTS
// =======================

// Submit Leave Hostel request
router.post('/quick-action/leave-hostel', uploadDocument.single('supportingDocument'), validateSession, (req, res) => {
    try {
        const {
            email,
            leaveType,
            leaveStartDate,
            leaveEndDate,
            purposeOfLeave,
            placeOfVisit,
            dateOfLeaving,
            timeOfLeaving,
            arrivalDate,
            arrivalTime,
            contactNoDuringLeave
        } = req.body;

        // Validation
        if (!email || !leaveType || !leaveStartDate || !leaveEndDate || !purposeOfLeave || !placeOfVisit) {
            return res.status(400).json({
                success: false,
                error: 'All required fields must be filled'
            });
        }

        const users = loadUsers();
        const user = users[email];
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        if (user.role !== 'student') {
            return res.status(403).json({
                success: false,
                error: 'Leave requests are only available for students'
            });
        }

        // Check if student has hostel information
        if (!user.hostelInfo || !user.hostelInfo.isComplete) {
            return res.status(400).json({
                success: false,
                error: 'Please complete your hostel information before submitting leave requests'
            });
        }

        const requestId = generateRequestId();
        
        // Prefer profile name over user.name if available
        const profiles = loadProfiles();
        const profile = profiles[email];
        const studentDisplayName = (profile && profile.studentName) ? profile.studentName : user.name;
        
        // Get course information from profile (with fallback to user object and then user.profile)
        const course = profile?.course || user.course || user.profile?.course || 'undefined';
        const currentSemester = profile?.currentSemester || user.currentSemester || user.profile?.currentSemester;
        // Calculate year from semester (1-2: 1st year, 3-4: 2nd year, 5-6: 3rd year, etc.)
        let year = profile?.year || user.year || user.profile?.year;
        if (!year && currentSemester) {
            year = Math.ceil(parseInt(currentSemester) / 2);
        } else if (!year) {
            year = 'undefined';
        }
        const semester = currentSemester || 'undefined';
        const studentId = profile?.studentId || user.studentId || user.profile?.studentId || 'undefined';
        
        // Create leave request object
        const leaveRequest = {
            id: requestId,
            type: 'leave_hostel',
            studentEmail: email,
            studentName: studentDisplayName,
            studentId: studentId,
            course: course,
            year: year,
            semester: semester,
            roomNumber: user.hostelInfo.roomNumber,
            
            // Form data
            leaveType: leaveType.trim(),
            leaveStartDate: leaveStartDate,
            leaveEndDate: leaveEndDate,
            purposeOfLeave: purposeOfLeave.trim(),
            placeOfVisit: placeOfVisit.trim(),
            dateOfLeaving: dateOfLeaving || leaveStartDate,
            timeOfLeaving: timeOfLeaving || '00:00:00',
            arrivalDate: arrivalDate || leaveEndDate,
            arrivalTime: arrivalTime || '00:00:00',
            contactNoDuringLeave: contactNoDuringLeave?.trim() || '',
            
            // File upload
            supportingDocument: req.file ? req.file.filename : null,
            supportingDocumentPath: req.file ? req.file.path : null,
            
            // Status tracking
            status: 'pending', // pending, approved, declined
            submittedAt: new Date().toISOString(),
            adminRemarks: null,
            reviewedAt: null,
            reviewedBy: null
        };

        // Save request
        const requests = loadRequests();
        requests.push(leaveRequest);
        
        if (saveRequests(requests)) {
            // Create notification for admin
            createNotification('new_request', email, studentDisplayName, requestId, 'Leave Hostel');
            
            console.log(`✅ Leave hostel request submitted: ${requestId} by ${email}`);
            res.json({
                success: true,
                message: 'Leave hostel request submitted successfully',
                requestId: requestId,
                request: leaveRequest
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to submit leave request'
            });
        }

    } catch (error) {
        console.error('Submit leave hostel request error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to submit leave hostel request'
        });
    }
});

// Submit Outing request
router.post('/quick-action/outing', uploadDocument.single('supportingDocument'), validateSession, (req, res) => {
    try {
        const {
            email,
            outingDate,
            outingStartTime,
            outingEndTime,
            purposeOfOuting,
            placeOfVisit,
            contactNoDuringOuting,
            expectedReturnTime
        } = req.body;

        // Validation
        if (!email || !outingDate || !outingStartTime || !outingEndTime || !purposeOfOuting || !placeOfVisit) {
            return res.status(400).json({
                success: false,
                error: 'All required fields must be filled'
            });
        }

        const users = loadUsers();
        const user = users[email];
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        if (user.role !== 'student') {
            return res.status(403).json({
                success: false,
                error: 'Outing requests are only available for students'
            });
        }

        // Check if student has hostel information
        if (!user.hostelInfo || !user.hostelInfo.isComplete) {
            return res.status(400).json({
                success: false,
                error: 'Please complete your hostel information before submitting outing requests'
            });
        }

        const requestId = generateRequestId();
        
        // Prefer profile name over user.name if available
        const profiles = loadProfiles();
        const profile = profiles[email];
        const studentDisplayName = (profile && profile.studentName) ? profile.studentName : user.name;
        
        // Get course information from profile (with fallback to user object and then user.profile)
        const course = profile?.course || user.course || user.profile?.course || 'undefined';
        const currentSemester = profile?.currentSemester || user.currentSemester || user.profile?.currentSemester;
        // Calculate year from semester (1-2: 1st year, 3-4: 2nd year, 5-6: 3rd year, etc.)
        let year = profile?.year || user.year || user.profile?.year;
        if (!year && currentSemester) {
            year = Math.ceil(parseInt(currentSemester) / 2);
        } else if (!year) {
            year = 'undefined';
        }
        const semester = currentSemester || 'undefined';
        const studentId = profile?.studentId || user.studentId || user.profile?.studentId || 'undefined';
        
        // Create outing request object
        const outingRequest = {
            id: requestId,
            type: 'outing',
            studentEmail: email,
            studentName: studentDisplayName,
            studentId: studentId,
            course: course,
            year: year,
            semester: semester,
            roomNumber: user.hostelInfo.roomNumber,
            
            // Form data
            outingDate: outingDate,
            outingStartTime: outingStartTime,
            outingEndTime: outingEndTime,
            purposeOfOuting: purposeOfOuting.trim(),
            placeOfVisit: placeOfVisit.trim(),
            contactNoDuringOuting: contactNoDuringOuting?.trim() || '',
            expectedReturnTime: expectedReturnTime || outingEndTime,
            
            // File upload
            supportingDocument: req.file ? req.file.filename : null,
            supportingDocumentPath: req.file ? req.file.path : null,
            
            // Status tracking
            status: 'pending', // pending, approved, declined
            submittedAt: new Date().toISOString(),
            adminRemarks: null,
            reviewedAt: null,
            reviewedBy: null
        };

        // Save request
        const requests = loadRequests();
        requests.push(outingRequest);
        
        if (saveRequests(requests)) {
            // Create notification for admin
            createNotification('new_request', email, studentDisplayName, requestId, 'Outing');
            
            console.log(`✅ Outing request submitted: ${requestId} by ${email}`);
            res.json({
                success: true,
                message: 'Outing request submitted successfully',
                requestId: requestId,
                request: outingRequest
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to submit outing request'
            });
        }

    } catch (error) {
        console.error('Submit outing request error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to submit outing request'
        });
    }
});

// Get student's own requests
router.get('/my-requests', validateSession, (req, res) => {
    try {
        const userEmail = req.query.email;
        
        if (!userEmail) {
            return res.status(400).json({
                success: false,
                error: 'User email is required'
            });
        }

        const users = loadUsers();
        const user = users[userEmail];
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        if (user.role !== 'student') {
            return res.status(403).json({
                success: false,
                error: 'Request history is only available for students'
            });
        }

        const requests = loadRequests();
        const userRequests = requests.filter(req => req.studentEmail === userEmail);
        
        // Sort by submission date (newest first)
        userRequests.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
        
        res.json({
            success: true,
            requests: userRequests,
            totalCount: userRequests.length
        });

    } catch (error) {
        console.error('Get student requests error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch requests'
        });
    }
});

// =======================
// ADMIN REQUEST MANAGEMENT
// =======================

// Admin: Get all pending requests
router.get('/admin/pending-requests', validateSession, (req, res) => {
    try {
        // Note: In production, add admin role validation here
        
        const requests = loadRequests();
        const pendingRequests = requests.filter(req => req.status === 'pending');
        
        // Sort by submission date (newest first)
        pendingRequests.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
        
        res.json({
            success: true,
            requests: pendingRequests,
            totalCount: pendingRequests.length
        });

    } catch (error) {
        console.error('Get pending requests error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch pending requests'
        });
    }
});

// Admin: Get all requests (with filters)
router.get('/admin/all-requests', validateSession, (req, res) => {
    try {
        // Note: In production, add admin role validation here
        
        const { status, type, studentEmail } = req.query;
        
        let requests = loadRequests();
        
        // Apply filters
        if (status) {
            requests = requests.filter(req => req.status === status);
        }
        if (type) {
            requests = requests.filter(req => req.type === type);
        }
        if (studentEmail) {
            requests = requests.filter(req => req.studentEmail === studentEmail);
        }
        
        // Sort by submission date (newest first)
        requests.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
        
        res.json({
            success: true,
            requests: requests,
            totalCount: requests.length
        });

    } catch (error) {
        console.error('Get all requests error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch requests'
        });
    }
});

// Admin: Approve/Decline request
router.post('/admin/review-request', validateSession, (req, res) => {
    try {
        // Note: In production, add admin role validation here
        
        const { requestId, action, adminRemarks, reviewedBy } = req.body;
        
        if (!requestId || !action || !reviewedBy) {
            return res.status(400).json({
                success: false,
                error: 'Request ID, action, and reviewer information are required'
            });
        }
        
        if (action !== 'approve' && action !== 'decline') {
            return res.status(400).json({
                success: false,
                error: 'Action must be either "approve" or "decline"'
            });
        }
        
        const requests = loadRequests();
        const requestIndex = requests.findIndex(req => req.id === requestId);
        
        if (requestIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Request not found'
            });
        }
        
        const request = requests[requestIndex];
        
        if (request.status !== 'pending') {
            return res.status(400).json({
                success: false,
                error: 'Only pending requests can be reviewed'
            });
        }
        
        // Update request status
        requests[requestIndex] = {
            ...request,
            status: action === 'approve' ? 'approved' : 'declined',
            adminRemarks: adminRemarks?.trim() || '',
            reviewedAt: new Date().toISOString(),
            reviewedBy: reviewedBy.trim()
        };
        
        if (saveRequests(requests)) {
            // Create notification for student
            const notificationType = action === 'approve' ? 'request_approved' : 'request_declined';
            const notificationMessage = `Your ${request.type === 'leave_hostel' ? 'Leave Hostel' : 'Outing'} request has been ${action === 'approve' ? 'approved' : 'declined'}`;
            
            createNotification(notificationType, request.studentEmail, request.studentName, requestId, request.type === 'leave_hostel' ? 'Leave Hostel' : 'Outing');
            
            console.log(`✅ Request ${requestId} ${action}d by ${reviewedBy}`);
            res.json({
                success: true,
                message: `Request ${action}d successfully`,
                request: requests[requestIndex]
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to update request status'
            });
        }

    } catch (error) {
        console.error('Review request error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to review request'
        });
    }
});

// =======================
// NOTIFICATION ENDPOINTS
// =======================

// Get notifications for admin
router.get('/admin/notifications', validateSession, (req, res) => {
    try {
        // Note: In production, add admin role validation here
        
        const notifications = loadNotifications();
        const adminNotifications = notifications.filter(notif => notif.forAdmin);
        
        // Sort by timestamp (newest first)
        adminNotifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        res.json({
            success: true,
            notifications: adminNotifications,
            unreadCount: adminNotifications.filter(notif => !notif.read).length
        });

    } catch (error) {
        console.error('Get admin notifications error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch notifications'
        });
    }
});

// Admin utility: sync studentName in existing requests by email
router.post('/admin/sync-request-names', validateSession, (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, error: 'Email is required' });
        }

        const users = loadUsers();
        const profiles = loadProfiles();
        const user = users[email];
        const profile = profiles[email];
        if (!user && !profile) {
            return res.status(404).json({ success: false, error: 'No user/profile found for given email' });
        }
        const newName = (profile && profile.studentName) ? profile.studentName : (user ? user.name : null);
        if (!newName) {
            return res.status(400).json({ success: false, error: 'No name found to sync' });
        }

        const requests = loadRequests();
        let updated = 0;
        for (let r of requests) {
            if (r.studentEmail === email && r.studentName !== newName) {
                r.studentName = newName;
                updated++;
            }
        }
        const saved = saveRequests(requests);
        return res.json({ success: saved, updated, nameUsed: newName });
    } catch (err) {
        console.error('Sync request names error:', err);
        return res.status(500).json({ success: false, error: 'Failed to sync request names' });
    }
});

// Get notifications for student
router.get('/student/notifications', validateSession, (req, res) => {
    try {
        const userEmail = req.query.email;
        
        if (!userEmail) {
            return res.status(400).json({
                success: false,
                error: 'User email is required'
            });
        }

        const notifications = loadNotifications();
        const studentNotifications = notifications.filter(notif => 
            notif.forStudent && notif.studentEmail === userEmail
        );
        
        // Sort by timestamp (newest first)
        studentNotifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        res.json({
            success: true,
            notifications: studentNotifications,
            unreadCount: studentNotifications.filter(notif => !notif.read).length
        });

    } catch (error) {
        console.error('Get student notifications error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch notifications'
        });
    }
});

// Admin: Delete individual request
router.delete('/requests/:requestId', validateSession, (req, res) => {
    try {
        // Note: In production, add admin role validation here
        
        const requestId = req.params.requestId;
        
        if (!requestId) {
            return res.status(400).json({
                success: false,
                error: 'Request ID is required'
            });
        }
        
        const requests = loadRequests();
        const requestIndex = requests.findIndex(req => req.id === requestId);
        
        if (requestIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Request not found'
            });
        }
        
        const deletedRequest = requests[requestIndex];
        
        // Remove the request from the array
        requests.splice(requestIndex, 1);
        
        if (saveRequests(requests)) {
            console.log(`🗑️ Request deleted: ${requestId} (${deletedRequest.type}) from ${deletedRequest.studentEmail}`);
            res.json({
                success: true,
                message: 'Request deleted successfully',
                deletedRequest: {
                    id: deletedRequest.id,
                    type: deletedRequest.type,
                    studentName: deletedRequest.studentName,
                    studentEmail: deletedRequest.studentEmail
                }
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to save changes after deletion'
            });
        }
        
    } catch (error) {
        console.error('Delete request error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete request'
        });
    }
});

// Admin: Bulk delete requests
router.post('/requests/bulk-delete', validateSession, (req, res) => {
    try {
        // Note: In production, add admin role validation here
        
        const { requestIds } = req.body;
        
        if (!requestIds || !Array.isArray(requestIds) || requestIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Request IDs array is required and must not be empty'
            });
        }
        
        const requests = loadRequests();
        const deletedRequests = [];
        const notFoundIds = [];
        
        // Find and collect requests to delete
        requestIds.forEach(requestId => {
            const requestIndex = requests.findIndex(req => req.id === requestId);
            if (requestIndex !== -1) {
                deletedRequests.push({
                    id: requests[requestIndex].id,
                    type: requests[requestIndex].type,
                    studentName: requests[requestIndex].studentName,
                    studentEmail: requests[requestIndex].studentEmail
                });
            } else {
                notFoundIds.push(requestId);
            }
        });
        
        if (deletedRequests.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'None of the specified requests were found',
                notFoundIds: notFoundIds
            });
        }
        
        // Remove all found requests (remove in reverse order to maintain indices)
        const indicesToRemove = [];
        requestIds.forEach(requestId => {
            const index = requests.findIndex(req => req.id === requestId);
            if (index !== -1) {
                indicesToRemove.push(index);
            }
        });
        
        // Sort indices in descending order and remove
        indicesToRemove.sort((a, b) => b - a);
        indicesToRemove.forEach(index => {
            requests.splice(index, 1);
        });
        
        if (saveRequests(requests)) {
            console.log(`🗑️ Bulk delete completed: ${deletedRequests.length} requests deleted`);
            deletedRequests.forEach(req => {
                console.log(`   - ${req.id} (${req.type}) from ${req.studentEmail}`);
            });
            
            res.json({
                success: true,
                message: `Successfully deleted ${deletedRequests.length} request(s)`,
                deletedCount: deletedRequests.length,
                deletedRequests: deletedRequests,
                notFoundIds: notFoundIds.length > 0 ? notFoundIds : undefined
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to save changes after bulk deletion'
            });
        }
        
    } catch (error) {
        console.error('Bulk delete requests error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to perform bulk delete operation'
        });
    }
});

// Mark notification as read
router.post('/notifications/mark-read', validateSession, (req, res) => {
    try {
        const { notificationId } = req.body;
        
        if (!notificationId) {
            return res.status(400).json({
                success: false,
                error: 'Notification ID is required'
            });
        }
        
        const notifications = loadNotifications();
        const notificationIndex = notifications.findIndex(notif => notif.id === notificationId);
        
        if (notificationIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Notification not found'
            });
        }
        
        notifications[notificationIndex].read = true;
        
        if (saveNotifications(notifications)) {
            res.json({
                success: true,
                message: 'Notification marked as read'
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to update notification'
            });
        }

    } catch (error) {
        console.error('Mark notification as read error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to mark notification as read'
        });
    }
});

module.exports = router;

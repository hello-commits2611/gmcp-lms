const express = require('express');
const router = express.Router();
const { getFirestore, getAdmin, createNotification } = require('../config/firebase-config');
const { sessionManager } = require('./auth');
const fs = require('fs');
const path = require('path');

// File path for local backup
const USERS_FILE = path.join(__dirname, '../data/users.json');

// Middleware to validate session
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

// Helper function to load users
const loadUsers = () => {
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(data) || {};
  } catch (error) {
    console.error('Error loading users:', error);
    return {};
  }
};

// Helper function to get all admin emails
const getAdminEmails = () => {
  try {
    const users = loadUsers();
    return Object.values(users)
      .filter(user => user.role === 'admin')
      .map(user => user.email);
  } catch (error) {
    console.error('Error getting admin emails:', error);
    return [];
  }
};

// POST /api/hostel-issues - Create new hostel issue (Student only)
router.post('/', validateSession, async (req, res) => {
  try {
    // Only students can report issues
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        error: 'Only students can report hostel issues'
      });
    }

    const { category, priority, description, roomNumber } = req.body;

    // Validation
    if (!category || !priority || !description) {
      return res.status(400).json({
        success: false,
        error: 'Category, priority, and description are required'
      });
    }

    const validCategories = ['Plumbing', 'Electrical', 'Cleanliness', 'Food Quality', 'Room Maintenance', 'Other'];
    const validPriorities = ['Low', 'Medium', 'High', 'Urgent'];

    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid category'
      });
    }

    if (!validPriorities.includes(priority)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid priority'
      });
    }

    const firestore = getFirestore();
    if (!firestore) {
      return res.status(500).json({
        success: false,
        error: 'Database not available'
      });
    }

    // Create issue document
    const issueRef = firestore.collection('hostel_issues').doc();
    const issueData = {
      id: issueRef.id,
      studentEmail: req.user.email,
      studentName: req.user.name || req.user.email,
      category,
      priority,
      description: description.trim(),
      roomNumber: roomNumber || 'Not specified',
      status: 'Pending',
      createdAt: getAdmin().firestore.FieldValue.serverTimestamp(),
      updatedAt: getAdmin().firestore.FieldValue.serverTimestamp(),
      adminNotes: '',
      resolvedBy: null,
      resolvedAt: null
    };

    await issueRef.set(issueData);

    // Create notifications for all admins
    const adminEmails = getAdminEmails();
    console.log(`📧 Creating notifications for ${adminEmails.length} admins`);

    const notificationPromises = adminEmails.map(adminEmail =>
      createNotification({
        recipientEmail: adminEmail,
        recipientRole: 'admin',
        type: 'hostel_issue_new',
        title: 'New Hostel Issue Reported',
        message: `${req.user.name || req.user.email} reported a ${priority} priority ${category} issue`,
        relatedIssueId: issueRef.id
      })
    );

    await Promise.all(notificationPromises);

    console.log(`✅ Issue created: ${issueRef.id} by ${req.user.email}`);

    res.json({
      success: true,
      message: 'Issue reported successfully',
      issueId: issueRef.id,
      issue: issueData
    });

  } catch (error) {
    console.error('Error creating hostel issue:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to report issue'
    });
  }
});

// GET /api/hostel-issues - Get hostel issues
router.get('/', validateSession, async (req, res) => {
  try {
    const firestore = getFirestore();
    if (!firestore) {
      return res.status(500).json({
        success: false,
        error: 'Database not available'
      });
    }

    const { status, limit = 50 } = req.query;

    let query = firestore.collection('hostel_issues');

    // If student, only show their issues
    if (req.user.role === 'student') {
      query = query.where('studentEmail', '==', req.user.email);
    }

    // Apply status filter if provided
    if (status && status !== 'All') {
      query = query.where('status', '==', status);
    }

    const snapshot = await query.get();

    const issues = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      issues.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
        resolvedAt: data.resolvedAt?.toDate?.() || null
      });
    });

    // Sort by creation date (newest first) in JavaScript
    issues.sort((a, b) => b.createdAt - a.createdAt);

    // Apply limit after sorting
    const limitedIssues = issues.slice(0, parseInt(limit));

    res.json({
      success: true,
      issues: limitedIssues,
      count: limitedIssues.length
    });

  } catch (error) {
    console.error('Error fetching hostel issues:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch issues'
    });
  }
});

// GET /api/hostel-issues/:id - Get specific issue
router.get('/:id', validateSession, async (req, res) => {
  try {
    const firestore = getFirestore();
    if (!firestore) {
      return res.status(500).json({
        success: false,
        error: 'Database not available'
      });
    }

    const { id } = req.params;
    const doc = await firestore.collection('hostel_issues').doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Issue not found'
      });
    }

    const issueData = doc.data();

    // Students can only view their own issues
    if (req.user.role === 'student' && issueData.studentEmail !== req.user.email) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    res.json({
      success: true,
      issue: {
        id: doc.id,
        ...issueData,
        createdAt: issueData.createdAt?.toDate?.() || new Date(),
        updatedAt: issueData.updatedAt?.toDate?.() || new Date(),
        resolvedAt: issueData.resolvedAt?.toDate?.() || null
      }
    });

  } catch (error) {
    console.error('Error fetching issue:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch issue'
    });
  }
});

// PATCH /api/hostel-issues/:id/status - Update issue status (Admin only)
router.patch('/:id/status', validateSession, async (req, res) => {
  try {
    // Only admins can update status
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admins can update issue status'
      });
    }

    const { id } = req.params;
    const { status, adminNotes } = req.body;

    // Validate status if provided
    const validStatuses = ['Pending', 'In Progress', 'Resolved', 'Rejected'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status'
      });
    }
    
    // At least one field must be provided
    if (!status && !adminNotes) {
      return res.status(400).json({
        success: false,
        error: 'Either status or adminNotes must be provided'
      });
    }

    const firestore = getFirestore();
    if (!firestore) {
      return res.status(500).json({
        success: false,
        error: 'Database not available'
      });
    }

    const issueRef = firestore.collection('hostel_issues').doc(id);
    const issueDoc = await issueRef.get();

    if (!issueDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Issue not found'
      });
    }

    const issueData = issueDoc.data();
    const oldStatus = issueData.status;

    // Prepare update data
    const updateData = {
      updatedAt: getAdmin().firestore.FieldValue.serverTimestamp()
    };
    
    // Only update status if provided
    if (status) {
      updateData.status = status;
      
      // If status is Resolved or Rejected, set resolvedBy and resolvedAt
      if (status === 'Resolved' || status === 'Rejected') {
        updateData.resolvedBy = req.user.email;
        updateData.resolvedAt = getAdmin().firestore.FieldValue.serverTimestamp();
      }
    }

    if (adminNotes) {
      updateData.adminNotes = adminNotes.trim();
    }

    await issueRef.update(updateData);

    // Create notification for student only if status was actually changed
    if (status && oldStatus !== status) {
      const statusMessages = {
        'In Progress': 'Your hostel issue is now being worked on',
        'Resolved': 'Your hostel issue has been resolved',
        'Rejected': 'Your hostel issue has been reviewed'
      };

      await createNotification({
        recipientEmail: issueData.studentEmail,
        recipientRole: 'student',
        type: 'hostel_issue_update',
        title: 'Hostel Issue Status Updated',
        message: statusMessages[status] || `Issue status changed to ${status}`,
        relatedIssueId: id
      });

      console.log(`✅ Issue ${id} status updated: ${oldStatus} → ${status} by ${req.user.email}`);
    }

    res.json({
      success: true,
      message: 'Issue status updated successfully',
      issue: {
        id,
        ...issueData,
        ...updateData
      }
    });

  } catch (error) {
    console.error('Error updating issue status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update issue status'
    });
  }
});

// GET /api/hostel-issues/stats/summary - Get issue statistics (Admin only)
router.get('/stats/summary', validateSession, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const firestore = getFirestore();
    if (!firestore) {
      return res.status(500).json({
        success: false,
        error: 'Database not available'
      });
    }

    const snapshot = await firestore.collection('hostel_issues').get();

    const stats = {
      total: 0,
      pending: 0,
      inProgress: 0,
      resolved: 0,
      rejected: 0,
      byCategory: {},
      byPriority: {}
    };

    snapshot.forEach(doc => {
      const data = doc.data();
      stats.total++;

      // Count by status
      if (data.status === 'Pending') stats.pending++;
      else if (data.status === 'In Progress') stats.inProgress++;
      else if (data.status === 'Resolved') stats.resolved++;
      else if (data.status === 'Rejected') stats.rejected++;

      // Count by category
      stats.byCategory[data.category] = (stats.byCategory[data.category] || 0) + 1;

      // Count by priority
      stats.byPriority[data.priority] = (stats.byPriority[data.priority] || 0) + 1;
    });

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Error fetching issue statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
});

// DELETE /api/hostel-issues/:id - Delete hostel issue (Admin only)
router.delete('/:id', validateSession, async (req, res) => {
  try {
    // Only admins can delete issues
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admins can delete hostel issues'
      });
    }

    const { id } = req.params;

    const firestore = getFirestore();
    if (!firestore) {
      return res.status(500).json({
        success: false,
        error: 'Database not available'
      });
    }

    const issueRef = firestore.collection('hostel_issues').doc(id);
    const issueDoc = await issueRef.get();

    if (!issueDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Issue not found'
      });
    }

    const issueData = issueDoc.data();

    // Delete the issue
    await issueRef.delete();

    console.log(`🗑️ Issue ${id} deleted by ${req.user.email}`);

    res.json({
      success: true,
      message: 'Issue deleted successfully',
      deletedIssue: {
        id,
        studentEmail: issueData.studentEmail,
        category: issueData.category
      }
    });

  } catch (error) {
    console.error('Error deleting issue:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete issue'
    });
  }
});

module.exports = router;

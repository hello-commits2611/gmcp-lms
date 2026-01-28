const express = require('express');
const router = express.Router();
const { 
  getUserNotifications, 
  getUnreadCount, 
  markNotificationAsRead, 
  markAllNotificationsAsRead 
} = require('../config/firebase-config');
const { sessionManager } = require('./auth');

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

// GET /api/notifications - Get user's notifications
router.get('/', validateSession, async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const notifications = await getUserNotifications(req.user.email, parseInt(limit));

    res.json({
      success: true,
      notifications,
      count: notifications.length
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notifications',
      notifications: []
    });
  }
});

// GET /api/notifications/unread-count - Get unread notification count
router.get('/unread-count', validateSession, async (req, res) => {
  try {
    const count = await getUnreadCount(req.user.email);

    res.json({
      success: true,
      count
    });

  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch unread count',
      count: 0
    });
  }
});

// PATCH /api/notifications/:id/read - Mark notification as read
router.patch('/:id/read', validateSession, async (req, res) => {
  try {
    const { id } = req.params;
    const success = await markNotificationAsRead(id);

    if (success) {
      res.json({
        success: true,
        message: 'Notification marked as read'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Notification not found or already marked as read'
      });
    }

  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read'
    });
  }
});

// PATCH /api/notifications/read-all - Mark all notifications as read
router.patch('/read-all', validateSession, async (req, res) => {
  try {
    const count = await markAllNotificationsAsRead(req.user.email);

    res.json({
      success: true,
      message: `${count} notification(s) marked as read`,
      count
    });

  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notifications as read',
      count: 0
    });
  }
});

module.exports = router;

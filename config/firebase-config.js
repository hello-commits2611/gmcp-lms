const admin = require('firebase-admin');
require('dotenv').config();

let db = null;
let isFirebaseInitialized = false;

/**
 * Initialize Firebase Admin SDK
 */
function initializeFirebase() {
  try {
    // Check if Firebase should be disabled
    if (process.env.DISABLE_FIREBASE === 'true') {
      console.log('⚠️  Firebase is disabled via DISABLE_FIREBASE environment variable');
      return null;
    }

    // Check if already initialized
    if (isFirebaseInitialized) {
      console.log('✅ Firebase already initialized');
      return db;
    }

    // Load service account from file or environment variable
    let serviceAccount;
    const fs = require('fs');
    const path = require('path');
    
    // Try to load from file first (more reliable)
    const serviceAccountPath = path.join(__dirname, 'firebase-service-account.json');
    if (fs.existsSync(serviceAccountPath)) {
      console.log('📄 Loading Firebase credentials from file');
      serviceAccount = require(serviceAccountPath);
    } else {
      // Fallback to environment variable
      try {
        const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT;
        if (!serviceAccountStr || serviceAccountStr === 'undefined') {
          throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not set');
        }
        serviceAccount = JSON.parse(serviceAccountStr);
      } catch (parseError) {
        throw new Error(`Failed to load Firebase credentials: ${parseError.message}`);
      }
    }

    // Initialize Firebase Admin
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
    });

    // Get Firestore instance
    db = admin.firestore();
    
    // Set Firestore settings
    db.settings({
      timestampsInSnapshots: true,
      ignoreUndefinedProperties: true
    });

    isFirebaseInitialized = true;
    console.log('✅ Firebase Admin SDK initialized successfully');
    console.log(`📦 Project ID: ${serviceAccount.project_id}`);
    
    return db;
  } catch (error) {
    console.error('❌ Failed to initialize Firebase:', error.message);
    return null;
  }
}

/**
 * Get Firestore database instance
 */
function getFirestore() {
  if (!db) {
    db = initializeFirebase();
  }
  return db;
}

/**
 * Check if Firebase is enabled and initialized
 */
function isFirebaseEnabled() {
  return isFirebaseInitialized && db !== null;
}

/**
 * Get Firebase Admin instance
 */
function getAdmin() {
  return admin;
}

/**
 * Create a notification in Firestore
 * @param {Object} notificationData - Notification data
 * @returns {Promise<string>} - Notification ID
 */
async function createNotification(notificationData) {
  try {
    const firestore = getFirestore();
    if (!firestore) {
      throw new Error('Firebase not initialized');
    }

    const notificationRef = firestore.collection('notifications').doc();
    const notification = {
      ...notificationData,
      id: notificationRef.id,
      isRead: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await notificationRef.set(notification);
    console.log(`✅ Notification created: ${notificationRef.id}`);
    
    return notificationRef.id;
  } catch (error) {
    console.error('❌ Error creating notification:', error);
    throw error;
  }
}

/**
 * Get user notifications
 * @param {string} userEmail - User email
 * @param {number} limit - Number of notifications to retrieve
 * @returns {Promise<Array>} - Array of notifications
 */
async function getUserNotifications(userEmail, limit = 50) {
  try {
    const firestore = getFirestore();
    if (!firestore) {
      return [];
    }

    const snapshot = await firestore
      .collection('notifications')
      .where('recipientEmail', '==', userEmail)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    const notifications = [];
    snapshot.forEach(doc => {
      notifications.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date()
      });
    });

    return notifications;
  } catch (error) {
    console.error('❌ Error getting notifications:', error);
    return [];
  }
}

/**
 * Get unread notification count
 * @param {string} userEmail - User email
 * @returns {Promise<number>} - Count of unread notifications
 */
async function getUnreadCount(userEmail) {
  try {
    const firestore = getFirestore();
    if (!firestore) {
      return 0;
    }

    const snapshot = await firestore
      .collection('notifications')
      .where('recipientEmail', '==', userEmail)
      .where('isRead', '==', false)
      .get();

    return snapshot.size;
  } catch (error) {
    console.error('❌ Error getting unread count:', error);
    return 0;
  }
}

/**
 * Mark notification as read
 * @param {string} notificationId - Notification ID
 * @returns {Promise<boolean>} - Success status
 */
async function markNotificationAsRead(notificationId) {
  try {
    const firestore = getFirestore();
    if (!firestore) {
      return false;
    }

    await firestore
      .collection('notifications')
      .doc(notificationId)
      .update({
        isRead: true,
        readAt: admin.firestore.FieldValue.serverTimestamp()
      });

    return true;
  } catch (error) {
    console.error('❌ Error marking notification as read:', error);
    return false;
  }
}

/**
 * Mark all notifications as read for a user
 * @param {string} userEmail - User email
 * @returns {Promise<number>} - Number of notifications marked as read
 */
async function markAllNotificationsAsRead(userEmail) {
  try {
    const firestore = getFirestore();
    if (!firestore) {
      return 0;
    }

    const snapshot = await firestore
      .collection('notifications')
      .where('recipientEmail', '==', userEmail)
      .where('isRead', '==', false)
      .get();

    const batch = firestore.batch();
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        isRead: true,
        readAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    await batch.commit();
    return snapshot.size;
  } catch (error) {
    console.error('❌ Error marking all notifications as read:', error);
    return 0;
  }
}

module.exports = {
  initializeFirebase,
  getFirestore,
  getAdmin,
  isFirebaseEnabled,
  createNotification,
  getUserNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead
};

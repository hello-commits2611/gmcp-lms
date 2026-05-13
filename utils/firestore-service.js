/**
 * Firestore Service - Unified data access layer
 * 
 * This service provides a simple interface for all data operations
 * All data is stored ONLY in Firebase Firestore
 */

const FirestoreDAO = require('./firestore-dao');

// Initialize all DAOs
const usersDAO = new FirestoreDAO('users');
const profilesDAO = new FirestoreDAO('profiles');
const hostelDAO = new FirestoreDAO('hostel');
const requestsDAO = new FirestoreDAO('requests');
const notificationsDAO = new FirestoreDAO('notifications');

class FirestoreService {
  // ========== USERS ==========
  
  async getUser(email) {
    return await usersDAO.findById(email);
  }

  async getAllUsers() {
    return await usersDAO.findAll({}, 1000);
  }

  async createUser(email, userData) {
    return await usersDAO.create(userData, email);
  }

  async updateUser(email, updates) {
    return await usersDAO.update(email, updates);
  }

  async deleteUser(email) {
    return await usersDAO.delete(email);
  }

  async getUsersByRole(role) {
    return await usersDAO.findByField('role', role);
  }

  // ========== PROFILES ==========

  async getProfile(email) {
    return await profilesDAO.findById(email);
  }

  async getAllProfiles() {
    return await profilesDAO.findAll({}, 1000);
  }

  async createProfile(email, profileData) {
    return await profilesDAO.create({ ...profileData, email }, email);
  }

  async updateProfile(email, updates) {
    return await profilesDAO.update(email, updates);
  }

  async deleteProfile(email) {
    return await profilesDAO.delete(email);
  }

  // ========== HOSTEL ==========

  async getHostelData(email) {
    return await hostelDAO.findById(email);
  }

  async getAllHostelData() {
    return await hostelDAO.findAll({}, 1000);
  }

  async createHostelData(email, hostelData) {
    return await hostelDAO.create({ ...hostelData, email }, email);
  }

  async updateHostelData(email, updates) {
    return await hostelDAO.update(email, updates);
  }

  async deleteHostelData(email) {
    return await hostelDAO.delete(email);
  }

  // ========== REQUESTS ==========

  async getRequest(requestId) {
    return await requestsDAO.findById(requestId);
  }

  async getAllRequests() {
    return await requestsDAO.findAll({}, 1000);
  }

  async getRequestsByStudent(studentEmail) {
    return await requestsDAO.findByField('studentInfo.studentEmail', studentEmail);
  }

  async getRequestsByStatus(status) {
    return await requestsDAO.findByField('status', status);
  }

  async createRequest(requestData) {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return await requestsDAO.create(requestData, requestId);
  }

  async updateRequest(requestId, updates) {
    return await requestsDAO.update(requestId, updates);
  }

  async deleteRequest(requestId) {
    return await requestsDAO.delete(requestId);
  }

  // ========== NOTIFICATIONS ==========

  async getNotification(notificationId) {
    return await notificationsDAO.findById(notificationId);
  }

  async getAllNotifications() {
    return await notificationsDAO.findAll({}, 1000, 'createdAt', 'desc');
  }

  async getNotificationsByRecipient(recipientEmail) {
    return await notificationsDAO.findByField('recipient', recipientEmail);
  }

  async getUnreadNotifications(recipientEmail) {
    const allNotifications = await notificationsDAO.findByField('recipient', recipientEmail);
    return allNotifications.filter(n => !n.read);
  }

  async createNotification(notificationData) {
    const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return await notificationsDAO.create(notificationData, notificationId);
  }

  async updateNotification(notificationId, updates) {
    return await notificationsDAO.update(notificationId, updates);
  }

  async markNotificationAsRead(notificationId) {
    return await notificationsDAO.update(notificationId, { read: true });
  }

  async deleteNotification(notificationId) {
    return await notificationsDAO.delete(notificationId);
  }

  // ========== CASCADE DELETE ==========

  async cascadeDeleteUser(email) {
    const results = {
      user: false,
      profile: false,
      hostel: false,
      requests: 0,
      notifications: 0
    };

    try {
      // Delete user
      const user = await this.getUser(email);
      if (user) {
        await this.deleteUser(email);
        results.user = true;
      }

      // Delete profile
      const profile = await this.getProfile(email);
      if (profile) {
        await this.deleteProfile(email);
        results.profile = true;
      }

      // Delete hostel data
      const hostel = await this.getHostelData(email);
      if (hostel) {
        await this.deleteHostelData(email);
        results.hostel = true;
      }

      // Delete requests
      const requests = await this.getRequestsByStudent(email);
      for (const request of requests) {
        await this.deleteRequest(request.id);
        results.requests++;
      }

      // Delete notifications
      const notifications = await this.getNotificationsByRecipient(email);
      for (const notification of notifications) {
        await this.deleteNotification(notification.id);
        results.notifications++;
      }

      return { success: true, ...results };
    } catch (error) {
      console.error('Cascade delete error:', error);
      return { success: false, error: error.message, ...results };
    }
  }

  // ========== UTILITY FUNCTIONS ==========

  // Convert old JSON-style users object to Firestore format
  convertUsersObjectToArray(usersObject) {
    return Object.entries(usersObject).map(([email, userData]) => ({
      email,
      ...userData
    }));
  }

  // Convert Firestore users array to old JSON-style object (for backwards compatibility)
  convertUsersArrayToObject(usersArray) {
    const usersObject = {};
    usersArray.forEach(user => {
      const { email, ...userData } = user;
      usersObject[email] = userData;
    });
    return usersObject;
  }
}

// Export singleton instance
module.exports = new FirestoreService();

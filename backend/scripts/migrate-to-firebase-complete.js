/**
 * Complete Migration Script: JSON Files to Firebase Firestore
 * 
 * This script migrates ALL data from JSON files to Firebase Firestore:
 * - users.json → 'users' collection
 * - profiles.json → 'profiles' collection
 * - hostel.json → 'hostel' collection
 * - requests.json → 'requests' collection
 * - notifications.json → 'notifications' collection
 * 
 * Run: node scripts/migrate-to-firebase-complete.js
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Initialize Firebase Admin
if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.error('❌ FIREBASE_SERVICE_ACCOUNT environment variable not found!');
  console.error('Make sure your .env file is configured properly.');
  process.exit(1);
}

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('✅ Firebase Admin initialized successfully');
}

const db = admin.firestore();

// File paths
const DATA_DIR = path.join(__dirname, '../data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const PROFILES_FILE = path.join(DATA_DIR, 'profiles.json');
const HOSTEL_FILE = path.join(DATA_DIR, 'hostel.json');
const REQUESTS_FILE = path.join(DATA_DIR, 'requests.json');
const NOTIFICATIONS_FILE = path.join(DATA_DIR, 'notifications.json');

// Load JSON file helper
const loadJSON = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error.message);
  }
  return null;
};

// Migrate users collection
const migrateUsers = async () => {
  console.log('\n📋 Starting USERS migration...');
  
  const users = loadJSON(USERS_FILE);
  if (!users) {
    console.log('❌ No users.json file found');
    return { success: false, count: 0 };
  }

  const userEntries = Object.entries(users);
  if (userEntries.length === 0) {
    console.log('⚠️  No users to migrate');
    return { success: true, count: 0 };
  }

  let successCount = 0;
  let errorCount = 0;

  const batch = db.batch();
  const batchSize = 500; // Firestore batch limit
  let currentBatch = 0;

  for (const [email, userData] of userEntries) {
    try {
      const docRef = db.collection('users').doc(email);
      
      // Prepare user data
      const firestoreData = {
        email: email,
        name: userData.name || '',
        role: userData.role || 'student',
        password: userData.password || '', // Keep hashed password
        status: userData.status || 'active',
        unifiedId: userData.unifiedId || '',
        lastLogin: userData.lastLogin || null,
        mustChangePassword: userData.mustChangePassword || false,
        createdAt: userData.createdAt || admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      batch.set(docRef, firestoreData, { merge: true });
      currentBatch++;

      // Commit batch if limit reached
      if (currentBatch >= batchSize) {
        await batch.commit();
        console.log(`✅ Committed batch of ${currentBatch} users`);
        currentBatch = 0;
      }

      successCount++;
    } catch (error) {
      console.error(`❌ Error migrating user ${email}:`, error.message);
      errorCount++;
    }
  }

  // Commit remaining
  if (currentBatch > 0) {
    await batch.commit();
    console.log(`✅ Committed final batch of ${currentBatch} users`);
  }

  console.log(`✅ Users migration complete: ${successCount} migrated, ${errorCount} errors`);
  return { success: true, count: successCount };
};

// Migrate profiles collection
const migrateProfiles = async () => {
  console.log('\n📋 Starting PROFILES migration...');
  
  const profiles = loadJSON(PROFILES_FILE);
  if (!profiles) {
    console.log('❌ No profiles.json file found');
    return { success: false, count: 0 };
  }

  const profileEntries = Object.entries(profiles);
  if (profileEntries.length === 0) {
    console.log('⚠️  No profiles to migrate');
    return { success: true, count: 0 };
  }

  let successCount = 0;
  let errorCount = 0;

  const batch = db.batch();
  let currentBatch = 0;

  for (const [key, profileData] of profileEntries) {
    try {
      // Use email as document ID (normalize if needed)
      const email = profileData.email || (key.includes('@') ? key : `${key}@gmcpnalanda.com`);
      const docRef = db.collection('profiles').doc(email);
      
      const firestoreData = {
        ...profileData,
        email: email,
        createdAt: profileData.createdAt || admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      batch.set(docRef, firestoreData, { merge: true });
      currentBatch++;

      if (currentBatch >= 500) {
        await batch.commit();
        console.log(`✅ Committed batch of ${currentBatch} profiles`);
        currentBatch = 0;
      }

      successCount++;
    } catch (error) {
      console.error(`❌ Error migrating profile ${key}:`, error.message);
      errorCount++;
    }
  }

  if (currentBatch > 0) {
    await batch.commit();
    console.log(`✅ Committed final batch of ${currentBatch} profiles`);
  }

  console.log(`✅ Profiles migration complete: ${successCount} migrated, ${errorCount} errors`);
  return { success: true, count: successCount };
};

// Migrate hostel collection
const migrateHostel = async () => {
  console.log('\n📋 Starting HOSTEL migration...');
  
  const hostelData = loadJSON(HOSTEL_FILE);
  if (!hostelData) {
    console.log('❌ No hostel.json file found');
    return { success: false, count: 0 };
  }

  const hostelEntries = Object.entries(hostelData);
  if (hostelEntries.length === 0) {
    console.log('⚠️  No hostel data to migrate');
    return { success: true, count: 0 };
  }

  let successCount = 0;
  let errorCount = 0;

  const batch = db.batch();
  let currentBatch = 0;

  for (const [email, studentHostelData] of hostelEntries) {
    try {
      const docRef = db.collection('hostel').doc(email);
      
      const firestoreData = {
        ...studentHostelData,
        email: email,
        createdAt: studentHostelData.createdAt || admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      batch.set(docRef, firestoreData, { merge: true });
      currentBatch++;

      if (currentBatch >= 500) {
        await batch.commit();
        console.log(`✅ Committed batch of ${currentBatch} hostel records`);
        currentBatch = 0;
      }

      successCount++;
    } catch (error) {
      console.error(`❌ Error migrating hostel data for ${email}:`, error.message);
      errorCount++;
    }
  }

  if (currentBatch > 0) {
    await batch.commit();
    console.log(`✅ Committed final batch of ${currentBatch} hostel records`);
  }

  console.log(`✅ Hostel migration complete: ${successCount} migrated, ${errorCount} errors`);
  return { success: true, count: successCount };
};

// Migrate requests collection
const migrateRequests = async () => {
  console.log('\n📋 Starting REQUESTS migration...');
  
  const requests = loadJSON(REQUESTS_FILE);
  if (!requests || !Array.isArray(requests)) {
    console.log('❌ No requests.json file found or invalid format');
    return { success: false, count: 0 };
  }

  if (requests.length === 0) {
    console.log('⚠️  No requests to migrate');
    return { success: true, count: 0 };
  }

  let successCount = 0;
  let errorCount = 0;

  const batch = db.batch();
  let currentBatch = 0;

  for (const request of requests) {
    try {
      // Generate ID if not present
      const docId = request.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const docRef = db.collection('requests').doc(docId);
      
      const firestoreData = {
        ...request,
        id: docId,
        createdAt: request.createdAt || admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      batch.set(docRef, firestoreData, { merge: true });
      currentBatch++;

      if (currentBatch >= 500) {
        await batch.commit();
        console.log(`✅ Committed batch of ${currentBatch} requests`);
        currentBatch = 0;
      }

      successCount++;
    } catch (error) {
      console.error(`❌ Error migrating request:`, error.message);
      errorCount++;
    }
  }

  if (currentBatch > 0) {
    await batch.commit();
    console.log(`✅ Committed final batch of ${currentBatch} requests`);
  }

  console.log(`✅ Requests migration complete: ${successCount} migrated, ${errorCount} errors`);
  return { success: true, count: successCount };
};

// Migrate notifications collection
const migrateNotifications = async () => {
  console.log('\n📋 Starting NOTIFICATIONS migration...');
  
  const notifications = loadJSON(NOTIFICATIONS_FILE);
  if (!notifications || !Array.isArray(notifications)) {
    console.log('❌ No notifications.json file found or invalid format');
    return { success: false, count: 0 };
  }

  if (notifications.length === 0) {
    console.log('⚠️  No notifications to migrate');
    return { success: true, count: 0 };
  }

  let successCount = 0;
  let errorCount = 0;

  const batch = db.batch();
  let currentBatch = 0;

  for (const notification of notifications) {
    try {
      const docId = notification.id || `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const docRef = db.collection('notifications').doc(docId);
      
      const firestoreData = {
        ...notification,
        id: docId,
        createdAt: notification.createdAt || admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      batch.set(docRef, firestoreData, { merge: true });
      currentBatch++;

      if (currentBatch >= 500) {
        await batch.commit();
        console.log(`✅ Committed batch of ${currentBatch} notifications`);
        currentBatch = 0;
      }

      successCount++;
    } catch (error) {
      console.error(`❌ Error migrating notification:`, error.message);
      errorCount++;
    }
  }

  if (currentBatch > 0) {
    await batch.commit();
    console.log(`✅ Committed final batch of ${currentBatch} notifications`);
  }

  console.log(`✅ Notifications migration complete: ${successCount} migrated, ${errorCount} errors`);
  return { success: true, count: successCount };
};

// Main migration function
const runMigration = async () => {
  console.log('🚀 ====================================');
  console.log('🚀 COMPLETE FIREBASE MIGRATION STARTED');
  console.log('🚀 ====================================');
  console.log(`📅 Date: ${new Date().toISOString()}`);
  console.log(`📂 Data directory: ${DATA_DIR}`);
  
  const results = {
    users: { success: false, count: 0 },
    profiles: { success: false, count: 0 },
    hostel: { success: false, count: 0 },
    requests: { success: false, count: 0 },
    notifications: { success: false, count: 0 }
  };

  try {
    // Migrate all collections
    results.users = await migrateUsers();
    results.profiles = await migrateProfiles();
    results.hostel = await migrateHostel();
    results.requests = await migrateRequests();
    results.notifications = await migrateNotifications();

    // Summary
    console.log('\n✅ ====================================');
    console.log('✅ MIGRATION COMPLETED SUCCESSFULLY');
    console.log('✅ ====================================');
    console.log(`📊 Users migrated: ${results.users.count}`);
    console.log(`📊 Profiles migrated: ${results.profiles.count}`);
    console.log(`📊 Hostel records migrated: ${results.hostel.count}`);
    console.log(`📊 Requests migrated: ${results.requests.count}`);
    console.log(`📊 Notifications migrated: ${results.notifications.count}`);
    console.log(`📊 Total records: ${results.users.count + results.profiles.count + results.hostel.count + results.requests.count + results.notifications.count}`);
    
    console.log('\n📝 NEXT STEPS:');
    console.log('1. Verify data in Firebase Console: https://console.firebase.google.com/');
    console.log('2. Test your application with Firebase data');
    console.log('3. Backup JSON files to a safe location');
    console.log('4. Update deployment folder to remove backend/data');
    console.log('5. Deploy with confidence - all data is in Firebase!');

  } catch (error) {
    console.error('\n❌ ====================================');
    console.error('❌ MIGRATION FAILED');
    console.error('❌ ====================================');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    // Exit process
    process.exit(0);
  }
};

// Run migration
runMigration();

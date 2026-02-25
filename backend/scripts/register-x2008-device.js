#!/usr/bin/env node
/**
 * X2008 Biometric Device Registration Script
 * 
 * This script registers the X2008 biometric device in Firestore.
 * Run this after deploying to production/Render to set up the device.
 * 
 * Usage:
 *   node scripts/register-x2008-device.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
function initializeFirebase() {
  try {
    // Check if already initialized
    if (admin.apps.length > 0) {
      console.log('✅ Firebase already initialized');
      return admin.firestore();
    }

    // Try to load from environment variable (for Render)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('✅ Firebase initialized from environment variable');
    } 
    // Try to load from file (for local development)
    else {
      const serviceAccountPath = path.join(__dirname, '..', 'config', 'firebase-service-account.json');
      const serviceAccount = require(serviceAccountPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('✅ Firebase initialized from service account file');
    }

    return admin.firestore();
  } catch (error) {
    console.error('❌ Failed to initialize Firebase:', error.message);
    process.exit(1);
  }
}

// X2008 Device Configuration
const X2008_DEVICE = {
  deviceInfo: {
    deviceId: 'CUB7250700545',
    model: 'X2008',
    manufacturer: 'eSSL',
    serialNumber: 'CUB7250700545',
    firmwareVersion: 'Ver 6.4.0 Dec 26 2024'
  },
  networkInfo: {
    ipAddress: '192.168.60.74', // Local network IP
    port: 3000,
    protocol: 'ADMS',
    connectionType: 'push' // Device pushes data to server
  },
  location: {
    name: 'Main Entrance',
    building: 'Main Building',
    floor: 'Ground Floor',
    description: 'Primary biometric attendance device for all staff and students'
  },
  configuration: {
    duplicateCheckWindow: 300, // 5 minutes in seconds
    timezone: 'Asia/Kolkata',
    autoSync: true,
    syncInterval: 60 // seconds
  },
  status: {
    isActive: true,
    lastSeen: admin.firestore.Timestamp.now(),
    connectionStatus: 'configured',
    totalUsers: 0
  },
  metadata: {
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now(),
    createdBy: 'system',
    notes: 'X2008 biometric device configured for GMCP LMS attendance tracking'
  }
};

// Register device in Firestore
async function registerDevice() {
  console.log('\n🔧 X2008 Biometric Device Registration\n');
  
  const db = initializeFirebase();
  const devicesCollection = db.collection('biometric_devices');
  
  try {
    // Check if device already exists
    const existingDevice = await devicesCollection
      .where('deviceInfo.deviceId', '==', X2008_DEVICE.deviceInfo.deviceId)
      .limit(1)
      .get();
    
    if (!existingDevice.empty) {
      console.log('⚠️  Device already registered');
      const deviceDoc = existingDevice.docs[0];
      console.log(`   Device ID: ${deviceDoc.id}`);
      console.log(`   Model: ${X2008_DEVICE.deviceInfo.model}`);
      console.log(`   Location: ${X2008_DEVICE.location.name}`);
      console.log(`   Serial Number: ${X2008_DEVICE.deviceInfo.serialNumber}`);
      
      // Update last seen timestamp
      await deviceDoc.ref.update({
        'status.lastSeen': admin.firestore.Timestamp.now(),
        'metadata.updatedAt': admin.firestore.Timestamp.now()
      });
      console.log('✅ Device last seen timestamp updated');
      return deviceDoc.id;
    }
    
    // Register new device
    console.log('📝 Registering new device...');
    const deviceRef = await devicesCollection.add(X2008_DEVICE);
    console.log('✅ Device registered successfully!');
    console.log(`   Device Document ID: ${deviceRef.id}`);
    console.log(`   Device ID: ${X2008_DEVICE.deviceInfo.deviceId}`);
    console.log(`   Model: ${X2008_DEVICE.deviceInfo.model}`);
    console.log(`   Location: ${X2008_DEVICE.location.name}`);
    console.log(`   IP Address: ${X2008_DEVICE.networkInfo.ipAddress}`);
    console.log(`   Port: ${X2008_DEVICE.networkInfo.port}`);
    
    return deviceRef.id;
  } catch (error) {
    console.error('❌ Failed to register device:', error.message);
    throw error;
  }
}

// Display device configuration info
function displayDeviceInfo() {
  console.log('\n📋 X2008 Device Configuration:\n');
  console.log('Device Settings:');
  console.log(`   Server Mode: ${X2008_DEVICE.networkInfo.protocol}`);
  console.log(`   Server Address: ${X2008_DEVICE.networkInfo.ipAddress}`);
  console.log(`   Server Port: ${X2008_DEVICE.networkInfo.port}`);
  console.log(`   Proxy: Off`);
  console.log(`   Domain Name: Disabled`);
  
  console.log('\nAPI Endpoints:');
  console.log(`   POST http://${X2008_DEVICE.networkInfo.ipAddress}:${X2008_DEVICE.networkInfo.port}/api/biometric/iclock/cdata`);
  console.log(`   GET  http://${X2008_DEVICE.networkInfo.ipAddress}:${X2008_DEVICE.networkInfo.port}/api/biometric/iclock/getrequest`);
  
  console.log('\nNext Steps:');
  console.log('   1. Enroll users with: PUT /api/biometric/users/:userId/enroll');
  console.log('   2. Test device punch: POST /api/biometric/iclock/cdata');
  console.log('   3. View attendance: GET /api/biometric/attendance/:userId');
  console.log('   4. Check device status in admin portal: Biometric Attendance → Devices');
}

// Main execution
(async () => {
  try {
    await registerDevice();
    displayDeviceInfo();
    console.log('\n✅ X2008 device registration complete!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Device registration failed:', error);
    process.exit(1);
  }
})();

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Initialize Firebase
const serviceAccountPath = path.join(__dirname, '../config/firebase-service-account.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Firebase credentials file not found at:', serviceAccountPath);
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function debugUserData() {
  console.log('🔍 Checking user data for hi@gmcpnalanda.com...\n');
  
  try {
    const userDoc = await db.collection('users').doc('hi@gmcpnalanda.com').get();
    
    if (!userDoc.exists) {
      console.log('❌ User not found!');
      process.exit(1);
    }
    
    const userData = userDoc.data();
    
    console.log('📋 User Data:');
    console.log('=====================================');
    console.log('Email:', userData.email);
    console.log('Name:', userData.name);
    console.log('Role:', userData.role);
    console.log('Student ID:', userData.studentId);
    console.log('Employee ID:', userData.employeeId);
    console.log('Biometric ID:', userData.biometricId);
    console.log('=====================================\n');
    
    console.log('🔍 Full user object:');
    console.log(JSON.stringify(userData, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the debug
debugUserData();

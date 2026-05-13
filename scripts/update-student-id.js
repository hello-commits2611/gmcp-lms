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

async function updateStudentId() {
  console.log('🔧 Updating studentId for hi@gmcpnalanda.com...\n');
  
  try {
    const userEmail = 'hi@gmcpnalanda.com';
    const newStudentId = '12345';
    
    // Update the user document
    await db.collection('users').doc(userEmail).update({
      studentId: newStudentId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`✅ Successfully updated studentId to: ${newStudentId}`);
    console.log(`📧 User: ${userEmail}\n`);
    
    // Verify the update
    const userDoc = await db.collection('users').doc(userEmail).get();
    const userData = userDoc.data();
    
    console.log('📋 Verification:');
    console.log('=====================================');
    console.log('Email:', userData.email);
    console.log('Name:', userData.name);
    console.log('Student ID:', userData.studentId);
    console.log('=====================================\n');
    
    console.log('✅ Update complete! The attendance page will now show the correct Student ID.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the update
updateStudentId();

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '..', 'config', 'firebase-service-account.json');
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkAttendance() {
  try {
    console.log('Checking attendance records...\n');
    
    // Get all attendance records
    const snapshot = await db.collection('attendance')
      .limit(10)
      .get();
    
    console.log(`Total records found: ${snapshot.size}\n`);
    
    if (snapshot.empty) {
      console.log('No attendance records found!');
      return;
    }
    
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log('Record ID:', doc.id);
      console.log('User ID:', data.userId);
      console.log('Student ID:', data.studentId);
      console.log('Date:', data.attendance?.date);
      console.log('Type:', data.attendance?.type);
      console.log('Status:', data.attendance?.status);
      console.log('Template ID:', data.biometricData?.templateId);
      
      // Handle timestamp
      if (data.attendance?.timestamp) {
        const timestamp = data.attendance.timestamp.toDate();
        console.log('Timestamp:', timestamp.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
      }
      
      console.log('---\n');
    });
    
  } catch (error) {
    console.error('Error checking attendance:', error.message);
  }
  
  process.exit(0);
}

checkAttendance();

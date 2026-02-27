const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '..', 'config', 'firebase-service-account.json');
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function testIndexes() {
  console.log('Testing Firestore Indexes...\n');
  
  // Test 1: Daily report query (attendance.date + attendance.timestamp)
  console.log('1️⃣  Testing daily report query...');
  try {
    const dailySnapshot = await db.collection('attendance')
      .where('attendance.date', '==', '2026-02-26')
      .orderBy('attendance.timestamp', 'asc')
      .limit(10)
      .get();
    
    console.log(`   ✅ SUCCESS: Found ${dailySnapshot.size} records for date 2026-02-26`);
    
    dailySnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`      - ${data.userId}: ${data.attendance.type} at ${data.attendance.timestamp.toDate().toLocaleTimeString('en-IN')}`);
    });
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
    if (error.message.includes('index')) {
      console.log('      → Index not ready yet. Please wait and try again.');
    }
  }
  
  console.log('');
  
  // Test 2: User attendance query (userId + attendance.timestamp)
  console.log('2️⃣  Testing user attendance query...');
  try {
    const userSnapshot = await db.collection('attendance')
      .where('userId', '==', 'uttchrist@gmcpnalanda.com')
      .orderBy('attendance.timestamp', 'desc')
      .limit(10)
      .get();
    
    console.log(`   ✅ SUCCESS: Found ${userSnapshot.size} records for uttchrist@gmcpnalanda.com`);
    
    userSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`      - ${data.attendance.date}: ${data.attendance.type} at ${data.attendance.timestamp.toDate().toLocaleTimeString('en-IN')}`);
    });
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
    if (error.message.includes('index')) {
      console.log('      → Index not ready yet. Please wait and try again.');
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('Index Status Check Complete');
  console.log('='.repeat(60) + '\n');
  
  process.exit(0);
}

testIndexes();

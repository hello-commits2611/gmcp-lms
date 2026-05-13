const admin = require('firebase-admin');
const serviceAccount = require('./config/firebase-service-account.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkAttendance() {
    try {
        console.log('🔍 Checking Firestore for attendance records...\n');
        
        const snapshot = await db.collection('attendance')
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();
        
        if (snapshot.empty) {
            console.log('📭 No attendance records found in Firestore');
        } else {
            console.log(`📊 Found ${snapshot.size} attendance record(s):\n`);
            snapshot.forEach(doc => {
                const data = doc.data();
                console.log(`ID: ${doc.id}`);
                console.log(`User: ${data.userId || 'N/A'}`);
                console.log(`Type: ${data.attendance?.type || 'N/A'}`);
                console.log(`Time: ${data.attendance?.timestamp || 'N/A'}`);
                console.log(`Date: ${data.attendance?.date || 'N/A'}`);
                console.log(`Device: ${data.device?.deviceId || 'N/A'}`);
                console.log(`Template ID: ${data.biometric?.templateId || 'N/A'}`);
                console.log('---');
            });
        }
        
        // Also check biometric_devices collection
        console.log('\n🔍 Checking registered biometric devices...\n');
        const devicesSnapshot = await db.collection('biometric_devices').get();
        
        if (devicesSnapshot.empty) {
            console.log('📭 No biometric devices registered');
        } else {
            console.log(`🔌 Found ${devicesSnapshot.size} registered device(s):\n`);
            devicesSnapshot.forEach(doc => {
                const data = doc.data();
                console.log(`Device ID: ${doc.id}`);
                console.log(`Model: ${data.deviceInfo?.model || 'N/A'}`);
                console.log(`Status: ${data.status || 'N/A'}`);
                console.log(`Last Seen: ${data.lastSeen ? new Date(data.lastSeen._seconds * 1000).toISOString() : 'N/A'}`);
                console.log('---');
            });
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkAttendance();

const axios = require('axios');

async function testPunch() {
    console.log('🧪 Testing biometric punch simulation...\n');
    
    // Simulate what the X2008 device sends when it has attendance data
    const headers = {
        'Content-Type': 'text/plain',
        'SN': 'CUB7250700545'
    };
    
    // ADMS format: PUNCH\tUserID\tDateTime\tPunchState\tVerifyType\tWorkCode
    // UserID = 1 (the one we enrolled)
    // DateTime = current time
    // PunchState = 0 (IN), 1 (OUT)
    // VerifyType = 1 (fingerprint)
    // WorkCode = 0 (default)
    
    const now = new Date();
    const dateTimeStr = now.toISOString().slice(0, 19).replace('T', ' ');
    
    // X2008 ADMS sends data in this exact format (tab-separated)
    const punchData = `PUNCH\t1\t${dateTimeStr}\t0\t1\t0`;
    
    console.log('📤 Sending punch data to server:');
    console.log(`   Device: CUB7250700545`);
    console.log(`   User ID: 1`);
    console.log(`   Time: ${dateTimeStr}`);
    console.log(`   Type: IN\n`);
    
    try {
        const response = await axios.post(
            'http://localhost:3000/api/biometric/iclock/cdata',
            punchData,
            { headers }
        );
        
        console.log('✅ Server Response:', response.data);
        console.log('\n🔍 Now checking if it was saved...\n');
        
        // Wait a moment for data to be saved
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if saved
        const admin = require('firebase-admin');
        const serviceAccount = require('./config/firebase-service-account.json');
        
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        }
        
        const db = admin.firestore();
        const snapshot = await db.collection('attendance')
            .orderBy('createdAt', 'desc')
            .limit(1)
            .get();
        
        if (snapshot.empty) {
            console.log('❌ No attendance records found in database');
        } else {
            console.log('✅ SUCCESS! Attendance record found:\n');
            const doc = snapshot.docs[0];
            const data = doc.data();
            console.log(`   User: ${data.userId}`);
            console.log(`   Type: ${data.attendance?.type}`);
            console.log(`   Time: ${data.attendance?.timestamp}`);
            console.log(`   Device: ${data.device?.deviceId}`);
            console.log(`   Template ID: ${data.biometric?.templateId}`);
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.response) {
            console.error('   Server responded with:', error.response.data);
        }
        process.exit(1);
    }
}

testPunch();

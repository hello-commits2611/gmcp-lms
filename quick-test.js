const axios = require('axios');

async function quickTest() {
    console.log('🧪 Quick Biometric Test\n');
    
    const headers = {
        'Content-Type': 'text/plain',
        'SN': 'CUB7250700545'
    };
    
    const now = new Date();
    const dateTimeStr = now.toISOString().slice(0, 19).replace('T', ' ');
    const punchData = `PUNCH\t1\t${dateTimeStr}\t0\t1\t0`;
    
    console.log(`📤 Sending punch for User ID 1 at ${dateTimeStr}`);
    
    try {
        const response = await axios.post(
            'http://localhost:3000/api/biometric/iclock/cdata',
            punchData,
            { headers, validateStatus: () => true }
        );
        
        console.log(`📥 Response: ${response.data}\n`);
        
        if (response.data === 'OK') {
            console.log('✅ SUCCESS! Server accepted the punch!');
            console.log('⏳ Waiting 1 second, then checking database...\n');
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const admin = require('firebase-admin');
            const serviceAccount = require('./config/firebase-service-account.json');
            
            if (!admin.apps.length) {
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount)
                });
            }
            
            const db = admin.firestore();
            const snapshot = await db.collection('attendance')
                .limit(1)
                .get();
            
            if (!snapshot.empty) {
                console.log('✅ Attendance record found in database!');
                console.log('\n🎉 BIOMETRIC INTEGRATION IS WORKING!\n');
                console.log('Now you can:');
                console.log('1. Punch your finger on the X2008 device');
                console.log('2. Check attendance with: node check-attendance.js');
                console.log('3. View reports in your admin portal');
            } else {
                console.log('⚠️  Server accepted but no record in database yet');
                console.log('Try running: node check-attendance.js');
            }
        } else {
            console.log('❌ Server returned error:', response.data);
            console.log('Check server logs for details');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

quickTest();

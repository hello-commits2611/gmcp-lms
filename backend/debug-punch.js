const axios = require('axios');

async function debugPunch() {
    console.log('🔍 DEBUG: Testing biometric integration...\n');
    
    // First, check if user is enrolled properly
    console.log('Step 1: Checking user enrollment...');
    const admin = require('firebase-admin');
    const serviceAccount = require('./config/firebase-service-account.json');
    
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }
    
    const db = admin.firestore();
    const userDoc = await db.collection('users').doc('admin@gmcpnalanda.com').get();
    
    if (!userDoc.exists) {
        console.log('❌ User not found in database!');
        process.exit(1);
    }
    
    const userData = userDoc.data();
    console.log('✅ User found:');
    console.log(`   Name: ${userData.name}`);
    console.log(`   Template ID: ${userData.biometricData?.templateId}`);
    console.log(`   Enrolled: ${userData.biometricData?.enrolled}`);
    console.log(`   Devices: ${JSON.stringify(userData.biometricData?.deviceIds)}\n`);
    
    if (!userData.biometricData?.templateId) {
        console.log('❌ User has no template ID enrolled!');
        process.exit(1);
    }
    
    // Now try sending punch
    console.log('Step 2: Sending punch data to server...');
    
    const headers = {
        'Content-Type': 'text/plain',
        'SN': 'CUB7250700545'
    };
    
    const now = new Date();
    const dateTimeStr = now.toISOString().slice(0, 19).replace('T', ' ');
    
    // This is the exact format X2008 sends in ADMS mode
    const punchData = `PUNCH\t1\t${dateTimeStr}\t0\t1\t0`;
    
    console.log('📤 Sending to: http://localhost:3000/api/biometric/iclock/cdata');
    console.log('📤 Headers:', JSON.stringify(headers));
    console.log('📤 Body:', punchData);
    console.log('📤 Body (with visible tabs):', punchData.replace(/\t/g, '[TAB]'));
    console.log('');
    
    try {
        const response = await axios.post(
            'http://localhost:3000/api/biometric/iclock/cdata',
            punchData,
            { 
                headers,
                validateStatus: () => true // Accept any status code
            }
        );
        
        console.log(`📥 Server Response Status: ${response.status}`);
        console.log(`📥 Server Response: "${response.data}"`);
        console.log('');
        
        // Wait for async operations to complete
        console.log('⏳ Waiting 2 seconds for data to be saved...\n');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check database
        console.log('Step 3: Checking if attendance was saved...');
        const snapshot = await db.collection('attendance')
            .where('userId', '==', 'admin@gmcpnalanda.com')
            .orderBy('createdAt', 'desc')
            .limit(1)
            .get();
        
        if (snapshot.empty) {
            console.log('❌ No attendance records found');
            console.log('\n💡 The server responded but didn\'t save the record.');
            console.log('💡 Check the server logs window for error messages.');
        } else {
            console.log('✅ SUCCESS! Attendance record found:\n');
            const doc = snapshot.docs[0];
            const data = doc.data();
            console.log(`   ID: ${doc.id}`);
            console.log(`   User: ${data.userId}`);
            console.log(`   Type: ${data.attendance?.type}`);
            console.log(`   Status: ${data.attendance?.status}`);
            console.log(`   Time: ${data.attendance?.timestamp}`);
            console.log(`   Device: ${data.biometricData?.deviceId}`);
            console.log(`   Template ID: ${data.biometricData?.templateId}`);
            console.log('\n🎉 BIOMETRIC INTEGRATION IS WORKING!');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.response) {
            console.error('   Response:', error.response.data);
        }
        process.exit(1);
    }
}

debugPunch();

// Firebase Configuration Diagnostic Script
// Run with: node test-firebase-config.js

require('dotenv').config();
const admin = require('firebase-admin');

console.log('🔥 Firebase Configuration Diagnostic');
console.log('=====================================');

// Check environment variables
console.log('\n📋 Environment Variables Check:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('FIREBASE_SERVICE_ACCOUNT present:', !!process.env.FIREBASE_SERVICE_ACCOUNT);

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        console.log('✅ Service account JSON parsed successfully');
        console.log('📋 Project ID:', serviceAccount.project_id);
        console.log('📋 Client Email:', serviceAccount.client_email);
        console.log('📋 Private Key ID:', serviceAccount.private_key_id);
    } catch (error) {
        console.error('❌ Error parsing service account JSON:', error.message);
        process.exit(1);
    }
} else {
    console.error('❌ FIREBASE_SERVICE_ACCOUNT not found in environment');
    process.exit(1);
}

// Test Firebase initialization
async function testFirebaseConfig() {
    console.log('\n🔥 Testing Firebase Initialization:');
    
    let firebaseApp = null;
    
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        
        firebaseApp = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: serviceAccount.project_id
        }, 'diagnostic-app');
        
        console.log('✅ Firebase Admin SDK initialized successfully');
        
        // Test Auth service
        console.log('\n🔐 Testing Firebase Auth:');
        const auth = admin.auth(firebaseApp);
        
        // Test creating a test user
        console.log('📝 Testing user creation...');
        
        const testUserEmail = 'test-diagnostic@gmcpnalanda.com';
        
        try {
            // First, try to delete if exists
            try {
                const existingUser = await auth.getUserByEmail(testUserEmail);
                await auth.deleteUser(existingUser.uid);
                console.log('🗑️  Deleted existing test user');
            } catch (e) {
                if (e.code !== 'auth/user-not-found') {
                    console.log('ℹ️  No existing test user found');
                }
            }
            
            // Create test user
            const userRecord = await auth.createUser({
                email: testUserEmail,
                password: 'TestPassword123!',
                displayName: 'Test Diagnostic User'
            });
            
            console.log('✅ Test user created successfully:', userRecord.uid);
            
            // Clean up - delete test user
            await auth.deleteUser(userRecord.uid);
            console.log('🗑️  Test user cleaned up');
            
            console.log('\n🎉 Firebase configuration is working correctly!');
            
        } catch (createError) {
            console.error('❌ Error testing user creation:', createError.message);
            console.error('Code:', createError.code);
            
            if (createError.code === 'auth/project-not-found') {
                console.log('\n💡 SOLUTION: The Firebase project does not exist or the project ID is incorrect.');
                console.log('   Check your project ID in Firebase Console: https://console.firebase.google.com/');
            } else if (createError.code === 'auth/insufficient-permission') {
                console.log('\n💡 SOLUTION: The service account lacks necessary permissions.');
                console.log('   Ensure the service account has "Firebase Admin SDK Service Agent" role.');
            }
        }
        
    } catch (initError) {
        console.error('❌ Error initializing Firebase:', initError.message);
        console.error('Code:', initError.code);
        
        if (initError.message.includes('configuration')) {
            console.log('\n💡 POSSIBLE SOLUTIONS:');
            console.log('1. Check if Firebase Authentication is enabled in your project');
            console.log('2. Verify the project ID matches your Firebase project');
            console.log('3. Ensure the service account has proper permissions');
            console.log('4. Check if the private key is properly formatted (with \\n for newlines)');
        }
        
        process.exit(1);
    }
}

// Run the test
testFirebaseConfig().then(() => {
    console.log('\n🔍 Additional Checks:');
    console.log('   - Visit: https://console.firebase.google.com/project/admission-form-2025');
    console.log('   - Ensure Authentication is enabled');
    console.log('   - Check that Email/Password provider is enabled');
    console.log('   - Verify service account permissions in IAM & Admin');
}).catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
let firebaseApp = null;

const initializeFirebase = () => {
    if (firebaseApp) {
        return firebaseApp;
    }
    
    // Check if Firebase is disabled
    if (process.env.DISABLE_FIREBASE === 'true') {
        console.log('🔥 Firebase integration disabled via DISABLE_FIREBASE environment variable');
        return null;
    }

    try {
        // Try to get service account from environment variable
        const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;
        
        if (serviceAccountString) {
            console.log('🔥 Initializing Firebase with service account from environment...');
            
            const serviceAccount = JSON.parse(serviceAccountString);
            
            firebaseApp = admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: serviceAccount.project_id
            });
            
            console.log('✅ Firebase Admin initialized successfully');
            return firebaseApp;
        }
        
        // Fallback: Try to load from file path
        const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
        if (serviceAccountPath) {
            console.log('🔥 Initializing Firebase with service account file...');
            
            firebaseApp = admin.initializeApp({
                credential: admin.credential.cert(serviceAccountPath)
            });
            
            console.log('✅ Firebase Admin initialized successfully from file');
            return firebaseApp;
        }
        
        console.warn('⚠️  Firebase credentials not found in environment. Using file-based storage instead.');
        return null;
        
    } catch (error) {
        console.error('❌ Error initializing Firebase:', error.message);
        console.warn('⚠️  Falling back to file-based storage');
        return null;
    }
};

// Get Firebase Auth instance
const getAuth = () => {
    const app = initializeFirebase();
    return app ? admin.auth(app) : null;
};

// Get Firestore instance
const getFirestore = () => {
    const app = initializeFirebase();
    return app ? admin.firestore(app) : null;
};

// Create Firebase user
const createFirebaseUser = async (email, password, displayName, customClaims = {}) => {
    try {
        const auth = getAuth();
        if (!auth) {
            throw new Error('Firebase not initialized');
        }

        console.log(`🔥 Creating Firebase user: ${email}`);
        
        const userRecord = await auth.createUser({
            email: email,
            password: password,
            displayName: displayName,
            emailVerified: false // Set to true if you want to skip email verification
        });

        // Set custom claims (role, permissions, etc.)
        if (Object.keys(customClaims).length > 0) {
            await auth.setCustomUserClaims(userRecord.uid, customClaims);
            console.log(`🔥 Set custom claims for user: ${email}`, customClaims);
        }

        console.log(`✅ Firebase user created: ${email} (${userRecord.uid})`);
        return userRecord;
        
    } catch (error) {
        console.error('❌ Error creating Firebase user:', error.message);
        throw error;
    }
};

// Delete Firebase user
const deleteFirebaseUser = async (email) => {
    try {
        const auth = getAuth();
        if (!auth) {
            throw new Error('Firebase not initialized');
        }

        console.log(`🔥 Deleting Firebase user: ${email}`);
        
        const userRecord = await auth.getUserByEmail(email);
        await auth.deleteUser(userRecord.uid);
        
        console.log(`✅ Firebase user deleted: ${email}`);
        return true;
        
    } catch (error) {
        if (error.code === 'auth/user-not-found') {
            console.log(`ℹ️  Firebase user not found: ${email} (may not have been created in Firebase)`);
            return true; // Consider this success since user doesn't exist
        }
        
        console.error('❌ Error deleting Firebase user:', error.message);
        throw error;
    }
};

// Verify Firebase ID token
const verifyToken = async (idToken) => {
    try {
        const auth = getAuth();
        if (!auth) {
            throw new Error('Firebase not initialized');
        }

        const decodedToken = await auth.verifyIdToken(idToken);
        return decodedToken;
        
    } catch (error) {
        console.error('❌ Error verifying Firebase token:', error.message);
        throw error;
    }
};

// Verify Firebase user with email/password (for login)
// Note: Firebase Admin SDK doesn't support password verification directly
// This function checks if user exists and is enabled
const verifyFirebaseUser = async (email, password) => {
    try {
        const auth = getAuth();
        if (!auth) {
            throw new Error('Firebase not initialized');
        }

        console.log(`🔥 Verifying Firebase user exists: ${email}`);
        
        // Check if user exists in Firebase
        const userRecord = await auth.getUserByEmail(email);
        
        if (userRecord.disabled) {
            throw new Error('User account is disabled');
        }
        
        console.log(`✅ Firebase user exists and is enabled: ${email}`);
        return true; // User exists and is enabled
        
    } catch (error) {
        if (error.code === 'auth/user-not-found') {
            console.log(`ℹ️  Firebase user not found: ${email}`);
            return false;
        }
        
        console.error('❌ Error verifying Firebase user:', error.message);
        throw error;
    }
};

// Update Firebase user
const updateFirebaseUser = async (email, updates) => {
    try {
        const auth = getAuth();
        if (!auth) {
            throw new Error('Firebase not initialized');
        }

        const userRecord = await auth.getUserByEmail(email);
        const updatedUser = await auth.updateUser(userRecord.uid, updates);
        
        console.log(`✅ Firebase user updated: ${email}`);
        return updatedUser;
        
    } catch (error) {
        console.error('❌ Error updating Firebase user:', error.message);
        throw error;
    }
};

module.exports = {
    initializeFirebase,
    getAuth,
    getFirestore,
    createFirebaseUser,
    deleteFirebaseUser,
    verifyToken,
    verifyFirebaseUser,
    updateFirebaseUser
};

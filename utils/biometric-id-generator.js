const admin = require('firebase-admin');

/**
 * Generate unique biometric ID and device PIN
 * Format: BIO-0001, BIO-0002, etc.
 * Device PIN: 0001, 0002, etc. (last 4 digits)
 * 
 * Uses Firestore counter for atomic ID generation
 */
async function generateBiometricId() {
  try {
    const db = admin.firestore();
    const counterRef = db.collection('_counters').doc('biometric_id');
    
    // Use transaction to ensure atomic counter increment
    const result = await db.runTransaction(async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      
      let nextNumber = 1;
      if (counterDoc.exists) {
        nextNumber = (counterDoc.data().lastNumber || 0) + 1;
      }
      
      // Update counter
      transaction.set(counterRef, {
        lastNumber: nextNumber,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      return nextNumber;
    });
    
    // Generate biometric ID and device PIN
    const biometricId = `BIO-${result.toString().padStart(4, '0')}`;
    const devicePIN = result.toString().padStart(4, '0');
    
    console.log(`✅ Generated Biometric ID: ${biometricId} (PIN: ${devicePIN})`);
    
    return {
      biometricId,
      devicePIN,
      number: result
    };
    
  } catch (error) {
    console.error('Error generating biometric ID:', error);
    throw new Error('Failed to generate biometric ID');
  }
}

/**
 * Get current counter value (for monitoring)
 */
async function getCurrentCounter() {
  try {
    const db = admin.firestore();
    const counterRef = db.collection('_counters').doc('biometric_id');
    const doc = await counterRef.get();
    
    if (doc.exists) {
      return doc.data().lastNumber || 0;
    }
    return 0;
  } catch (error) {
    console.error('Error getting counter:', error);
    return 0;
  }
}

/**
 * Initialize counter (run once during setup)
 */
async function initializeCounter(startNumber = 0) {
  try {
    const db = admin.firestore();
    const counterRef = db.collection('_counters').doc('biometric_id');
    
    await counterRef.set({
      lastNumber: startNumber,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`✅ Biometric ID counter initialized at ${startNumber}`);
    return true;
  } catch (error) {
    console.error('Error initializing counter:', error);
    throw error;
  }
}

/**
 * Validate biometric ID format
 */
function isValidBiometricId(biometricId) {
  return /^BIO-\d{4}$/.test(biometricId);
}

/**
 * Validate device PIN format
 */
function isValidDevicePIN(devicePIN) {
  return /^\d{4}$/.test(devicePIN);
}

/**
 * Extract number from biometric ID
 */
function extractNumberFromBiometricId(biometricId) {
  const match = biometricId.match(/^BIO-(\d{4})$/);
  return match ? parseInt(match[1], 10) : null;
}

module.exports = {
  generateBiometricId,
  getCurrentCounter,
  initializeCounter,
  isValidBiometricId,
  isValidDevicePIN,
  extractNumberFromBiometricId
};

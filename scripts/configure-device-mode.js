const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '..', 'config', 'firebase-service-account.json');
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function configureDeviceMode(deviceId, mode) {
  try {
    console.log(`\n🔧 Configuring device ${deviceId}`);
    console.log(`   Mode: ${mode}`);
    
    // Validate mode
    const validModes = ['CHECK_IN_ONLY', 'CHECK_OUT_ONLY', 'IN_OUT'];
    if (!validModes.includes(mode)) {
      console.error(`❌ Invalid mode. Must be one of: ${validModes.join(', ')}`);
      process.exit(1);
    }
    
    // Find device
    const snapshot = await db.collection('biometric_devices')
      .where('deviceInfo.deviceId', '==', deviceId)
      .get();
    
    if (snapshot.empty) {
      console.error(`❌ Device not found: ${deviceId}`);
      process.exit(1);
    }
    
    const deviceDoc = snapshot.docs[0];
    const deviceData = deviceDoc.data();
    
    console.log(`   Found: ${deviceData.deviceInfo?.model || 'Unknown'} at ${deviceData.location?.name || 'Unknown'}`);
    
    // Update configuration
    await db.collection('biometric_devices').doc(deviceDoc.id).update({
      'configuration.attendanceMode': mode,
      'updatedAt': admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`✅ Device configured successfully!`);
    console.log(`\n📋 Mode Behavior:`);
    if (mode === 'CHECK_IN_ONLY') {
      console.log(`   ✓ All punches will be recorded as IN`);
      console.log(`   ✗ No OUT punches will be recorded`);
    } else if (mode === 'CHECK_OUT_ONLY') {
      console.log(`   ✗ No IN punches will be recorded`);
      console.log(`   ✓ All punches will be recorded as OUT`);
    } else {
      console.log(`   ↔️  Punches will toggle between IN and OUT`);
    }
    
    console.log(`\n⚠️  IMPORTANT: Restart the backend server for changes to take effect!`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
  
  process.exit(0);
}

// Get command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║           Configure Biometric Device Attendance Mode          ║
╚══════════════════════════════════════════════════════════════╝

Usage: node configure-device-mode.js <DEVICE_ID> <MODE>

Modes:
  CHECK_IN_ONLY   - All punches recorded as IN (Entry only)
  CHECK_OUT_ONLY  - All punches recorded as OUT (Exit only)
  IN_OUT          - Toggle between IN/OUT (Default)

Example:
  node configure-device-mode.js CUB7250700545 CHECK_IN_ONLY
  node configure-device-mode.js CUB7250700545 CHECK_OUT_ONLY
  node configure-device-mode.js CUB7250700545 IN_OUT

Current Device: CUB7250700545 (X2008 at Main Entrance)
  `);
  process.exit(1);
}

const deviceId = args[0];
const mode = args[1].toUpperCase().replace(/-/g, '_');

configureDeviceMode(deviceId, mode);

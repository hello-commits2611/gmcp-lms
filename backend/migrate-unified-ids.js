/**
 * Migration Script: Convert Biometric IDs to Unified Student/Employee ID System
 * 
 * Purpose: Replace auto-generated BIO-XXXX IDs with Student/Employee IDs
 * 
 * Changes:
 * 1. Set biometricId = studentId (for students) or employeeId (for staff)
 * 2. Recalculate devicePIN from unified ID
 * 3. Update enrollment_tasks collection
 * 
 * WARNING: Users will need to re-enroll fingerprints on device with new PINs
 */

require('dotenv').config();
const path = require('path');
const admin = require('firebase-admin');

// Check if Firebase is already initialized
if (!admin.apps.length) {
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(__dirname, 'config', 'firebase-service-account.json');
  console.log('📄 Loading Firebase credentials from:', serviceAccountPath);
  const serviceAccount = require(serviceAccountPath);
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id
  });
  
  console.log('✅ Firebase Admin SDK initialized');
  console.log('📦 Project ID:', serviceAccount.project_id);
} else {
  console.log('✅ Using existing Firebase instance');
}

const db = admin.firestore();

/**
 * Calculate device PIN from unified ID
 */
function calculateDevicePIN(unifiedId) {
  if (!unifiedId) return null;
  
  // Extract numeric digits only
  const numericOnly = unifiedId.replace(/\D/g, '');
  
  if (numericOnly.length >= 4) {
    // Use last 4-6 digits for numeric IDs
    return numericOnly.slice(-Math.min(6, numericOnly.length));
  } else if (unifiedId.length <= 8) {
    // Use full ID if it's short enough (device supports up to 8 chars)
    return unifiedId;
  } else {
    // For long alphanumeric IDs, use last 6 characters
    return unifiedId.slice(-6);
  }
}

/**
 * Main migration function
 */
async function migrateUsers() {
  console.log('\n🚀 Starting migration to unified ID system...\n');
  
  try {
    // Get all users using native Firestore API
    const usersSnapshot = await db.collection('users').limit(1000).get();
    const allUsers = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`📊 Found ${allUsers.length} total users\n`);
    
    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const migrationLog = [];
    
    for (const user of allUsers) {
      try {
        // Skip if user doesn't have BIO-XXXX format (already migrated or created after migration)
        if (!user.biometricId || !user.biometricId.startsWith('BIO-')) {
          console.log(`⏭️  Skipping ${user.email}: Already using unified ID or no biometric ID`);
          skippedCount++;
          continue;
        }
        
        // Get unified ID based on role
        const unifiedId = user.role === 'student' ? user.studentId : user.employeeId;
        
        if (!unifiedId) {
          console.log(`⚠️  Skipping ${user.email}: No Student/Employee ID found (role: ${user.role})`);
          skippedCount++;
          continue;
        }
        
        const oldBiometricId = user.biometricId;
        const oldDevicePIN = user.biometricData?.devicePIN;
        
        // Calculate new device PIN from unified ID
        const newDevicePIN = calculateDevicePIN(unifiedId);
        
        console.log(`\n🔄 Migrating ${user.name} (${user.email})`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Old Biometric ID: ${oldBiometricId} → New: ${unifiedId}`);
        console.log(`   Old Device PIN: ${oldDevicePIN} → New: ${newDevicePIN}`);
        
        // Update user document
        const updateData = {
          biometricId: unifiedId,
          'biometricData.devicePIN': newDevicePIN,
          'biometricData.migratedAt': admin.firestore.FieldValue.serverTimestamp(),
          'biometricData.oldBiometricId': oldBiometricId,
          'biometricData.oldDevicePIN': oldDevicePIN,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection('users').doc(user.id).update(updateData);
        console.log(`   ✅ User updated`);
        
        // Update enrollment tasks
        const enrollmentTasksSnapshot = await db.collection('enrollment_tasks')
          .where('userId', '==', user.id)
          .get();
        
        for (const taskDoc of enrollmentTasksSnapshot.docs) {
          await db.collection('enrollment_tasks').doc(taskDoc.id).update({
            biometricId: unifiedId,
            devicePIN: newDevicePIN,
            oldBiometricId: oldBiometricId,
            migratedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log(`   ✅ Enrollment task updated`);
        }
        
        migrationLog.push({
          email: user.email,
          name: user.name,
          role: user.role,
          oldBiometricId,
          newBiometricId: unifiedId,
          oldDevicePIN,
          newDevicePIN,
          status: 'success'
        });
        
        migratedCount++;
        
      } catch (error) {
        console.error(`   ❌ Error migrating ${user.email}:`, error.message);
        migrationLog.push({
          email: user.email,
          name: user.name,
          error: error.message,
          status: 'error'
        });
        errorCount++;
      }
    }
    
    // Print summary
    console.log('\n' + '='.repeat(80));
    console.log('📋 MIGRATION SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total Users: ${allUsers.length}`);
    console.log(`✅ Successfully Migrated: ${migratedCount}`);
    console.log(`⏭️  Skipped: ${skippedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log('='.repeat(80));
    
    // Print detailed log
    if (migrationLog.length > 0) {
      console.log('\n📄 DETAILED MIGRATION LOG:\n');
      migrationLog.forEach((log, index) => {
        console.log(`${index + 1}. ${log.email} (${log.name})`);
        if (log.status === 'success') {
          console.log(`   ${log.oldBiometricId} → ${log.newBiometricId}`);
          console.log(`   PIN: ${log.oldDevicePIN} → ${log.newDevicePIN}`);
        } else {
          console.log(`   Error: ${log.error}`);
        }
        console.log();
      });
    }
    
    // Important notice
    console.log('\n' + '⚠️'.repeat(40));
    console.log('⚠️  IMPORTANT NOTICE:');
    console.log('⚠️  Users will need to RE-ENROLL their fingerprints on the device');
    console.log('⚠️  with their NEW Device PINs (Student/Employee ID based)');
    console.log('⚠️'.repeat(40));
    
    console.log('\n✅ Migration completed!\n');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║  BIOMETRIC ID MIGRATION TO UNIFIED STUDENT/EMPLOYEE ID SYSTEM  ║');
console.log('╚════════════════════════════════════════════════════════════════╝');
console.log();

migrateUsers();

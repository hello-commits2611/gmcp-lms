const admin = require('firebase-admin');
const FirestoreDAO = require('../utils/firestore-dao');
const { generateBiometricId, initializeCounter, getCurrentCounter } = require('../utils/biometric-id-generator');
const { initializeFirebase } = require('../config/firebase-config');

// Initialize Firebase
initializeFirebase();

const db = admin.firestore();
const usersDAO = new FirestoreDAO('users');
const enrollmentTasksDAO = new FirestoreDAO('enrollment_tasks');

/**
 * Migration script to add biometric IDs to existing users
 */
async function migrateExistingUsers() {
  console.log('🚀 Starting biometric ID migration for existing users...\n');
  
  try {
    // Get all existing users
    const users = await usersDAO.findAll({}, 1000);
    console.log(`📊 Found ${users.length} existing users\n`);
    
    if (users.length === 0) {
      console.log('✅ No users to migrate');
      return;
    }
    
    // Check current counter
    const currentCounter = await getCurrentCounter();
    console.log(`📌 Current biometric ID counter: ${currentCounter}\n`);
    
    // If counter doesn't exist, initialize it
    if (currentCounter === 0) {
      await initializeCounter(0);
      console.log('✅ Initialized counter\n');
    }
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const user of users) {
      // Skip if user already has a biometric ID
      if (user.biometricId) {
        console.log(`⏭️  Skipping ${user.name} - Already has biometric ID: ${user.biometricId}`);
        skippedCount++;
        continue;
      }
      
      console.log(`\n🔄 Processing user: ${user.name} (${user.email})`);
      
      // Generate biometric ID (returns object with biometricId, devicePIN, number)
      const bioIdData = await generateBiometricId();
      const { biometricId, devicePIN } = bioIdData;
      
      console.log(`   📝 Generated: ${biometricId} → PIN: ${devicePIN}`);
      
      // Prepare update data
      const updateData = {
        biometricId: biometricId,
        'biometricData.devicePIN': devicePIN,
        'biometricData.enrolled': false,
        'biometricData.enrollmentStatus': 'pending',
        'biometricData.deviceIds': [],
        'biometricData.fingerprintCount': 0
      };
      
      // Add attendance profile if not exists
      if (!user.attendanceProfile) {
        updateData.attendanceProfile = {
          type: 'regular',
          requiredHours: 8,
          checkInTime: '09:00',
          checkOutTime: '17:00',
          graceMinutes: 15,
          workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        };
        console.log('   ✅ Added default attendance profile');
      }
      
      // Update user in Firestore
      await usersDAO.update(user.id, updateData);
      console.log('   ✅ Updated user document');
      
      // Create enrollment task
      const enrollmentTask = {
        userId: user.id,
        userName: user.name,
        biometricId: biometricId,
        devicePIN: devicePIN,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: admin.firestore.Timestamp.fromDate(
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
        )
      };
      
      await enrollmentTasksDAO.create(enrollmentTask);
      console.log('   ✅ Created enrollment task');
      console.log(`   📋 Enrollment Instructions:`);
      console.log(`      1. Open device menu → User Management → Add User`);
      console.log(`      2. Enter User ID: ${devicePIN}`);
      console.log(`      3. Scan fingerprint 3 times`);
      console.log(`      4. Save user on device`);
      console.log(`      5. User will auto-confirm on first punch\n`);
      
      migratedCount++;
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successfully migrated: ${migratedCount} users`);
    console.log(`⏭️  Skipped (already migrated): ${skippedCount} users`);
    console.log(`📈 Final counter value: ${await getCurrentCounter()}`);
    console.log('='.repeat(60) + '\n');
    
    console.log('🎉 Migration completed successfully!\n');
    
    // Print all enrolled users
    const updatedUsers = await usersDAO.findAll({}, 1000);
    console.log('📋 BIOMETRIC ID ASSIGNMENTS:');
    console.log('-'.repeat(60));
    updatedUsers
      .filter(u => u.biometricId)
      .sort((a, b) => a.biometricId.localeCompare(b.biometricId))
      .forEach(u => {
        console.log(`${u.biometricId} (PIN: ${u.biometricData?.devicePIN}) - ${u.name}`);
      });
    console.log('-'.repeat(60) + '\n');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration if executed directly
if (require.main === module) {
  migrateExistingUsers()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateExistingUsers };

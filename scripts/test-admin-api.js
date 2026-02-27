/**
 * Test script for Admin API endpoints
 * Run this after server is started
 */

const baseURL = 'http://localhost:3000';

async function testAdminAPI() {
  console.log('🧪 Testing Admin API Endpoints\n');
  
  try {
    // Test 1: Get all users list
    console.log('1️⃣ Testing GET /api/admin/users/list');
    const listResponse = await fetch(`${baseURL}/api/admin/users/list`);
    const users = await listResponse.json();
    console.log(`✅ Found ${users.length} users`);
    users.forEach(user => {
      console.log(`   - ${user.biometricId} (PIN: ${user.biometricData?.devicePIN}) - ${user.name}`);
    });
    console.log('');
    
    // Test 2: Get pending enrollments
    console.log('2️⃣ Testing GET /api/admin/enrollment/pending');
    const enrollmentResponse = await fetch(`${baseURL}/api/admin/enrollment/pending`);
    const enrollments = await enrollmentResponse.json();
    console.log(`✅ Found ${enrollments.length} pending enrollments`);
    enrollments.forEach(task => {
      console.log(`   - ${task.biometricId} (PIN: ${task.devicePIN}) - ${task.userName}`);
    });
    console.log('');
    
    // Test 3: Create a new test user
    console.log('3️⃣ Testing POST /api/admin/users/create');
    const newUser = {
      name: 'Test User',
      email: 'test@gmcpnalanda.com',
      role: 'student',
      department: 'Computer Science'
    };
    
    const createResponse = await fetch(`${baseURL}/api/admin/users/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser)
    });
    
    const created = await createResponse.json();
    console.log(`✅ Created user: ${created.user.name}`);
    console.log(`   Biometric ID: ${created.user.biometricId}`);
    console.log(`   Device PIN: ${created.user.biometricData.devicePIN}`);
    console.log(`   Temp Password: ${created.temporaryPassword}`);
    console.log('');
    
    // Test 4: Get specific user details
    console.log('4️⃣ Testing GET /api/admin/users/:userId');
    const userResponse = await fetch(`${baseURL}/api/admin/users/${created.user.id}`);
    const userDetails = await userResponse.json();
    console.log(`✅ Retrieved user: ${userDetails.name}`);
    console.log(`   Email: ${userDetails.email}`);
    console.log(`   Enrollment Status: ${userDetails.biometricData.enrollmentStatus}`);
    console.log('');
    
    console.log('✅ All tests passed!\n');
    console.log('📋 Summary:');
    console.log(`   Total users: ${users.length + 1}`);
    console.log(`   Pending enrollments: ${enrollments.length + 1}`);
    console.log('\n🎯 Next Steps:');
    console.log(`   1. Open device menu → User Management → Add User`);
    console.log(`   2. Enter User ID: ${created.user.biometricData.devicePIN}`);
    console.log(`   3. Scan fingerprint 3 times`);
    console.log(`   4. Test by punching on device`);
    console.log(`   5. User will auto-confirm and attendance will be logged`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

// Run if called directly
if (require.main === module) {
  testAdminAPI()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { testAdminAPI };

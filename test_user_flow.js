// Test script to verify user creation and authentication flow
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testUserFlow() {
    console.log('🧪 Testing User Management Flow...\n');

    try {
        // Test 1: Create a new user
        console.log('1. Testing user creation...');
        const createResponse = await fetch(`${BASE_URL}/api/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: 'Test User',
                email: 'test.user@gmcpnalanda.com',
                password: 'TestPass@123',
                role: 'student',
                branch: 'CSE',
                year: '2'
            })
        });

        const createResult = await createResponse.json();
        console.log('Create User Result:', createResult);

        if (createResult.success) {
            console.log('✅ User creation successful');
        } else {
            console.log('❌ User creation failed:', createResult.error);
            return;
        }

        // Test 2: Try to authenticate the created user
        console.log('\n2. Testing authentication...');
        const authResponse = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'test.user@gmcpnalanda.com',
                password: 'TestPass@123'
            })
        });

        const authResult = await authResponse.json();
        console.log('Authentication Result:', authResult);

        if (authResult.success) {
            console.log('✅ Authentication successful');
        } else {
            console.log('❌ Authentication failed:', authResult.error);
        }

        // Test 3: Try to authenticate with existing user (uttchrist)
        console.log('\n3. Testing existing user authentication...');
        const existingAuthResponse = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'uttchrist@gmcpnalanda.com',
                password: 'UttChrist@2025'
            })
        });

        const existingAuthResult = await existingAuthResponse.json();
        console.log('Existing User Auth Result:', existingAuthResult);

        if (existingAuthResult.success) {
            console.log('✅ Existing user authentication successful');
        } else {
            console.log('❌ Existing user authentication failed:', existingAuthResult.error);
        }

        // Test 4: Load all users
        console.log('\n4. Testing user listing...');
        const listResponse = await fetch(`${BASE_URL}/api/users`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const listResult = await listResponse.json();
        console.log('Users List Result:');
        if (listResult.success) {
            listResult.users.forEach(user => {
                console.log(`  - ${user.name} (${user.email}) - ${user.role}`);
            });
            console.log('✅ User listing successful');
        } else {
            console.log('❌ User listing failed:', listResult.error);
        }

        // Test 5: Delete the test user
        console.log('\n5. Testing user deletion...');
        const deleteResponse = await fetch(`${BASE_URL}/api/users/test.user@gmcpnalanda.com`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const deleteResult = await deleteResponse.json();
        console.log('Delete User Result:', deleteResult);

        if (deleteResult.success) {
            console.log('✅ User deletion successful');
        } else {
            console.log('❌ User deletion failed:', deleteResult.error);
        }

    } catch (error) {
        console.error('❌ Test failed with error:', error.message);
    }

    console.log('\n🏁 Test completed!');
}

// Run the test
testUserFlow();

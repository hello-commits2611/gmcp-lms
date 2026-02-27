// Test admin user deletion
const http = require('http');

// First, create a test admin user to delete
const testAdminData = {
    name: 'Test Admin User',
    email: 'testadmin@gmcpnalanda.com',
    password: 'TestAdmin@123',
    role: 'admin'
};

console.log('🧪 Testing admin user deletion...');

// Create the test admin user first
function createTestAdmin() {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify(testAdminData);
        
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/users',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    if (result.success) {
                        console.log('✅ Test admin user created successfully');
                        resolve(result.user);
                    } else {
                        console.log('ℹ️  Admin user might already exist:', result.error);
                        resolve({ email: testAdminData.email }); // Continue with deletion test
                    }
                } catch (error) {
                    reject(error);
                }
            });
        });
        
        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

// Delete the admin user
function deleteAdmin(email) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: `/api/users/${encodeURIComponent(email)}`,
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        console.log(`🗑️  Attempting to delete admin user: ${email}`);
        
        const req = http.request(options, (res) => {
            console.log(`Delete Status Code: ${res.statusCode}`);
            
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log('Delete Response:', data);
                
                try {
                    const result = JSON.parse(data);
                    if (result.success) {
                        console.log('✅ Admin user deleted successfully!');
                        resolve(result);
                    } else {
                        console.log('❌ Admin user deletion failed:', result.error);
                        resolve(result);
                    }
                } catch (error) {
                    console.log('❌ Failed to parse delete response:', error.message);
                    reject(error);
                }
            });
        });
        
        req.on('error', (error) => {
            console.error('❌ Delete request failed:', error.message);
            reject(error);
        });
        
        req.end();
    });
}

// Run the test
async function runTest() {
    try {
        // Create test admin
        const user = await createTestAdmin();
        
        // Wait a moment
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Try to delete the admin user
        await deleteAdmin(user.email);
        
        console.log('\n🏁 Test completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

runTest();

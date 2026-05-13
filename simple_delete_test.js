// Simple test to delete admin user
const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/users/admin@gmcpnalanda.com',
    method: 'DELETE',
    headers: {
        'Content-Type': 'application/json'
    }
};

console.log('🧪 Testing deletion of admin@gmcpnalanda.com...');

const req = http.request(options, (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        console.log('Response:', data);
        
        try {
            const result = JSON.parse(data);
            if (result.success) {
                console.log('✅ Admin deletion successful!');
            } else {
                console.log('❌ Admin deletion failed:', result.error);
            }
        } catch (error) {
            console.log('❌ Failed to parse response:', error.message);
        }
    });
});

req.on('error', (error) => {
    console.error('❌ Request failed:', error.message);
});

req.end();

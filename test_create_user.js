// Simple test to create a user via API
const http = require('http');

const userData = {
    name: 'Test Student User',
    email: 'teststudent@gmcpnalanda.com',
    password: 'TestPassword@123',
    role: 'student',
    branch: 'CSE',
    year: '2'
};

const postData = JSON.stringify(userData);

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

console.log('🧪 Testing user creation API...');
console.log('User data:', userData);

const req = http.request(options, (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);

    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('Response Body:', data);
        
        try {
            const result = JSON.parse(data);
            if (result.success) {
                console.log('✅ User created successfully!');
                
                // Now test login with the created user
                testLogin(userData.email, userData.password);
            } else {
                console.log('❌ User creation failed:', result.error);
            }
        } catch (error) {
            console.log('❌ Failed to parse response:', error.message);
        }
    });
});

req.on('error', (error) => {
    console.error('❌ Request failed:', error.message);
});

req.write(postData);
req.end();

// Function to test login
function testLogin(email, password) {
    console.log('\n🔐 Testing login with created user...');
    
    const loginData = JSON.stringify({ email, password });
    
    const loginOptions = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(loginData)
        }
    };
    
    const loginReq = http.request(loginOptions, (res) => {
        console.log(`Login Status Code: ${res.statusCode}`);
        
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            console.log('Login Response:', data);
            
            try {
                const result = JSON.parse(data);
                if (result.success) {
                    console.log('✅ Login successful!');
                    console.log('User:', result.user.name, '(' + result.user.role + ')');
                } else {
                    console.log('❌ Login failed:', result.error);
                }
            } catch (error) {
                console.log('❌ Failed to parse login response:', error.message);
            }
        });
    });
    
    loginReq.on('error', (error) => {
        console.error('❌ Login request failed:', error.message);
    });
    
    loginReq.write(loginData);
    loginReq.end();
}

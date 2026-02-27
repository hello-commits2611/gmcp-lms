// Test script for password reset functionality
// Run with: node test-password-reset.js

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const USERS_DB_PATH = path.join(__dirname, 'data/users.json');

// Test configurations
const TEST_USERS = {
    admin: { email: 'admin@gmcpnalanda.com', password: 'AdminGMCP@2025' },
    testUser: { 
        email: 'test.user@gmcpnalanda.com', 
        name: 'Test User',
        password: 'TestPassword123',
        role: 'student'
    }
};

// Helper functions
function log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
}

function logError(message, error = null) {
    console.error(`[${new Date().toISOString()}] ERROR: ${message}`);
    if (error) console.error(error);
}

function logSuccess(message) {
    console.log(`[${new Date().toISOString()}] ✅ ${message}`);
}

async function makeRequest(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        const result = await response.json();
        return { success: response.ok, ...result };
    } catch (error) {
        logError(`Request failed for ${endpoint}`, error);
        return { success: false, error: error.message };
    }
}

function readUsersFile() {
    try {
        if (fs.existsSync(USERS_DB_PATH)) {
            const data = fs.readFileSync(USERS_DB_PATH, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        logError('Failed to read users file', error);
    }
    return null;
}

// Test functions
async function testCreateTestUser() {
    log('🧪 TEST 1: Creating test user...');
    
    const result = await makeRequest('/api/users', {
        method: 'POST',
        body: JSON.stringify({
            name: TEST_USERS.testUser.name,
            email: TEST_USERS.testUser.email,
            password: TEST_USERS.testUser.password,
            role: TEST_USERS.testUser.role
        })
    });
    
    if (result.success) {
        logSuccess(`Test user created: ${TEST_USERS.testUser.email}`);
        
        // Verify user in file has mustChangePassword flag
        const users = readUsersFile();
        if (users && users[TEST_USERS.testUser.email]) {
            const user = users[TEST_USERS.testUser.email];
            if (user.mustChangePassword) {
                logSuccess('Test user correctly has mustChangePassword flag set to true');
            } else {
                logError('Test user missing mustChangePassword flag');
            }
        }
        return true;
    } else {
        logError(`Failed to create test user: ${result.error}`);
        return false;
    }
}

async function testLoginWithPasswordResetRequired() {
    log('🧪 TEST 2: Testing login with password reset required...');
    
    const result = await makeRequest('/api/users/authenticate', {
        method: 'POST',
        body: JSON.stringify({
            email: TEST_USERS.testUser.email,
            password: TEST_USERS.testUser.password
        })
    });
    
    if (result.success) {
        if (result.requirePasswordReset) {
            logSuccess('Login correctly returned requirePasswordReset flag');
            return true;
        } else {
            logError('Login should have returned requirePasswordReset flag');
            return false;
        }
    } else {
        logError(`Login failed: ${result.error}`);
        return false;
    }
}

async function testUserChangePassword() {
    log('🧪 TEST 3: Testing user password change...');
    
    const newPassword = 'NewSecurePassword123!';
    const result = await makeRequest('/api/users/change-password', {
        method: 'POST',
        body: JSON.stringify({
            email: TEST_USERS.testUser.email,
            currentPassword: TEST_USERS.testUser.password,
            newPassword: newPassword
        })
    });
    
    if (result.success) {
        logSuccess('User password changed successfully');
        
        // Update test user password for subsequent tests
        TEST_USERS.testUser.password = newPassword;
        
        // Verify mustChangePassword flag is now false
        const users = readUsersFile();
        if (users && users[TEST_USERS.testUser.email]) {
            const user = users[TEST_USERS.testUser.email];
            if (!user.mustChangePassword) {
                logSuccess('mustChangePassword flag correctly reset to false');
                return true;
            } else {
                logError('mustChangePassword flag should be false after password change');
                return false;
            }
        }
        return true;
    } else {
        logError(`Password change failed: ${result.error}`);
        return false;
    }
}

async function testLoginAfterPasswordChange() {
    log('🧪 TEST 4: Testing login after password change...');
    
    const result = await makeRequest('/api/users/authenticate', {
        method: 'POST',
        body: JSON.stringify({
            email: TEST_USERS.testUser.email,
            password: TEST_USERS.testUser.password
        })
    });
    
    if (result.success) {
        if (!result.requirePasswordReset) {
            logSuccess('Login no longer requires password reset');
            return true;
        } else {
            logError('Login should not require password reset after user changed password');
            return false;
        }
    } else {
        logError(`Login failed: ${result.error}`);
        return false;
    }
}

async function testAdminPasswordReset() {
    log('🧪 TEST 5: Testing admin password reset...');
    
    const adminResetPassword = 'AdminResetPassword456!';
    const result = await makeRequest('/api/users/reset-password', {
        method: 'POST',
        body: JSON.stringify({
            email: TEST_USERS.testUser.email,
            newPassword: adminResetPassword,
            requirePasswordChange: true
        })
    });
    
    if (result.success) {
        logSuccess('Admin password reset successful');
        
        // Update test user password for subsequent tests
        TEST_USERS.testUser.password = adminResetPassword;
        
        // Verify mustChangePassword flag is now true
        const users = readUsersFile();
        if (users && users[TEST_USERS.testUser.email]) {
            const user = users[TEST_USERS.testUser.email];
            if (user.mustChangePassword) {
                logSuccess('mustChangePassword flag correctly set to true by admin reset');
                return true;
            } else {
                logError('mustChangePassword flag should be true after admin reset');
                return false;
            }
        }
        return true;
    } else {
        logError(`Admin password reset failed: ${result.error}`);
        return false;
    }
}

async function testLoginAfterAdminReset() {
    log('🧪 TEST 6: Testing login after admin password reset...');
    
    const result = await makeRequest('/api/users/authenticate', {
        method: 'POST',
        body: JSON.stringify({
            email: TEST_USERS.testUser.email,
            password: TEST_USERS.testUser.password
        })
    });
    
    if (result.success) {
        if (result.requirePasswordReset) {
            logSuccess('Login correctly requires password reset after admin reset');
            return true;
        } else {
            logError('Login should require password reset after admin reset');
            return false;
        }
    } else {
        logError(`Login failed: ${result.error}`);
        return false;
    }
}

async function testCleanup() {
    log('🧪 CLEANUP: Removing test user...');
    
    const result = await makeRequest(`/api/users/${encodeURIComponent(TEST_USERS.testUser.email)}`, {
        method: 'DELETE'
    });
    
    if (result.success) {
        logSuccess('Test user removed successfully');
        return true;
    } else {
        logError(`Failed to remove test user: ${result.error}`);
        return false;
    }
}

// Main test runner
async function runTests() {
    log('🚀 Starting Password Reset Functionality Tests');
    log('='.repeat(50));
    
    let passedTests = 0;
    let totalTests = 0;
    
    const tests = [
        { name: 'Create Test User', fn: testCreateTestUser },
        { name: 'Login with Password Reset Required', fn: testLoginWithPasswordResetRequired },
        { name: 'User Change Password', fn: testUserChangePassword },
        { name: 'Login After Password Change', fn: testLoginAfterPasswordChange },
        { name: 'Admin Password Reset', fn: testAdminPasswordReset },
        { name: 'Login After Admin Reset', fn: testLoginAfterAdminReset }
    ];
    
    for (const test of tests) {
        totalTests++;
        try {
            const result = await test.fn();
            if (result) {
                passedTests++;
            }
        } catch (error) {
            logError(`Test "${test.name}" threw an exception`, error);
        }
        log('-'.repeat(30));
    }
    
    // Always run cleanup
    await testCleanup();
    
    log('='.repeat(50));
    log(`📊 TEST RESULTS: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
        logSuccess('All password reset tests passed! 🎉');
        process.exit(0);
    } else {
        logError(`${totalTests - passedTests} tests failed`);
        process.exit(1);
    }
}

// Check if server is running
async function checkServer() {
    try {
        const response = await fetch(`${BASE_URL}/api/users`, { method: 'GET' });
        return response.ok || response.status === 401; // 401 is OK, means server is running but auth failed
    } catch (error) {
        return false;
    }
}

// Entry point
async function main() {
    log('Checking if server is running...');
    
    const serverRunning = await checkServer();
    if (!serverRunning) {
        logError('Server is not running. Please start the server with "npm run dev" first.');
        process.exit(1);
    }
    
    logSuccess('Server is running, starting tests...');
    await runTests();
}

main();
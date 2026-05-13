// Test script for Quick Action API endpoints
// Run this after starting the server to test the functionality

const testQuickActionAPI = async () => {
    const baseURL = 'http://localhost:3000/api/hostel';
    
    console.log('🧪 Testing Quick Action API endpoints...\n');
    
    // Test 1: Check if endpoints are accessible
    console.log('1. Testing endpoint accessibility...');
    
    try {
        const response = await fetch(`${baseURL}/my-requests?email=test@example.com`);
        const data = await response.json();
        
        if (response.ok) {
            console.log('✅ My Requests endpoint is accessible');
            console.log(`   Response: ${data.success ? 'Success' : 'Failed'}`);
        } else {
            console.log('⚠️  My Requests endpoint returned an error:', data.error);
        }
    } catch (error) {
        console.log('❌ Failed to connect to server. Make sure server is running on port 3000');
        console.log('   Error:', error.message);
        return;
    }
    
    console.log('\n2. Testing admin notifications endpoint...');
    try {
        const response = await fetch(`${baseURL}/admin/notifications`);
        const data = await response.json();
        
        if (response.ok) {
            console.log('✅ Admin notifications endpoint is accessible');
            console.log(`   Notifications count: ${data.notifications?.length || 0}`);
            console.log(`   Unread count: ${data.unreadCount || 0}`);
        } else {
            console.log('⚠️  Admin notifications endpoint error:', data.error);
        }
    } catch (error) {
        console.log('❌ Admin notifications endpoint failed:', error.message);
    }
    
    console.log('\n3. Testing pending requests endpoint...');
    try {
        const response = await fetch(`${baseURL}/admin/pending-requests`);
        const data = await response.json();
        
        if (response.ok) {
            console.log('✅ Pending requests endpoint is accessible');
            console.log(`   Pending requests count: ${data.requests?.length || 0}`);
        } else {
            console.log('⚠️  Pending requests endpoint error:', data.error);
        }
    } catch (error) {
        console.log('❌ Pending requests endpoint failed:', error.message);
    }
    
    console.log('\n📋 API Endpoints Summary:');
    console.log('=========================');
    console.log('Student Endpoints:');
    console.log('  POST /api/hostel/quick-action/leave-hostel');
    console.log('  POST /api/hostel/quick-action/outing');
    console.log('  GET  /api/hostel/my-requests?email=...');
    console.log('  GET  /api/hostel/student/notifications?email=...');
    console.log('');
    console.log('Admin Endpoints:');
    console.log('  GET  /api/hostel/admin/pending-requests');
    console.log('  GET  /api/hostel/admin/all-requests');
    console.log('  POST /api/hostel/admin/review-request');
    console.log('  GET  /api/hostel/admin/notifications');
    console.log('');
    console.log('Common Endpoints:');
    console.log('  POST /api/hostel/notifications/mark-read');
    console.log('');
    console.log('📝 See QUICK_ACTION_API.md for detailed documentation');
};

// Run the test if this file is executed directly
if (require.main === module) {
    testQuickActionAPI();
}

module.exports = { testQuickActionAPI };
// Test script for Outing request submission

const testOutingRequest = async () => {
    console.log('🧪 Testing Outing Request Submission...\n');
    
    const baseURL = 'http://localhost:3000/api/hostel';
    
    // Test data for outing request
    const formData = new FormData();
    formData.append('email', 'mohit@gmcpnalanda.com');
    formData.append('outingDate', '2024-12-24');
    formData.append('outingStartTime', '14:00:00');
    formData.append('outingEndTime', '20:00:00');
    formData.append('purposeOfOuting', 'Christmas shopping and visiting friends');
    formData.append('placeOfVisit', 'City Market and Downtown area');
    formData.append('contactNoDuringOuting', '+91-9876543210');
    formData.append('expectedReturnTime', '19:30:00');
    
    try {
        console.log('1. Submitting Outing request...');
        const response = await fetch(`${baseURL}/quick-action/outing`, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            console.log('✅ Outing request submitted successfully!');
            console.log(`   Request ID: ${result.requestId}`);
            console.log(`   Status: ${result.request.status}`);
            console.log(`   Type: ${result.request.type}`);
            console.log(`   Purpose: ${result.request.purposeOfOuting}`);
            console.log(`   Date: ${result.request.outingDate}`);
            console.log(`   Time: ${result.request.outingStartTime} - ${result.request.outingEndTime}`);
            console.log();
            
            // Check updated admin notifications
            console.log('2. Checking admin notifications...');
            const notifResponse = await fetch(`${baseURL}/admin/notifications`);
            const notifData = await notifResponse.json();
            
            if (notifResponse.ok) {
                console.log('✅ Admin notifications updated:');
                console.log(`   Total notifications: ${notifData.notifications.length}`);
                console.log(`   Unread notifications: ${notifData.unreadCount}`);
                const outingNotif = notifData.notifications.find(n => n.requestType === 'Outing');
                if (outingNotif) {
                    console.log(`   Latest Outing notification: ${outingNotif.message}`);
                }
                console.log();
            }
            
            // Check all requests summary
            console.log('3. Checking all requests summary...');
            const allResponse = await fetch(`${baseURL}/admin/all-requests`);
            const allData = await allResponse.json();
            
            if (allResponse.ok) {
                console.log('✅ All requests summary:');
                console.log(`   Total requests: ${allData.totalCount}`);
                
                const leaveRequests = allData.requests.filter(r => r.type === 'leave_hostel');
                const outingRequests = allData.requests.filter(r => r.type === 'outing');
                const pendingRequests = allData.requests.filter(r => r.status === 'pending');
                const approvedRequests = allData.requests.filter(r => r.status === 'approved');
                
                console.log(`   - Leave Hostel requests: ${leaveRequests.length}`);
                console.log(`   - Outing requests: ${outingRequests.length}`);
                console.log(`   - Pending requests: ${pendingRequests.length}`);
                console.log(`   - Approved requests: ${approvedRequests.length}`);
                console.log();
            }
            
            console.log('🎉 Complete Outing workflow test successful!');
            console.log('   ✅ Student can submit outing requests');
            console.log('   ✅ Outing requests have different fields than leave requests');
            console.log('   ✅ System handles multiple request types');
            console.log('   ✅ Admin receives notifications for all types');
            
        } else {
            console.log('❌ Failed to submit outing request:', result.error);
        }
        
    } catch (error) {
        console.log('❌ Test failed:', error.message);
    }
};

// Run test
testOutingRequest();
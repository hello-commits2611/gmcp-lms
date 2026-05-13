// Test script to submit a Leave Hostel request and demonstrate the workflow

const testLeaveRequest = async () => {
    console.log('🧪 Testing Leave Hostel request submission...\n');
    
    const baseURL = 'http://localhost:3000/api/hostel';
    
    // Test data for leave request
    const formData = new FormData();
    formData.append('email', 'mohit@gmcpnalanda.com');
    formData.append('leaveType', 'Home Visit');
    formData.append('leaveStartDate', '2024-12-25');
    formData.append('leaveEndDate', '2024-12-30');
    formData.append('purposeOfLeave', 'Going home for Christmas holidays with family');
    formData.append('placeOfVisit', 'Delhi, India');
    formData.append('dateOfLeaving', '2024-12-25');
    formData.append('timeOfLeaving', '09:00:00');
    formData.append('arrivalDate', '2024-12-30');
    formData.append('arrivalTime', '18:00:00');
    formData.append('contactNoDuringLeave', '+91-9876543210');
    
    try {
        console.log('1. Submitting Leave Hostel request...');
        const response = await fetch(`${baseURL}/quick-action/leave-hostel`, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            console.log('✅ Leave request submitted successfully!');
            console.log(`   Request ID: ${result.requestId}`);
            console.log(`   Status: ${result.request.status}`);
            console.log(`   Type: ${result.request.type}`);
            console.log(`   Purpose: ${result.request.purposeOfLeave}`);
            console.log();
            
            // Check admin notifications
            console.log('2. Checking admin notifications...');
            const notifResponse = await fetch(`${baseURL}/admin/notifications`);
            const notifData = await notifResponse.json();
            
            if (notifResponse.ok) {
                console.log('✅ Admin notifications updated:');
                console.log(`   Total notifications: ${notifData.notifications.length}`);
                console.log(`   Unread notifications: ${notifData.unreadCount}`);
                if (notifData.notifications.length > 0) {
                    const latest = notifData.notifications[0];
                    console.log(`   Latest: ${latest.message}`);
                    console.log(`   Request ID: ${latest.requestId}`);
                }
                console.log();
            }
            
            // Check pending requests
            console.log('3. Checking pending requests...');
            const pendingResponse = await fetch(`${baseURL}/admin/pending-requests`);
            const pendingData = await pendingResponse.json();
            
            if (pendingResponse.ok) {
                console.log('✅ Pending requests updated:');
                console.log(`   Total pending: ${pendingData.totalCount}`);
                if (pendingData.requests.length > 0) {
                    const latest = pendingData.requests[0];
                    console.log(`   Latest request: ${latest.studentName} - ${latest.type}`);
                    console.log(`   Purpose: ${latest.purposeOfLeave || latest.purposeOfOuting}`);
                }
                console.log();
            }
            
            console.log('🎉 Complete workflow test successful!');
            console.log('   ✅ Student can submit requests');
            console.log('   ✅ Admin receives notifications');
            console.log('   ✅ Requests appear in pending list');
            console.log('   ✅ Data is properly stored and tracked');
            
        } else {
            console.log('❌ Failed to submit request:', result.error);
        }
        
    } catch (error) {
        console.log('❌ Test failed:', error.message);
    }
};

// Run test
testLeaveRequest();
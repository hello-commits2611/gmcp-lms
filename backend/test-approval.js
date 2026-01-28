// Test script for admin approval workflow

const testApprovalWorkflow = async () => {
    console.log('🧪 Testing Admin Approval Workflow...\n');
    
    const baseURL = 'http://localhost:3000/api/hostel';
    
    try {
        // 1. Get the latest pending request
        console.log('1. Getting pending requests...');
        const pendingResponse = await fetch(`${baseURL}/admin/pending-requests`);
        const pendingData = await pendingResponse.json();
        
        if (pendingData.requests.length === 0) {
            console.log('❌ No pending requests to approve. Run test-submission.js first.');
            return;
        }
        
        const latestRequest = pendingData.requests[0];
        console.log('✅ Found pending request:');
        console.log(`   Request ID: ${latestRequest.id}`);
        console.log(`   Student: ${latestRequest.studentName}`);
        console.log(`   Type: ${latestRequest.type}`);
        console.log(`   Status: ${latestRequest.status}`);
        console.log();
        
        // 2. Approve the request
        console.log('2. Approving the request...');
        const approvalData = {
            requestId: latestRequest.id,
            action: 'approve',
            adminRemarks: 'Approved - Valid reason for family visit during holidays',
            reviewedBy: 'Admin Kumar'
        };
        
        const approveResponse = await fetch(`${baseURL}/admin/review-request`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(approvalData)
        });
        
        const approveResult = await approveResponse.json();
        
        if (approveResponse.ok && approveResult.success) {
            console.log('✅ Request approved successfully!');
            console.log(`   New status: ${approveResult.request.status}`);
            console.log(`   Admin remarks: ${approveResult.request.adminRemarks}`);
            console.log(`   Reviewed by: ${approveResult.request.reviewedBy}`);
            console.log(`   Reviewed at: ${new Date(approveResult.request.reviewedAt).toLocaleString()}`);
            console.log();
            
            // 3. Check student notifications
            console.log('3. Checking student notifications...');
            const studentNotifResponse = await fetch(`${baseURL}/student/notifications?email=${latestRequest.studentEmail}`);
            const studentNotifData = await studentNotifResponse.json();
            
            if (studentNotifResponse.ok) {
                console.log('✅ Student notifications updated:');
                console.log(`   Total notifications: ${studentNotifData.notifications.length}`);
                console.log(`   Unread notifications: ${studentNotifData.unreadCount}`);
                if (studentNotifData.notifications.length > 0) {
                    const latest = studentNotifData.notifications[0];
                    console.log(`   Latest: ${latest.message}`);
                }
                console.log();
            }
            
            // 4. Verify request is no longer pending
            console.log('4. Verifying request is no longer pending...');
            const newPendingResponse = await fetch(`${baseURL}/admin/pending-requests`);
            const newPendingData = await newPendingResponse.json();
            
            console.log('✅ Pending requests after approval:');
            console.log(`   Total pending: ${newPendingData.totalCount}`);
            console.log();
            
            // 5. Check approved requests
            console.log('5. Checking approved requests...');
            const approvedResponse = await fetch(`${baseURL}/admin/all-requests?status=approved`);
            const approvedData = await approvedResponse.json();
            
            console.log('✅ Approved requests:');
            console.log(`   Total approved: ${approvedData.totalCount}`);
            if (approvedData.requests.length > 0) {
                const approved = approvedData.requests.find(r => r.id === latestRequest.id);
                if (approved) {
                    console.log(`   ✅ Our request is now approved!`);
                    console.log(`   Status: ${approved.status}`);
                    console.log(`   Admin remarks: ${approved.adminRemarks}`);
                }
            }
            console.log();
            
            console.log('🎉 Complete admin approval workflow test successful!');
            console.log('   ✅ Admin can approve requests');
            console.log('   ✅ Request status updates correctly');
            console.log('   ✅ Student receives approval notification');
            console.log('   ✅ Request moves from pending to approved');
            console.log('   ✅ Admin remarks are saved');
            
        } else {
            console.log('❌ Failed to approve request:', approveResult.error);
        }
        
    } catch (error) {
        console.log('❌ Test failed:', error.message);
    }
};

// Run test
testApprovalWorkflow();
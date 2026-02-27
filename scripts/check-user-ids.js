const firestoreService = require('../utils/firestore-service');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

(async () => {
    try {
        console.log('🔍 Fetching users from Firestore...\n');
        const users = await firestoreService.getAllUsers();
        
        console.log(`Found ${users.length} users:\n`);
        
        users.forEach(user => {
            console.log(`Email: ${user.email}`);
            console.log(`  Name: ${user.name}`);
            console.log(`  Role: ${user.role}`);
            console.log(`  StudentID: ${user.studentId || 'N/A'}`);
            console.log(`  EmployeeID: ${user.employeeId || 'N/A'}`);
            console.log(`  Status: ${user.status}`);
            console.log('---');
        });
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();

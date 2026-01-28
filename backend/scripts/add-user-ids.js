/**
 * Add Student IDs and Employee IDs to users who don't have them
 */

const firestoreService = require('../utils/firestore-service');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const generateStudentId = (index) => {
    return `STU${(index + 1).toString().padStart(4, '0')}`;
};

const generateEmployeeId = (role, index) => {
    const prefix = {
        'teacher': 'TCH',
        'admin': 'ADM',
        'management': 'MNG'
    }[role] || 'EMP';
    
    return `${prefix}${(index + 1).toString().padStart(3, '0')}`;
};

(async () => {
    try {
        console.log('🔄 Adding IDs to users...\n');
        
        const users = await firestoreService.getAllUsers();
        let updated = 0;
        let skipped = 0;
        
        let studentCounter = 0;
        let teacherCounter = 0;
        let adminCounter = 0;
        let managementCounter = 0;
        
        for (const user of users) {
            let needsUpdate = false;
            const updates = {};
            
            if (user.role === 'student' && !user.studentId) {
                updates.studentId = generateStudentId(studentCounter);
                studentCounter++;
                needsUpdate = true;
            }
            
            if ((user.role === 'teacher' || user.role === 'admin' || user.role === 'management') && !user.employeeId) {
                if (user.role === 'teacher') {
                    updates.employeeId = generateEmployeeId('teacher', teacherCounter);
                    teacherCounter++;
                } else if (user.role === 'admin') {
                    updates.employeeId = generateEmployeeId('admin', adminCounter);
                    adminCounter++;
                } else if (user.role === 'management') {
                    updates.employeeId = generateEmployeeId('management', managementCounter);
                    managementCounter++;
                }
                needsUpdate = true;
            }
            
            if (needsUpdate) {
                await firestoreService.updateUser(user.email, updates);
                console.log(`✅ Updated ${user.email}:`);
                if (updates.studentId) console.log(`   StudentID: ${updates.studentId}`);
                if (updates.employeeId) console.log(`   EmployeeID: ${updates.employeeId}`);
                updated++;
            } else {
                console.log(`➡️  Skipped ${user.email} (already has ID)`);
                skipped++;
            }
        }
        
        console.log(`\n✅ Done! Updated ${updated} users, skipped ${skipped}`);
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
})();

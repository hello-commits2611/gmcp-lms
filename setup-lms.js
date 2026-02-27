const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

console.log('🚀 Starting LMS System Setup...');
console.log('📋 Using your existing Firebase project: admission-form-2025');

// Initialize Firebase Admin with your existing credentials
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: "admission-form-2025.firebasestorage.app"
});

const db = admin.firestore();
const auth = admin.auth();

async function setupLMSSystem() {
    try {
        console.log('🔐 Setting up Authentication...');
        
        // Check if authentication is working
        const listUsers = await auth.listUsers(1);
        console.log('✅ Authentication is working!');
        
        console.log('👤 Creating admin user for LMS...');
        
        // Create admin user
        let adminUser;
        try {
            adminUser = await auth.createUser({
                email: 'admin@gmcpnalanda.com',
                password: 'AdminGMCP@2025', // Strong default password
                displayName: 'System Administrator'
            });
            console.log('✅ Admin user created successfully!');
        } catch (error) {
            if (error.code === 'auth/email-already-exists') {
                console.log('⚠️ Admin user already exists, getting existing user...');
                adminUser = await auth.getUserByEmail('admin@gmcpnalanda.com');
            } else {
                throw error;
            }
        }
        
        console.log(`📋 Admin User UID: ${adminUser.uid}`);
        
        console.log('📊 Creating admin profile in Firestore...');
        
        // Create admin profile in Firestore
        const adminProfile = {
            uid: adminUser.uid,
            email: 'admin@gmcpnalanda.com',
            name: 'System Administrator',
            role: 'admin',
            active: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: 'system'
        };
        
        await db.collection('users').doc(adminUser.uid).set(adminProfile);
        console.log('✅ Admin profile created in Firestore!');
        
        console.log('👨‍🎓 Creating sample student user...');
        
        // Create sample student user
        let studentUser;
        try {
            studentUser = await auth.createUser({
                email: 'john.doe@gmcpnalanda.com',
                password: 'StudentGMCP@2025',
                displayName: 'John Doe'
            });
            console.log('✅ Sample student user created successfully!');
        } catch (error) {
            if (error.code === 'auth/email-already-exists') {
                console.log('⚠️ Sample student already exists, getting existing user...');
                studentUser = await auth.getUserByEmail('john.doe@gmcpnalanda.com');
            } else {
                throw error;
            }
        }
        
        // Create student profile
        const studentProfile = {
            uid: studentUser.uid,
            email: 'john.doe@gmcpnalanda.com',
            name: 'John Doe',
            role: 'student',
            active: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: adminUser.uid,
            studentData: {
                branch: 'CSE',
                year: 3,
                rollNumber: 'CSE2022001',
                semester: 5
            }
        };
        
        await db.collection('users').doc(studentUser.uid).set(studentProfile);
        console.log('✅ Sample student profile created!');
        
        console.log('👨‍🏫 Creating sample teacher user...');
        
        // Create sample teacher user
        let teacherUser;
        try {
            teacherUser = await auth.createUser({
                email: 'prof.smith@gmcpnalanda.com',
                password: 'TeacherGMCP@2025',
                displayName: 'Professor Smith'
            });
            console.log('✅ Sample teacher user created successfully!');
        } catch (error) {
            if (error.code === 'auth/email-already-exists') {
                console.log('⚠️ Sample teacher already exists, getting existing user...');
                teacherUser = await auth.getUserByEmail('prof.smith@gmcpnalanda.com');
            } else {
                throw error;
            }
        }
        
        // Create teacher profile
        const teacherProfile = {
            uid: teacherUser.uid,
            email: 'prof.smith@gmcpnalanda.com',
            name: 'Professor Smith',
            role: 'teacher',
            active: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: adminUser.uid,
            teacherData: {
                subjects: ['Data Structures', 'Algorithms', 'Computer Networks'],
                branches: ['CSE', 'IT'],
                employeeId: 'EMP001'
            }
        };
        
        await db.collection('users').doc(teacherUser.uid).set(teacherProfile);
        console.log('✅ Sample teacher profile created!');
        
        console.log('\n🎉 LMS System Setup Complete!');
        console.log('\n📧 Test Accounts Created:');
        console.log('┌─────────────────────────────────────────────────┐');
        console.log('│ ADMIN ACCOUNT                                   │');
        console.log('│ Email: admin@gmcpnalanda.com                    │');
        console.log('│ Password: AdminGMCP@2025                        │');
        console.log('│ Access: Management Dashboard + Admin Panel      │');
        console.log('├─────────────────────────────────────────────────┤');
        console.log('│ STUDENT ACCOUNT                                 │');
        console.log('│ Email: john.doe@gmcpnalanda.com                 │');
        console.log('│ Password: StudentGMCP@2025                      │');
        console.log('│ Access: Student Dashboard                       │');
        console.log('├─────────────────────────────────────────────────┤');
        console.log('│ TEACHER ACCOUNT                                 │');
        console.log('│ Email: prof.smith@gmcpnalanda.com               │');
        console.log('│ Password: TeacherGMCP@2025                      │');
        console.log('│ Access: Teacher Dashboard                       │');
        console.log('└─────────────────────────────────────────────────┘');
        
        console.log('\n🌐 Next Steps:');
        console.log('1. Open lms-system/public/index.html in your browser');
        console.log('2. Login with any of the accounts above');
        console.log('3. Test the role-based dashboards');
        console.log('4. Use admin account to create more users');
        
        console.log('\n✅ Your LMS system is ready to use!');
        
    } catch (error) {
        console.error('❌ Setup failed:', error);
        process.exit(1);
    }
}

setupLMSSystem();

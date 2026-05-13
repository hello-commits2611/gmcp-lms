// Script to migrate existing local users to Firebase
// Run with: node migrate-users-to-firebase.js

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createFirebaseUser, getAuth, initializeFirebase } = require('./utils/firebaseAdmin');

const USERS_DB_PATH = path.join(__dirname, 'data/users.json');

console.log('🚀 GMCP LMS User Migration to Firebase');
console.log('=====================================');

async function migrateUsers() {
    try {
        // Initialize Firebase
        console.log('\n🔥 Initializing Firebase...');
        initializeFirebase();
        const auth = getAuth();
        
        if (!auth) {
            console.error('❌ Firebase not initialized. Check your configuration.');
            process.exit(1);
        }

        // Load local users
        console.log('\n📖 Loading local users from users.json...');
        if (!fs.existsSync(USERS_DB_PATH)) {
            console.error('❌ users.json file not found at:', USERS_DB_PATH);
            process.exit(1);
        }

        const usersData = JSON.parse(fs.readFileSync(USERS_DB_PATH, 'utf8'));
        const userEmails = Object.keys(usersData);
        
        console.log(`📋 Found ${userEmails.length} users to migrate:`, userEmails);

        let migratedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        // Migrate each user
        for (const email of userEmails) {
            const user = usersData[email];
            
            try {
                console.log(`\n👤 Processing user: ${email}`);
                
                // Check if user already exists in Firebase
                try {
                    const existingUser = await auth.getUserByEmail(email);
                    console.log(`⏭️  User already exists in Firebase: ${email} (${existingUser.uid})`);
                    skippedCount++;
                    continue;
                } catch (error) {
                    if (error.code !== 'auth/user-not-found') {
                        throw error; // Re-throw if it's not a "user not found" error
                    }
                    // User doesn't exist in Firebase, proceed with creation
                }

                // Create user in Firebase
                const userRecord = await createFirebaseUser(
                    email,
                    user.password, // Using the password from local storage
                    user.name,
                    {
                        role: user.role,
                        employeeId: user.employeeId,
                        studentId: user.studentId,
                        department: user.department
                    }
                );

                console.log(`✅ Successfully migrated: ${email} -> Firebase UID: ${userRecord.uid}`);
                migratedCount++;

            } catch (error) {
                console.error(`❌ Error migrating user ${email}:`, error.message);
                
                if (error.code === 'auth/weak-password') {
                    console.log(`   💡 Suggestion: Password for ${email} is too weak. Consider updating it.`);
                } else if (error.code === 'auth/invalid-email') {
                    console.log(`   💡 Suggestion: Email format for ${email} is invalid.`);
                }
                
                errorCount++;
            }
        }

        // Summary
        console.log('\n📊 Migration Summary:');
        console.log('===================');
        console.log(`✅ Successfully migrated: ${migratedCount} users`);
        console.log(`⏭️  Skipped (already exist): ${skippedCount} users`);
        console.log(`❌ Errors: ${errorCount} users`);
        console.log(`📋 Total processed: ${userEmails.length} users`);

        if (migratedCount > 0) {
            console.log('\n🎉 Migration completed! Your users are now available in Firebase.');
            console.log('   - Users can login using their existing passwords');
            console.log('   - All user data is preserved in both local storage and Firebase');
            console.log('   - Firebase will now handle authentication with local fallback');
        }

        if (errorCount > 0) {
            console.log('\n⚠️  Some users could not be migrated. Check the errors above.');
            console.log('   - These users will still work with local authentication');
            console.log('   - You can manually fix password/email issues and re-run migration');
        }

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

// Run migration
migrateUsers();
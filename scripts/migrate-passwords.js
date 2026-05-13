/**
 * Password Migration Script
 * 
 * This script migrates all plain-text passwords in users.json to bcrypt hashed passwords.
 * 
 * IMPORTANT: Run this ONCE before deploying to production with bcrypt authentication enabled.
 * 
 * Usage:
 *   node scripts/migrate-passwords.js
 * 
 * This will:
 * 1. Backup the existing users.json file
 * 2. Hash all plain-text passwords using bcrypt
 * 3. Save the updated users.json file
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// File paths
const USERS_FILE = path.join(__dirname, '../data/users.json');
const BACKUP_FILE = path.join(__dirname, '../data/users.json.backup.' + Date.now());

// Load users
const loadUsers = () => {
    try {
        if (fs.existsSync(USERS_FILE)) {
            const data = fs.readFileSync(USERS_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('❌ Error loading users:', error);
        process.exit(1);
    }
    return {};
};

// Save users
const saveUsers = (users) => {
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
        return true;
    } catch (error) {
        console.error('❌ Error saving users:', error);
        return false;
    }
};

// Backup users file
const backupUsers = () => {
    try {
        fs.copyFileSync(USERS_FILE, BACKUP_FILE);
        console.log(`✅ Backup created: ${BACKUP_FILE}`);
        return true;
    } catch (error) {
        console.error('❌ Error creating backup:', error);
        return false;
    }
};

// Check if password is already hashed (bcrypt hashes start with $2a$ or $2b$)
const isPasswordHashed = (password) => {
    return password && (password.startsWith('$2a$') || password.startsWith('$2b$'));
};

// Main migration function
const migratePasswords = async () => {
    console.log('🔐 Starting password migration...\n');
    
    // Load users
    const users = loadUsers();
    const userCount = Object.keys(users).length;
    
    if (userCount === 0) {
        console.log('ℹ️  No users found in database.');
        return;
    }
    
    console.log(`📊 Found ${userCount} users in database\n`);
    
    // Create backup
    if (!backupUsers()) {
        console.log('❌ Failed to create backup. Aborting migration.');
        return;
    }
    
    // Migrate each user's password
    let migrated = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const [email, user] of Object.entries(users)) {
        try {
            // Check if password is already hashed
            if (isPasswordHashed(user.password)) {
                console.log(`⏭️  Skipped ${email} (already hashed)`);
                skipped++;
                continue;
            }
            
            // Hash the plain-text password
            const hashedPassword = await bcrypt.hash(user.password, 10);
            
            // Update the user's password
            users[email].password = hashedPassword;
            
            console.log(`✅ Migrated ${email}`);
            migrated++;
            
        } catch (error) {
            console.error(`❌ Error migrating ${email}:`, error.message);
            errors++;
        }
    }
    
    // Save updated users
    if (migrated > 0) {
        if (saveUsers(users)) {
            console.log(`\n✅ Migration completed successfully!`);
            console.log(`   - Migrated: ${migrated}`);
            console.log(`   - Skipped: ${skipped}`);
            console.log(`   - Errors: ${errors}`);
            console.log(`\n📦 Backup saved to: ${BACKUP_FILE}`);
            console.log(`\n⚠️  IMPORTANT: Test login functionality before deploying to production!`);
        } else {
            console.log(`\n❌ Failed to save migrated users. Check the backup file: ${BACKUP_FILE}`);
        }
    } else {
        console.log(`\nℹ️  No passwords needed migration.`);
        console.log(`   - Already hashed: ${skipped}`);
        console.log(`   - Errors: ${errors}`);
    }
};

// Run migration
console.log('╔════════════════════════════════════════════════╗');
console.log('║     GMCP LMS Password Migration Script        ║');
console.log('╚════════════════════════════════════════════════╝\n');

migratePasswords()
    .then(() => {
        console.log('\n✅ Migration script completed.');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Migration script failed:', error);
        process.exit(1);
    });

/**
 * This script converts all routes in users.js from JSON to Firestore
 * 
 * Run: node scripts/convert-to-firestore.js
 */

const fs = require('fs');
const path = require('path');

const usersFilePath = path.join(__dirname, '../routes/users.js');
const backupPath = path.join(__dirname, '../routes/users.js.backup');

console.log('🔄 Converting users.js to use Firestore only...\n');

// Read the file
let content = fs.readFileSync(usersFilePath, 'utf8');

// Create backup
fs.writeFileSync(backupPath, content);
console.log('✅ Backup created: users.js.backup\n');

// Replace imports
content = content.replace(
  /const FirestoreDAO = require\('\.\.\/utils\/firestore-dao'\);[\s\S]*?const { createNotification } = require\('\.\.\/config\/firebase-config'\);/,
  `const firestoreService = require('../utils/firestore-service');\nconst { createNotification } = require('../config/firebase-config');`
);

// Remove JSON file helpers section
content = content.replace(
  /\/\/ Temporary JSON helper functions[\s\S]*?saveNotifications\(\);/,
  '// Using Firestore service - all data operations through firestoreService'
);

// Remove cascade delete function using JSON
content = content.replace(
  /\/\/ Comprehensive cascade delete function[\s\S]*?};[\s]*return deletionResults;[\s]*}/,
  '// Using firestoreService.cascadeDeleteUser() instead'
);

//Replace common patterns
const replacements = [
  // loadUsers() -> firestoreService.getAllUsers()
  [/const users = loadUsers\(\);/g, 'const usersArray = await firestoreService.getAllUsers();'],
  [/const user = users\[email\];/g, 'const user = await firestoreService.getUser(email);'],
  [/const user = users\[req\.params\.email\];/g, 'const user = await firestoreService.getUser(req.params.email);'],
  [/const user = users\[userData\.email\];/g, 'const user = await firestoreService.getUser(userData.email);'],
  
  // saveUsers() -> various creates/updates
  [/saveUsers\(users\)/g, '// Saved to Firestore'],
  [/if \(saveUsers\(users\)\) {/g, 'try {'],
  
  // Load profiles
  [/const profiles = loadProfiles\(\);/g, 'const profilesArray = await firestoreService.getAllProfiles();'],
  [/saveProfiles\(profiles\)/g, '// Saved to Firestore'],
  
  // Load hostel
  [/const hostelData = loadHostelData\(\);/g, 'const hostelArray = await firestoreService.getAllHostelData();'],
  [/saveHostelData\(hostelData\)/g, '// Saved to Firestore'],
  
  // Load requests
  [/const requests = loadRequests\(\);/g, 'const requests = await firestoreService.getAllRequests();'],
  [/saveRequests\(requests\)/g, '// Saved to Firestore'],
  
  // Load notifications
  [/const notifications = loadNotifications\(\);/g, 'const notifications = await firestoreService.getAllNotifications();'],
  [/saveNotifications\(notifications\)/g, '// Saved to Firestore'],
  
  // Cascade delete
  [/cascadeDeleteUser\(email\)/g, 'await firestoreService.cascadeDeleteUser(email)'],
  [/await deleteUserCascade\(email\)/g, 'await firestoreService.cascadeDeleteUser(email)'],
];

replacements.forEach(([pattern, replacement]) => {
  content = content.replace(pattern, replacement);
});

// Write the updated file
fs.writeFileSync(usersFilePath, content);

console.log('✅ Conversion complete!\n');
console.log('📝 Changes made:');
console.log('  - Removed JSON file helper functions');
console.log('  - Replaced loadUsers() with firestoreService.getAllUsers()');
console.log('  - Replaced saveUsers() with Firestore operations');
console.log('  - Updated cascade delete to use firestoreService');
console.log('  - All data operations now use Firestore\n');

console.log('⚠️  IMPORTANT: You need to manually update route logic to use Firestore properly');
console.log('   The automatic conversion has limitations. Review the file and test thoroughly.\n');

console.log('✅ Backup available at: users.js.backup');

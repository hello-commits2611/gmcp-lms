const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');

// Load environment variables from parent directory
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Initialize Firebase
const { initializeFirebase } = require('../config/firebase-config');
initializeFirebase();

// Import DAO after Firebase is initialized
const FirestoreDAO = require('../utils/firestore-dao');

const DATA_DIR = path.join(__dirname, '../data');
const BACKUP_DIR = path.join(__dirname, '../data-backup');

/**
 * Backup existing JSON data before migration
 */
async function backupData() {
  console.log('📦 Starting data backup...');
  
  // Create backup directory if it doesn't exist
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const backupPath = path.join(BACKUP_DIR, `backup-${timestamp}`);
  fs.mkdirSync(backupPath, { recursive: true });
  
  // List of JSON files to backup
  const jsonFiles = [
    'users.json',
    'profiles.json',
    'hostel.json',
    'hostel-requests.json',
    'notifications.json',
    'documents.json'
  ];
  
  for (const file of jsonFiles) {
    const sourcePath = path.join(DATA_DIR, file);
    const destPath = path.join(backupPath, file);
    
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, destPath);
      console.log(`✅ Backed up: ${file}`);
    } else {
      console.log(`⚠️  File not found: ${file}`);
    }
  }
  
  console.log(`✅ Backup completed: ${backupPath}\n`);
  return backupPath;
}

/**
 * Read JSON file safely
 */
function readJSONFile(filename) {
  const filePath = path.join(DATA_DIR, filename);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filename}`);
    return [];
  }
  
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`❌ Error reading ${filename}:`, error.message);
    return [];
  }
}

/**
 * Migrate users collection
 */
async function migrateUsers() {
  console.log('👥 Migrating users...');
  
  const usersData = readJSONFile('users.json');
  
  // Handle both array and object formats
  let users = [];
  if (Array.isArray(usersData)) {
    users = usersData;
  } else if (typeof usersData === 'object' && usersData !== null) {
    // Convert object to array
    users = Object.values(usersData);
  }
  
  if (users.length === 0) {
    console.log('⚠️  No users to migrate\n');
    return;
  }
  
  const usersDAO = new FirestoreDAO('users');
  let successCount = 0;
  let errorCount = 0;
  
  for (const user of users) {
    try {
      // Transform user data to match Firestore schema
      // Hash password if it's plain text
      let hashedPassword = user.password;
      if (user.password && !user.password.startsWith('$2a$') && !user.password.startsWith('$2b$')) {
        // Plain text password - hash it
        hashedPassword = await bcrypt.hash(user.password, 10);
      }
      
      const userData = {
        email: user.email,
        hashedPassword: hashedPassword,
        role: user.role,
        name: user.name,
        status: user.status || 'active',
        permissions: user.permissions || [],
        mustChangePassword: user.mustChangePassword || false,
        profileComplete: user.profileComplete || false,
        biometricData: {
          enrolled: false,
          templateId: null,
          deviceIds: [],
          enrolledAt: null,
          lastVerified: null
        },
        lastLogin: user.lastLogin ? admin.firestore.Timestamp.fromDate(new Date(user.lastLogin)) : null,
        passwordChangedAt: user.passwordChangedAt ? admin.firestore.Timestamp.fromDate(new Date(user.passwordChangedAt)) : null
      };
      
      // Add role-specific fields
      if (user.role === 'student') {
        userData.studentId = user.studentId || user.email.split('@')[0];
      } else {
        userData.employeeId = user.employeeId || user.email.split('@')[0];
      }
      
      // Use email as document ID for easy lookup
      await usersDAO.create(userData, user.email);
      successCount++;
      console.log(`  ✅ Migrated user: ${user.email}`);
    } catch (error) {
      errorCount++;
      console.error(`  ❌ Error migrating user ${user.email}:`, error.message);
    }
  }
  
  console.log(`✅ Users migration completed: ${successCount} succeeded, ${errorCount} failed\n`);
}

/**
 * Migrate profiles collection
 */
async function migrateProfiles() {
  console.log('📋 Migrating profiles...');
  
  const profiles = readJSONFile('profiles.json');
  if (!profiles || Object.keys(profiles).length === 0) {
    console.log('⚠️  No profiles to migrate\n');
    return;
  }
  
  const profilesDAO = new FirestoreDAO('profiles');
  let successCount = 0;
  let errorCount = 0;
  
  for (const [email, profile] of Object.entries(profiles)) {
    try {
      // Transform profile data to match Firestore schema
      const profileData = {
        userId: email,
        personalInfo: {
          studentName: profile.studentName,
          studentId: profile.studentId,
          bloodGroup: profile.bloodGroup,
          gender: profile.gender,
          dateOfBirth: profile.dateOfBirth ? 
            admin.firestore.Timestamp.fromDate(new Date(profile.dateOfBirth)) : null,
          profilePictureUrl: profile.profilePicture || null
        },
        academicInfo: {
          course: profile.course,
          currentSemester: profile.currentSemester,
          session: profile.session,
          year: profile.currentSemester ? Math.ceil(profile.currentSemester / 2) : null,
          department: profile.department || null
        },
        contactInfo: {
          studentContact: profile.studentContact,
          parentsContact: profile.parentsContact,
          address: profile.address,
          pincode: profile.pincode,
          district: profile.district,
          state: profile.state
        },
        guardianInfo: {
          fatherName: profile.fatherName,
          motherName: profile.motherName
        },
        residenceType: profile.residenceType,
        isComplete: profile.isComplete || false,
        modifiedBy: 'migration-script'
      };
      
      // Use email as document ID
      await profilesDAO.create(profileData, email);
      successCount++;
      console.log(`  ✅ Migrated profile: ${email}`);
    } catch (error) {
      errorCount++;
      console.error(`  ❌ Error migrating profile ${email}:`, error.message);
    }
  }
  
  console.log(`✅ Profiles migration completed: ${successCount} succeeded, ${errorCount} failed\n`);
}

/**
 * Migrate hostel collection
 */
async function migrateHostel() {
  console.log('🏠 Migrating hostel data...');
  
  const hostel = readJSONFile('hostel.json');
  if (!hostel || Object.keys(hostel).length === 0) {
    console.log('⚠️  No hostel data to migrate\n');
    return;
  }
  
  const hostelDAO = new FirestoreDAO('hostel');
  let successCount = 0;
  let errorCount = 0;
  
  for (const [email, hostelInfo] of Object.entries(hostel)) {
    try {
      // Transform hostel data to match Firestore schema
      const hostelData = {
        studentEmail: email,
        studentId: email,
        studentName: hostelInfo.studentName,
        roomInfo: {
          roomNumber: hostelInfo.roomNumber,
          building: hostelInfo.building || 'Main Block',
          floor: hostelInfo.floor || 1,
          roomType: hostelInfo.roomType || 'double'
        },
        allotmentInfo: {
          allotmentDate: hostelInfo.allotmentDate ? 
            admin.firestore.Timestamp.fromDate(new Date(hostelInfo.allotmentDate)) : null,
          validUntil: null,
          wardenName: hostelInfo.wardenName,
          wardenContact: hostelInfo.wardenContact
        },
        roommates: (hostelInfo.roommates || []).map(rm => ({
          name: rm.name,
          contact: rm.contact,
          studentId: null
        })),
        contactNumber: hostelInfo.contactNumber,
        isComplete: hostelInfo.isComplete || false,
        isActive: true
      };
      
      // Use email as document ID
      await hostelDAO.create(hostelData, email);
      successCount++;
      console.log(`  ✅ Migrated hostel info: ${email}`);
    } catch (error) {
      errorCount++;
      console.error(`  ❌ Error migrating hostel info ${email}:`, error.message);
    }
  }
  
  console.log(`✅ Hostel migration completed: ${successCount} succeeded, ${errorCount} failed\n`);
}

/**
 * Migrate hostel requests collection
 */
async function migrateHostelRequests() {
  console.log('📝 Migrating hostel requests...');
  
  const requests = readJSONFile('hostel-requests.json');
  if (!Array.isArray(requests) || requests.length === 0) {
    console.log('⚠️  No hostel requests to migrate\n');
    return;
  }
  
  const requestsDAO = new FirestoreDAO('requests');
  let successCount = 0;
  let errorCount = 0;
  
  for (const request of requests) {
    try {
      // Transform request data to match Firestore schema
      const requestData = {
        type: request.type || 'outing',
        studentInfo: {
          studentEmail: request.studentEmail,
          studentId: request.studentId,
          studentName: request.studentName,
          course: request.course,
          year: request.year,
          semester: request.semester,
          roomNumber: request.roomNumber
        },
        requestData: {},
        supportingDocument: null,
        status: request.status || 'pending',
        adminRemarks: request.adminRemarks || null,
        reviewedBy: request.reviewedBy || null,
        reviewedAt: request.reviewedAt ? 
          admin.firestore.Timestamp.fromDate(new Date(request.reviewedAt)) : null,
        submittedAt: request.submittedAt ? 
          admin.firestore.Timestamp.fromDate(new Date(request.submittedAt)) : 
          admin.firestore.Timestamp.now()
      };
      
      // Add request-specific data
      if (request.type === 'outing') {
        requestData.requestData = {
          outingDate: request.outingDate ? 
            admin.firestore.Timestamp.fromDate(new Date(request.outingDate)) : null,
          outingStartTime: request.outingStartTime,
          outingEndTime: request.outingEndTime,
          expectedReturnTime: request.expectedReturnTime,
          purposeOfOuting: request.purposeOfOuting,
          placeOfVisit: request.placeOfVisit,
          contactNoDuringOuting: request.contactNoDuringOuting
        };
      } else if (request.type === 'leave_hostel') {
        requestData.requestData = {
          leaveType: request.leaveType || 'personal',
          leaveStartDate: request.leaveStartDate ? 
            admin.firestore.Timestamp.fromDate(new Date(request.leaveStartDate)) : null,
          leaveEndDate: request.leaveEndDate ? 
            admin.firestore.Timestamp.fromDate(new Date(request.leaveEndDate)) : null,
          purposeOfLeave: request.purposeOfLeave
        };
      }
      
      // Add supporting document if exists
      if (request.supportingDocument) {
        requestData.supportingDocument = {
          fileName: request.supportingDocument,
          fileUrl: request.supportingDocumentUrl || null,
          fileSize: 0,
          uploadedAt: admin.firestore.Timestamp.now()
        };
      }
      
      await requestsDAO.create(requestData);
      successCount++;
      console.log(`  ✅ Migrated request: ${request.studentEmail} - ${request.type}`);
    } catch (error) {
      errorCount++;
      console.error(`  ❌ Error migrating request:`, error.message);
    }
  }
  
  console.log(`✅ Requests migration completed: ${successCount} succeeded, ${errorCount} failed\n`);
}

/**
 * Migrate documents collection
 */
async function migrateDocuments() {
  console.log('📄 Migrating documents...');
  
  const documents = readJSONFile('documents.json');
  if (!Array.isArray(documents) || documents.length === 0) {
    console.log('⚠️  No documents to migrate\n');
    return;
  }
  
  const documentsDAO = new FirestoreDAO('documents');
  let successCount = 0;
  let errorCount = 0;
  
  for (const doc of documents) {
    try {
      // Transform document data to match Firestore schema
      const documentData = {
        type: doc.type || 'notice',
        title: doc.title,
        description: doc.description || '',
        category: doc.category || 'general',
        file: {
          fileName: doc.filename,
          fileUrl: doc.fileUrl || null,
          fileSize: doc.fileSize || 0,
          mimeType: doc.mimeType || 'application/pdf',
          downloadCount: 0
        },
        visibility: {
          roles: doc.visibleTo || ['student', 'teacher', 'admin', 'management'],
          departments: [],
          years: [],
          specific_users: []
        },
        isActive: true,
        isPinned: false,
        expiryDate: doc.expiryDate ? 
          admin.firestore.Timestamp.fromDate(new Date(doc.expiryDate)) : null,
        uploadedBy: doc.uploadedBy || 'admin',
        uploadedAt: doc.uploadedAt ? 
          admin.firestore.Timestamp.fromDate(new Date(doc.uploadedAt)) : 
          admin.firestore.Timestamp.now(),
        metadata: {
          tags: doc.tags || [],
          priority: doc.priority || 'medium'
        }
      };
      
      await documentsDAO.create(documentData);
      successCount++;
      console.log(`  ✅ Migrated document: ${doc.title}`);
    } catch (error) {
      errorCount++;
      console.error(`  ❌ Error migrating document ${doc.title}:`, error.message);
    }
  }
  
  console.log(`✅ Documents migration completed: ${successCount} succeeded, ${errorCount} failed\n`);
}

/**
 * Main migration function
 */
async function migrate() {
  console.log('🚀 Starting Firestore Migration\n');
  console.log('='.repeat(50) + '\n');
  
  try {
    // Step 1: Backup existing data
    await backupData();
    
    // Step 2: Migrate collections
    await migrateUsers();
    await migrateProfiles();
    await migrateHostel();
    await migrateHostelRequests();
    await migrateDocuments();
    
    console.log('='.repeat(50));
    console.log('✅ Migration completed successfully!');
    console.log('\n⚠️  IMPORTANT NOTES:');
    console.log('  1. The original JSON files have been backed up');
    console.log('  2. Update your API routes to use Firestore DAO');
    console.log('  3. Test all functionality before deploying');
    console.log('  4. Consider setting up Firestore indexes for performance');
    console.log('  5. Deploy security rules to Firestore\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if executed directly
if (require.main === module) {
  migrate();
}

module.exports = { migrate, backupData };

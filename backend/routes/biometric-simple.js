const express = require('express');
const router = express.Router();
const FirestoreDAO = require('../utils/firestore-dao');
const admin = require('firebase-admin');
const moment = require('moment-timezone');

// Initialize DAOs
const usersDAO = new FirestoreDAO('users');
const attendanceDAO = new FirestoreDAO('attendance');
const biometricDevicesDAO = new FirestoreDAO('biometric_devices');
const enrollmentTasksDAO = new FirestoreDAO('enrollment_tasks');

const ATTENDANCE_TIMEZONE = 'Asia/Kolkata';

// Raw body parser middleware for this route only
router.use(express.text({ type: '*/*' }));

/**
 * POST /api/biometric-simple/punch
 * Simple endpoint that accepts X2008 punch data
 */
// Handle both /punch and /cdata.aspx (X2008 uses .aspx)
const handlePunch = async (req, res) => {
  try {
    console.log('\n🟢 BIOMETRIC PUNCH RECEIVED');
    console.log('Headers:', req.headers);
    console.log('Body type:', typeof req.body);
    console.log('Body:', req.body);
    
    const deviceSN = req.headers['sn'] || req.headers['SN'] || 'CUB7250700545';
    let rawData = req.body;
    
    // Handle different body types
    if (typeof rawData !== 'string') {
      if (Buffer.isBuffer(rawData)) {
        rawData = rawData.toString('utf8');
      } else if (typeof rawData === 'object') {
        rawData = JSON.stringify(rawData);
      }
    }
    
    console.log('Raw data after conversion:', rawData);
    
    // Parse ADMS format: PUNCH\tUserID\tDateTime\tPunchState\tVerifyType\tWorkCode
    const lines = rawData.split('\n').filter(l => l.trim());
    console.log('Lines found:', lines.length);
    
    let processed = 0;
    let hasUserData = false;
    
    for (const line of lines) {
      console.log('Processing line:', line);
      
      // Check if this is a USER line (device is sending user data)
      if (line.startsWith('USER')) {
        console.log('This is a USER line, extracting PIN...');
        hasUserData = true;
        // Format: USER PIN=1093\tName=Roushan\t...
        const pinMatch = line.match(/PIN=(\d+)/);
        if (pinMatch) {
          const templateId = pinMatch[1];
          console.log('Found user with PIN/Template ID:', templateId);
          // Just acknowledge user data, don't process as attendance
          continue;
        }
      }
      
      // Skip OPLOG lines (operation logs from device)
      if (line.startsWith('OPLOG')) {
        console.log('Skipping OPLOG line');
        continue;
      }
      
      // Skip lines that don't look like attendance data
      if (!line.includes('\t') && !line.includes(' ') && !line.includes('PUNCH')) {
        console.log('Skipping - no separator found');
        continue;
      }
      
      // Try splitting by tab first, then by spaces
      let parts = line.split('\t');
      if (parts.length < 3) {
        parts = line.split(/\s+/); // Split by whitespace
      }
      console.log('Split into', parts.length, 'parts:', parts);
      
      if (parts.length < 3) {
        console.log('Skipping - not enough parts');
        continue;
      }
      
      // For format: 1234\t2025-12-19 23:54:33\t0\t1\t0...
      // Or: PUNCH\t1234\t2025-12-19 23:54:33\t...
      let templateId, timestamp;
      
      if (parts[0] === 'PUNCH') {
        templateId = parts[1];
        timestamp = parts[2]; // Tab-separated: timestamp is already complete
      } else if (line.includes('\t')) {
        // Tab-separated format: 0009\t2025-12-21 23:34:16\t0\t1\t0...
        templateId = parts[0];
        timestamp = parts[1]; // Timestamp is complete in second field
      } else {
        // Space-separated format: 1234 2025-12-19 23:54:33 ...
        templateId = parts[0];
        timestamp = parts[1] + ' ' + parts[2]; // Combine date and time
      }
      
      console.log('Template ID:', templateId);
      console.log('Timestamp:', timestamp);
      
      // Find user by devicePIN (template ID from device)
      // Now supports unified Student/Employee ID system
      let user = await usersDAO.findOneByField('biometricData.devicePIN', templateId);
      
      // Fallback: Try direct match with studentId or employeeId
      if (!user) {
        console.log(`⚠️ User not found by devicePIN, trying studentId...`);
        user = await usersDAO.findOneByField('studentId', templateId);
      }
      
      if (!user) {
        console.log(`⚠️ User not found by studentId, trying employeeId...`);
        user = await usersDAO.findOneByField('employeeId', templateId);
      }
      
      // Also try matching against biometricId (unified ID)
      if (!user) {
        console.log(`⚠️ User not found by employeeId, trying biometricId...`);
        user = await usersDAO.findOneByField('biometricId', templateId);
      }
      
      if (!user) {
        console.log(`❌ User not found for template ID: ${templateId}`);
        continue;
      }
      
      console.log('✅ Found user:', user.name);
      
      // Auto-confirm enrollment on first punch
      if (!user.biometricData?.enrolled) {
        console.log('🎉 First punch detected! Auto-confirming enrollment...');
        await usersDAO.update(user.id, {
          'biometricData.enrolled': true,
          'biometricData.enrollmentStatus': 'active',
          'biometricData.enrolledAt': admin.firestore.FieldValue.serverTimestamp(),
          'biometricData.deviceIds': admin.firestore.FieldValue.arrayUnion(deviceSN)
        });
        
        // Update enrollment task to completed
        const enrollmentTasks = await enrollmentTasksDAO.query([
          { field: 'userId', operator: '==', value: user.id },
          { field: 'status', operator: '==', value: 'pending' }
        ]);
        
        if (enrollmentTasks.length > 0) {
          await enrollmentTasksDAO.update(enrollmentTasks[0].id, {
            status: 'completed',
            completedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }
        
        console.log('✅ Enrollment confirmed for user:', user.name);
      }
      
      // Determine IN/OUT (query only by userId to avoid index requirement)
      // Parse timestamp with explicit format to avoid deprecation warnings
      const timestampMoment = moment(timestamp.trim(), 'YYYY-MM-DD HH:mm:ss', true);
      if (!timestampMoment.isValid()) {
        console.log(`❌ Invalid timestamp format: ${timestamp}`);
        continue;
      }
      const date = timestampMoment.tz(ATTENDANCE_TIMEZONE).format('YYYY-MM-DD');
      
      // Get all user records and filter by date in memory
      const allUserRecords = await attendanceDAO.query([
        { field: 'userId', operator: '==', value: user.id }
      ], 100);
      
      // Filter to today's records and sort
      const todayRecords = allUserRecords
        .filter(r => r.attendance?.date === date)
        .sort((a, b) => {
          const timeA = a.createdAt?.toDate?.() || new Date(a.createdAt?._seconds * 1000);
          const timeB = b.createdAt?.toDate?.() || new Date(b.createdAt?._seconds * 1000);
          return timeB - timeA; // Descending order (latest first)
        });
      
      // Get device configuration for minimum time gap (default: 4 hours = 14400 seconds)
      const device = await biometricDevicesDAO.findOneByField('deviceInfo.deviceId', deviceSN);
      const minTimeGapSeconds = device?.configuration?.minOutTimeGap || 14400; // 4 hours default
      const duplicateWindowSeconds = device?.configuration?.duplicateCheckWindow || 300; // 5 minutes
      
      let attendanceType;
      let skipReason = null;
      
      // 🥇 RULE 1: First punch of the day is ALWAYS IN
      if (todayRecords.length === 0) {
        attendanceType = 'IN';
        console.log('🌅 Rule 1: First punch of the day - recorded as IN');
      } else {
        const lastRecord = todayRecords[0]; // Latest record (sorted descending)
        const lastType = lastRecord.attendance.type;
        const lastTime = lastRecord.createdAt?.toDate?.() || new Date(lastRecord.createdAt?._seconds * 1000);
        const timeDiffSeconds = (timestampMoment.toDate() - lastTime) / 1000;
        
        console.log(`Last punch: ${lastType} at ${lastTime.toLocaleTimeString()}, ${Math.floor(timeDiffSeconds/60)} minutes ago`);
        
        // 🥉 RULE 3: Ignore duplicate fast punches (within 1-5 minutes)
        if (timeDiffSeconds < duplicateWindowSeconds) {
          console.log(`❌ Rule 3: Duplicate punch within ${duplicateWindowSeconds}s - IGNORED`);
          skipReason = 'duplicate';
        }
        // 🥈 RULE 2: Second valid punch with sufficient time gap = OUT
        else if (lastType === 'IN' && timeDiffSeconds >= minTimeGapSeconds) {
          attendanceType = 'OUT';
          const hoursGap = (timeDiffSeconds / 3600).toFixed(1);
          console.log(`📍 Rule 2: Valid OUT after ${hoursGap}h gap`);
        }
        // Time gap too short for OUT
        else if (lastType === 'IN' && timeDiffSeconds < minTimeGapSeconds) {
          const remainingMinutes = Math.ceil((minTimeGapSeconds - timeDiffSeconds) / 60);
          console.log(`⚠️ Not enough time passed. Need ${remainingMinutes} more minutes for OUT`);
          skipReason = 'time_gap_too_short';
        }
        // 🏆 RULE 4: Already has OUT - ignore further punches
        else if (lastType === 'OUT') {
          console.log('❌ Rule 4: Already punched OUT today - IGNORED');
          skipReason = 'already_out';
        }
      }
      
      // Skip if any rule rejected this punch
      if (skipReason) {
        console.log(`⏭️ Skipping this punch (${skipReason})`);
        continue;
      }
      
      console.log(`✅ Recording as: ${attendanceType}`);
      
      // Save to Firestore
      const attendanceData = {
        userId: user.id,
        employeeId: user.employeeId || null,
        biometricData: {
          templateId: templateId,
          deviceId: deviceSN,
          verificationMethod: 'fingerprint'
        },
        attendance: {
          date: date,
          timestamp: admin.firestore.Timestamp.fromDate(timestampMoment.toDate()),
          type: attendanceType,
          status: 'PRESENT',
          location: 'Main Entrance'
        },
        metadata: {
          rawData: line,
          processed: true
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      await attendanceDAO.create(attendanceData);
      console.log(`✅ Saved: ${user.name} - ${attendanceType}`);
      processed++;
    }
    
    // Send appropriate response
    res.set('Content-Type', 'text/plain');
    
    // If we received USER data (enrollment info), acknowledge it
    if (hasUserData && processed === 0) {
      console.log('✅ Acknowledged USER data from device');
      res.send('OK');
    } else if (processed > 0) {
      console.log(`✅ Processed ${processed} attendance record(s)`);
      res.send('OK');
    } else {
      console.log('⚠️ No valid records found');
      res.send('OK'); // Still send OK to prevent device from retrying
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    res.set('Content-Type', 'text/plain');
    res.send('ERROR');
  }
};

/**
 * GET /cdata.aspx
 * Device polling and sync requests
 * Device checks for commands, config updates, etc.
 */
const handleDeviceSync = async (req, res) => {
  try {
    const deviceSN = req.query.SN || req.headers['sn'] || req.headers['SN'];
    const options = req.query.options;
    const table = req.query.table;
    
    console.log(`\n🔄 Device sync request: SN=${deviceSN}, options=${options}, table=${table}`);
    
    // Send empty response - no commands or data to send to device
    res.set('Content-Type', 'text/plain');
    res.send('OK');
  } catch (error) {
    console.error('❌ Error in device sync:', error);
    res.set('Content-Type', 'text/plain');
    res.send('OK');
  }
};

/**
 * GET /getrequest.aspx
 * Device polls for pending commands/requests from server
 * Response format: C:ID:command or empty for no commands
 */
const handleGetRequest = async (req, res) => {
  try {
    const deviceSN = req.query.SN || req.headers['sn'] || req.headers['SN'];
    
    // Log less frequently to reduce console spam
    if (!handleGetRequest.lastLog || Date.now() - handleGetRequest.lastLog > 60000) {
      console.log(`\n📶 Device polling: SN=${deviceSN} (getrequest)`);
      handleGetRequest.lastLog = Date.now();
    }
    
    // Send empty response - no commands pending for device
    res.set('Content-Type', 'text/plain');
    res.send('OK');
  } catch (error) {
    console.error('❌ Error in getrequest:', error);
    res.set('Content-Type', 'text/plain');
    res.send('OK');
  }
};

// Register the handlers
router.post('/punch', handlePunch);
router.post('/cdata.aspx', handlePunch);
router.get('/cdata.aspx', handleDeviceSync);
router.get('/getrequest.aspx', handleGetRequest);

module.exports = router;

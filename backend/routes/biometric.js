const express = require('express');
const router = express.Router();
const FirestoreDAO = require('../utils/firestore-dao');
const admin = require('firebase-admin');
const moment = require('moment-timezone');

// Initialize DAOs
const usersDAO = new FirestoreDAO('users');
const attendanceDAO = new FirestoreDAO('attendance');
const attendanceSummaryDAO = new FirestoreDAO('attendance_summary');
const biometricDevicesDAO = new FirestoreDAO('biometric_devices');

// Timezone for attendance
const ATTENDANCE_TIMEZONE = process.env.ATTENDANCE_TIMEZONE || 'Asia/Kolkata';

/**
 * Middleware to verify webhook secret from eSSL device
 */
const verifyWebhookSecret = (req, res, next) => {
  const webhookSecret = process.env.ESSL_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    // If no secret configured, allow (for development)
    return next();
  }
  
  const providedSecret = req.headers['x-webhook-secret'] || req.body.secret;
  
  if (providedSecret !== webhookSecret) {
    return res.status(401).json({ error: 'Invalid webhook secret' });
  }
  
  next();
};

/**
 * Determine attendance type (IN/OUT) based on last record
 */
async function determineAttendanceType(userId, timestamp) {
  try {
    const today = moment(timestamp).tz(ATTENDANCE_TIMEZONE).format('YYYY-MM-DD');
    
    // Get today's records for this user
    const todayRecords = await attendanceDAO.query([
      { field: 'userId', operator: '==', value: userId },
      { field: 'attendance.date', operator: '==', value: today }
    ], 100, 'attendance.timestamp', 'desc');
    
    if (todayRecords.length === 0) {
      return 'IN'; // First record of the day
    }
    
    // Get the last record type
    const lastRecord = todayRecords[0];
    const lastType = lastRecord.attendance.type;
    
    // Toggle between IN and OUT
    return lastType === 'IN' ? 'OUT' : 'IN';
  } catch (error) {
    console.error('Error determining attendance type:', error);
    return 'IN'; // Default to IN on error
  }
}

/**
 * Calculate attendance status based on time
 */
function calculateAttendanceStatus(timestamp, attendanceType, user) {
  const time = moment(timestamp).tz(ATTENDANCE_TIMEZONE);
  const hour = time.hour();
  const minute = time.minute();
  
  if (attendanceType === 'IN') {
    // Define late time (e.g., 9:30 AM for students, 9:00 AM for staff)
    const lateHour = user.role === 'student' ? 9 : 9;
    const lateMinute = user.role === 'student' ? 30 : 0;
    
    if (hour > lateHour || (hour === lateHour && minute > lateMinute)) {
      return 'LATE';
    }
    return 'PRESENT';
  } else if (attendanceType === 'OUT') {
    // Define early out time (e.g., before 4:00 PM)
    const earlyOutHour = 16; // 4 PM
    
    if (hour < earlyOutHour) {
      return 'EARLY_OUT';
    }
    return 'PRESENT';
  }
  
  return 'PRESENT';
}

/**
 * Calculate duration between IN and OUT
 */
async function calculateDuration(userId, date) {
  try {
    const records = await attendanceDAO.query([
      { field: 'userId', operator: '==', value: userId },
      { field: 'attendance.date', operator: '==', value: date }
    ], 100, 'attendance.timestamp', 'asc');
    
    if (records.length < 2) {
      return 0; // Need at least IN and OUT
    }
    
    const inRecord = records.find(r => r.attendance.type === 'IN');
    const outRecord = records.filter(r => r.attendance.type === 'OUT').pop(); // Last OUT
    
    if (!inRecord || !outRecord) {
      return 0;
    }
    
    const inTime = inRecord.attendance.timestamp.toDate();
    const outTime = outRecord.attendance.timestamp.toDate();
    
    const durationMs = outTime - inTime;
    const durationMinutes = Math.floor(durationMs / (1000 * 60));
    
    return durationMinutes > 0 ? durationMinutes : 0;
  } catch (error) {
    console.error('Error calculating duration:', error);
    return 0;
  }
}

/**
 * Process a single attendance record
 */
async function processSingleAttendanceRecord(record) {
  try {
    const { templateId, deviceId, timestamp, verificationMethod, confidence } = record;
    
    // Find device
    const device = await biometricDevicesDAO.findOneByField('deviceInfo.deviceId', deviceId);
    if (!device) {
      throw new Error('Device not found');
    }
    
    // Find user by biometric template ID
    const user = await usersDAO.findOneByField('biometricData.templateId', templateId);
    if (!user) {
      console.log(`User not found for template ID: ${templateId}`);
      return null;
    }
    
    const recordTimestamp = new Date(timestamp);
    const date = moment(recordTimestamp).tz(ATTENDANCE_TIMEZONE).format('YYYY-MM-DD');
    
    // Check for duplicate within time window (5 minutes)
    const duplicateCheckWindow = device.configuration?.duplicateCheckWindow || 300;
    const recentRecords = await attendanceDAO.query([
      { field: 'userId', operator: '==', value: user.id },
      { field: 'attendance.date', operator: '==', value: date }
    ], 10, 'attendance.timestamp', 'desc');
    
    if (recentRecords.length > 0) {
      const lastRecord = recentRecords[0];
      const lastTime = lastRecord.attendance.timestamp.toDate();
      const timeDiff = (recordTimestamp - lastTime) / 1000; // seconds
      
      if (timeDiff < duplicateCheckWindow) {
        console.log(`Duplicate record ignored for user ${user.email} (within ${duplicateCheckWindow}s)`);
        return lastRecord;
      }
    }
    
    // Determine attendance type based on device configuration
    let attendanceType;
    const deviceMode = device.configuration?.attendanceMode || 'IN_OUT';
    
    // Check if this is first punch of the day
    const today = moment(recordTimestamp).tz(ATTENDANCE_TIMEZONE).format('YYYY-MM-DD');
    const todayRecords = await attendanceDAO.query([
      { field: 'userId', operator: '==', value: user.id },
      { field: 'attendance.date', operator: '==', value: today }
    ], 100);
    
    // SMART LOGIC: First punch of the day is ALWAYS IN, regardless of device mode
    if (todayRecords.length === 0) {
      attendanceType = 'IN';
      console.log('🌅 First punch of the day - automatically recorded as IN');
    } else if (deviceMode === 'CHECK_IN_ONLY' || deviceMode === 'IN_ONLY') {
      // Device is configured for check-in only - all punches are IN
      attendanceType = 'IN';
      console.log('Device in CHECK-IN only mode - recording as IN');
    } else if (deviceMode === 'CHECK_OUT_ONLY' || deviceMode === 'OUT_ONLY') {
      // Device is configured for check-out only - all punches are OUT
      attendanceType = 'OUT';
      console.log('Device in CHECK-OUT only mode - recording as OUT');
    } else {
      // Default IN/OUT toggle mode
      attendanceType = await determineAttendanceType(user.id, recordTimestamp);
    }
    
    // Calculate status
    const status = calculateAttendanceStatus(recordTimestamp, attendanceType, user);
    
    // Create attendance record
    const attendanceData = {
      userId: user.id,
      employeeId: user.employeeId || null,
      studentId: user.studentId || null,
      biometricData: {
        templateId: templateId,
        deviceId: deviceId,
        deviceLocation: device.location?.name || 'Unknown',
        verificationMethod: verificationMethod || 'fingerprint',
        confidence: confidence || 0
      },
      attendance: {
        date: date,
        timestamp: admin.firestore.Timestamp.fromDate(recordTimestamp),
        type: attendanceType,
        status: status,
        location: device.location?.name || 'Unknown'
      },
      metadata: {
        ipAddress: device.networkInfo?.ipAddress || null,
        rawData: JSON.stringify(record),
        processed: true,
        anomaly: false
      }
    };
    
    const createdRecord = await attendanceDAO.create(attendanceData);
    
    // If this is an OUT record, calculate duration
    if (attendanceType === 'OUT') {
      const duration = await calculateDuration(user.id, date);
      if (duration > 0) {
        await attendanceDAO.update(createdRecord.id, {
          'attendance.duration': duration
        });
        createdRecord.attendance.duration = duration;
      }
    }
    
    // Trigger summary update (async, don't wait)
    updateDailySummary(user.id, date).catch(err => {
      console.error('Error updating daily summary:', err);
    });
    
    return createdRecord;
  } catch (error) {
    console.error('Error processing attendance record:', error);
    throw error;
  }
}

/**
 * Update daily attendance summary
 */
async function updateDailySummary(userId, date) {
  try {
    // Get all records for this user on this date
    const records = await attendanceDAO.query([
      { field: 'userId', operator: '==', value: userId },
      { field: 'attendance.date', operator: '==', value: date }
    ], 100, 'attendance.timestamp', 'asc');
    
    if (records.length === 0) {
      return;
    }
    
    const firstIn = records.find(r => r.attendance.type === 'IN');
    const lastOut = records.filter(r => r.attendance.type === 'OUT').pop();
    
    const duration = await calculateDuration(userId, date);
    const totalHours = duration > 0 ? (duration / 60).toFixed(2) : 0;
    
    // Determine overall status
    let overallStatus = 'PRESENT';
    if (records.some(r => r.attendance.status === 'LATE')) {
      overallStatus = 'LATE';
    } else if (records.some(r => r.attendance.status === 'EARLY_OUT')) {
      overallStatus = 'EARLY_OUT';
    }
    
    // Check if summary exists
    const existingSummaries = await attendanceSummaryDAO.query([
      { field: 'userId', operator: '==', value: userId },
      { field: 'period.type', operator: '==', value: 'daily' },
      { field: 'period.date', operator: '==', value: date }
    ], 1);
    
    const summaryData = {
      userId: userId,
      period: {
        type: 'daily',
        date: date,
        month: date.substring(0, 7), // YYYY-MM
        year: date.substring(0, 4) // YYYY
      },
      statistics: {
        totalDays: 1,
        presentDays: overallStatus !== 'ABSENT' ? 1 : 0,
        absentDays: overallStatus === 'ABSENT' ? 1 : 0,
        lateDays: overallStatus === 'LATE' ? 1 : 0,
        earlyOutDays: overallStatus === 'EARLY_OUT' ? 1 : 0,
        totalHours: parseFloat(totalHours),
        averageHours: parseFloat(totalHours),
        attendancePercentage: overallStatus !== 'ABSENT' ? 100 : 0
      },
      records: [
        {
          date: date,
          firstIn: firstIn ? firstIn.attendance.timestamp : null,
          lastOut: lastOut ? lastOut.attendance.timestamp : null,
          totalHours: parseFloat(totalHours),
          status: overallStatus
        }
      ],
      calculatedAt: admin.firestore.FieldValue.serverTimestamp(),
      isLocked: false
    };
    
    if (existingSummaries.length > 0) {
      // Update existing summary
      await attendanceSummaryDAO.update(existingSummaries[0].id, summaryData);
    } else {
      // Create new summary
      await attendanceSummaryDAO.create(summaryData);
    }
  } catch (error) {
    console.error('Error updating daily summary:', error);
    throw error;
  }
}

// ============== ROUTES ==============

/**
 * POST /api/biometric/iclock/cdata
 * X2008 ADMS Protocol Handler - Main endpoint for biometric device
 * This is the endpoint that X2008 device will call when someone punches
 */
router.post('/iclock/cdata', async (req, res) => {
  try {
    console.log('🟢 X2008 Device Data Received:');
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body Type:', typeof req.body);
    console.log('Body:', req.body);
    console.log('Body (JSON):', JSON.stringify(req.body, null, 2));
    
    // X2008 sends data in specific format, parse it
    const deviceSN = req.headers['sn'] || req.query.SN || 'X2008';
    const rawData = req.body;
    
    // Parse ADMS format data
    // Format: PUNCH\t<UserID>\t<DateTime>\t<PunchState>\t<VerifyType>\t<WorkCode>
    let attendanceRecords = [];
    
    console.log('🔍 DEBUG: rawData type:', typeof rawData);
    console.log('🔍 DEBUG: rawData value:', rawData);
    
    if (typeof rawData === 'string') {
      console.log('🔍 DEBUG: Parsing as string...');
      const lines = rawData.split('\n').filter(line => line.trim());
      console.log('🔍 DEBUG: Found lines:', lines.length);
      
      for (const line of lines) {
        console.log('🔍 DEBUG: Processing line:', line);
        console.log('🔍 DEBUG: Starts with PUNCH?', line.startsWith('PUNCH'));
        console.log('🔍 DEBUG: Includes tab?', line.includes('\t'));
        
        if (line.startsWith('PUNCH') || line.includes('\t')) {
          const parts = line.split('\t');
          console.log('🔍 DEBUG: Split into parts:', parts.length, parts);
          
          if (parts.length >= 3) {
            const userId = parts[1];
            const dateTime = parts[2];
            const punchState = parts[3] || '0';
            const verifyType = parts[4] || '1';
            
            console.log('🔍 DEBUG: Extracted userId:', userId);
            console.log('🔍 DEBUG: Extracted dateTime:', dateTime);
            
            attendanceRecords.push({
              userId: userId,
              deviceId: deviceSN,
              timestamp: dateTime,
              punchState: punchState,
              verifyType: verifyType,
              raw: line
            });
          } else {
            console.log('⚠️  DEBUG: Line has fewer than 3 parts, skipping');
          }
        } else {
          console.log('⚠️  DEBUG: Line doesn\'t match criteria, skipping');
        }
      }
    } else if (rawData && typeof rawData === 'object') {
      console.log('🔍 DEBUG: Parsing as object...');
      // Handle JSON format if device sends JSON
      if (Array.isArray(rawData)) {
        attendanceRecords = rawData;
      } else if (rawData.userId || rawData.templateId) {
        attendanceRecords = [rawData];
      }
    } else {
      console.log('⚠️  DEBUG: rawData is neither string nor object!');
    }
    
    console.log(`📊 Parsed ${attendanceRecords.length} attendance records`);
    console.log(`📊 Records:`, JSON.stringify(attendanceRecords, null, 2));
    
    // Process each record
    const processed = [];
    const errors = [];
    
    for (const record of attendanceRecords) {
      try {
        // Find user by userId or templateId
        const templateId = record.userId || record.templateId;
        const user = await usersDAO.findOneByField('biometricData.templateId', templateId);
        
        if (!user) {
          console.log(`⚠️  User not found for template/user ID: ${templateId}`);
          errors.push({ record, error: 'User not found' });
          continue;
        }
        
        // Parse timestamp
        let recordTimestamp;
        if (record.timestamp) {
          // ADMS format: YYYY-MM-DD HH:MM:SS or timestamp
          recordTimestamp = new Date(record.timestamp);
        } else {
          recordTimestamp = new Date();
        }
        
        const date = moment(recordTimestamp).tz(ATTENDANCE_TIMEZONE).format('YYYY-MM-DD');
        
        // Check for duplicates
        const recentRecords = await attendanceDAO.query([
          { field: 'userId', operator: '==', value: user.id },
          { field: 'attendance.date', operator: '==', value: date }
        ], 10, 'attendance.timestamp', 'desc');
        
        const duplicateCheckWindow = 300; // 5 minutes
        if (recentRecords.length > 0) {
          const lastRecord = recentRecords[0];
          const lastTime = lastRecord.attendance.timestamp.toDate();
          const timeDiff = (recordTimestamp - lastTime) / 1000;
          
          if (timeDiff < duplicateCheckWindow) {
            console.log(`⏰ Duplicate punch ignored for ${user.name} (within ${duplicateCheckWindow}s)`);
            continue;
          }
        }
        
        // Determine attendance type
        const attendanceType = await determineAttendanceType(user.id, recordTimestamp);
        const status = calculateAttendanceStatus(recordTimestamp, attendanceType, user);
        
        // Create attendance record
        const attendanceData = {
          userId: user.id,
          employeeId: user.employeeId || null,
          studentId: user.studentId || null,
          biometricData: {
            templateId: templateId,
            deviceId: deviceSN,
            deviceLocation: 'Main Entrance',
            verificationMethod: record.verifyType === '1' ? 'fingerprint' : 'face',
            confidence: 95
          },
          attendance: {
            date: date,
            timestamp: admin.firestore.Timestamp.fromDate(recordTimestamp),
            type: attendanceType,
            status: status,
            location: 'Main Entrance'
          },
          metadata: {
            ipAddress: req.ip || req.connection.remoteAddress,
            rawData: JSON.stringify(record),
            processed: true,
            anomaly: false
          }
        };
        
        const savedRecord = await attendanceDAO.create(attendanceData);
        processed.push(savedRecord);
        
        console.log(`✅ Attendance recorded: ${user.name} - ${attendanceType} at ${moment(recordTimestamp).format('HH:mm:ss')}`);
        
        // Update daily summary
        updateDailySummary(user.id, date).catch(err => {
          console.error('Error updating summary:', err);
        });
        
      } catch (error) {
        console.error('Error processing record:', error);
        errors.push({ record, error: error.message });
      }
    }
    
    // X2008 expects specific response format
    // Response format: OK or ERROR
    const response = processed.length > 0 ? 'OK' : 'ERROR:No valid records';
    console.log(`📤 Sending response to device: ${response}`);
    console.log(`📊 Processed: ${processed.length}, Errors: ${errors.length}`);
    
    res.set('Content-Type', 'text/plain');
    res.send(response);
    
  } catch (error) {
    console.error('❌ X2008 Processing Error:', error);
    res.set('Content-Type', 'text/plain');
    res.send('ERROR');
  }
});

/**
 * GET /api/biometric/iclock/getrequest
 * X2008 Device Initialization - Device polls this to check for commands
 */
router.get('/iclock/getrequest', async (req, res) => {
  try {
    const deviceSN = req.query.SN || req.headers['sn'] || 'X2008';
    console.log(`📱 Device poll from: ${deviceSN}`);
    
    // Update device heartbeat
    try {
      const device = await biometricDevicesDAO.findOneByField('deviceInfo.deviceId', deviceSN);
      if (device) {
        await biometricDevicesDAO.update(device.id, {
          'status.isOnline': true,
          'status.lastHeartbeat': admin.firestore.FieldValue.serverTimestamp()
        });
      }
    } catch (err) {
      console.log('Device not registered yet:', deviceSN);
    }
    
    // Return commands for device (empty for now)
    res.set('Content-Type', 'text/plain');
    res.send('OK');
  } catch (error) {
    console.error('Device poll error:', error);
    res.set('Content-Type', 'text/plain');
    res.send('OK');
  }
});

/**
 * POST /api/biometric/attendance/push
 * Receive batch attendance records from eSSL device (push mechanism)
 */
router.post('/attendance/push', verifyWebhookSecret, async (req, res) => {
  try {
    const { deviceId, records } = req.body;
    
    if (!deviceId || !records || !Array.isArray(records)) {
      return res.status(400).json({ error: 'Invalid request format' });
    }
    
    const processedRecords = [];
    const errors = [];
    
    for (const record of records) {
      try {
        const processed = await processSingleAttendanceRecord({
          ...record,
          deviceId: deviceId
        });
        
        if (processed) {
          processedRecords.push(processed);
        }
      } catch (error) {
        errors.push({
          record: record,
          error: error.message
        });
      }
    }
    
    res.json({
      success: true,
      processed: processedRecords.length,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Biometric push error:', error);
    res.status(500).json({ error: 'Failed to process attendance data' });
  }
});

/**
 * POST /api/biometric/attendance/realtime
 * Receive single real-time attendance record from eSSL device
 */
router.post('/attendance/realtime', verifyWebhookSecret, async (req, res) => {
  try {
    const record = req.body;
    
    if (!record.templateId || !record.deviceId || !record.timestamp) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const processed = await processSingleAttendanceRecord(record);
    
    if (!processed) {
      return res.status(404).json({ error: 'User not found for biometric template' });
    }
    
    res.json({
      success: true,
      recordId: processed.id,
      attendanceType: processed.attendance.type,
      status: processed.attendance.status
    });
  } catch (error) {
    console.error('Real-time attendance error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/biometric/attendance/:userId
 * Get attendance records for a user
 */
router.get('/attendance/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate, limit = 100 } = req.query;
    
    let conditions = [
      { field: 'userId', operator: '==', value: userId }
    ];
    
    if (startDate) {
      conditions.push({
        field: 'attendance.date',
        operator: '>=',
        value: startDate
      });
    }
    
    if (endDate) {
      conditions.push({
        field: 'attendance.date',
        operator: '<=',
        value: endDate
      });
    }
    
    const records = await attendanceDAO.query(
      conditions,
      parseInt(limit),
      'attendance.timestamp',
      'desc'
    );
    
    res.json(records);
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/biometric/attendance/summary/:userId
 * Get attendance summary for a user
 */
router.get('/attendance/summary/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { type = 'daily', month, year } = req.query;
    
    let conditions = [
      { field: 'userId', operator: '==', value: userId },
      { field: 'period.type', operator: '==', value: type }
    ];
    
    if (month) {
      conditions.push({
        field: 'period.month',
        operator: '==',
        value: month
      });
    }
    
    if (year) {
      conditions.push({
        field: 'period.year',
        operator: '==',
        value: year
      });
    }
    
    const summaries = await attendanceSummaryDAO.query(
      conditions,
      100,
      'period.date',
      'desc'
    );
    
    res.json(summaries);
  } catch (error) {
    console.error('Error fetching attendance summary:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/biometric/devices
 * Register a new biometric device
 */
router.post('/devices', async (req, res) => {
  try {
    const deviceData = req.body;
    
    // Check if device already exists
    const existing = await biometricDevicesDAO.findOneByField(
      'deviceInfo.deviceId',
      deviceData.deviceInfo.deviceId
    );
    
    if (existing) {
      return res.status(409).json({ error: 'Device already registered' });
    }
    
    // Set default values
    const device = {
      deviceInfo: deviceData.deviceInfo,
      networkInfo: deviceData.networkInfo,
      location: deviceData.location,
      configuration: {
        timezone: ATTENDANCE_TIMEZONE,
        attendanceMode: deviceData.configuration?.attendanceMode || 'IN_OUT',
        verificationMethod: deviceData.configuration?.verificationMethod || ['fingerprint'],
        duplicateCheckWindow: deviceData.configuration?.duplicateCheckWindow || 300
      },
      status: {
        isOnline: true,
        lastHeartbeat: admin.firestore.FieldValue.serverTimestamp(),
        batteryLevel: 100,
        storageUsed: 0
      },
      statistics: {
        totalRecords: 0,
        dailyRecords: 0,
        errorCount: 0,
        lastMaintenance: admin.firestore.FieldValue.serverTimestamp()
      }
    };
    
    const created = await biometricDevicesDAO.create(device);
    res.status(201).json(created);
  } catch (error) {
    console.error('Error registering device:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/biometric/devices
 * Get all registered devices
 */
router.get('/devices', async (req, res) => {
  try {
    const devices = await biometricDevicesDAO.findAll({}, 100, 'createdAt', 'desc');
    res.json(devices);
  } catch (error) {
    console.error('Error fetching devices:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/biometric/devices/:deviceId
 * Get device by ID
 */
router.get('/devices/:deviceId', async (req, res) => {
  try {
    const device = await biometricDevicesDAO.findById(req.params.deviceId);
    
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    res.json(device);
  } catch (error) {
    console.error('Error fetching device:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/biometric/devices/:deviceId/heartbeat
 * Device heartbeat endpoint
 */
router.post('/devices/:deviceId/heartbeat', verifyWebhookSecret, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { batteryLevel, storageUsed, dailyRecords } = req.body;
    
    const updateData = {
      'status.isOnline': true,
      'status.lastHeartbeat': admin.firestore.FieldValue.serverTimestamp()
    };
    
    if (batteryLevel !== undefined) {
      updateData['status.batteryLevel'] = batteryLevel;
    }
    
    if (storageUsed !== undefined) {
      updateData['status.storageUsed'] = storageUsed;
    }
    
    if (dailyRecords !== undefined) {
      updateData['statistics.dailyRecords'] = dailyRecords;
    }
    
    await biometricDevicesDAO.update(deviceId, updateData);
    
    res.json({ success: true, message: 'Heartbeat received' });
  } catch (error) {
    console.error('Error updating device heartbeat:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/biometric/users/:userId/enroll
 * Enroll a user for biometric authentication
 */
router.put('/users/:userId/enroll', async (req, res) => {
  try {
    const { userId } = req.params;
    const { templateId, deviceIds } = req.body;
    
    if (!templateId) {
      return res.status(400).json({ error: 'Template ID is required' });
    }
    
    const user = await usersDAO.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const updateData = {
      'biometricData.enrolled': true,
      'biometricData.templateId': templateId,
      'biometricData.deviceIds': deviceIds || [],
      'biometricData.enrolledAt': admin.firestore.FieldValue.serverTimestamp(),
      'biometricData.lastVerified': admin.firestore.FieldValue.serverTimestamp()
    };
    
    const updated = await usersDAO.update(userId, updateData);
    
    res.json({
      success: true,
      user: updated
    });
  } catch (error) {
    console.error('Error enrolling user:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/biometric/reports/daily
 * Get daily attendance report
 */
router.get('/reports/daily', async (req, res) => {
  try {
    const { date = moment().tz(ATTENDANCE_TIMEZONE).format('YYYY-MM-DD') } = req.query;
    
    // Get all attendance records for the date
    const records = await attendanceDAO.query([
      { field: 'attendance.date', operator: '==', value: date }
    ], 1000, 'attendance.timestamp', 'asc');
    
    // Group by user
    const userAttendance = {};
    
    records.forEach(record => {
      if (!userAttendance[record.userId]) {
        userAttendance[record.userId] = {
          userId: record.userId,
          employeeId: record.employeeId,
          studentId: record.studentId,
          records: []
        };
      }
      userAttendance[record.userId].records.push(record);
    });
    
    // Calculate statistics
    const report = Object.values(userAttendance).map(user => {
      const firstIn = user.records.find(r => r.attendance.type === 'IN');
      const lastOut = user.records.filter(r => r.attendance.type === 'OUT').pop();
      
      return {
        userId: user.userId,
        employeeId: user.employeeId,
        studentId: user.studentId,
        firstIn: firstIn?.attendance.timestamp || null,
        lastOut: lastOut?.attendance.timestamp || null,
        status: firstIn?.attendance.status || 'ABSENT',
        totalRecords: user.records.length
      };
    });
    
    res.json({
      date: date,
      totalUsers: report.length,
      present: report.filter(r => r.status !== 'ABSENT').length,
      late: report.filter(r => r.status === 'LATE').length,
      report: report,
      records: records  // Add raw records for frontend
    });
  } catch (error) {
    console.error('Error generating daily report:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;


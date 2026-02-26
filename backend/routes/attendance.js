const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

// Data file paths
const DATA_DIR = path.join(__dirname, '../data');
const SESSIONS_FILE = path.join(DATA_DIR, 'attendance-sessions.json');
const BRANCHES_FILE = path.join(DATA_DIR, 'attendance-branches.json');
const PERIODS_FILE = path.join(DATA_DIR, 'attendance-periods.json');
const SUBJECTS_FILE = path.join(DATA_DIR, 'attendance-subjects.json');
const ASSIGNMENTS_FILE = path.join(DATA_DIR, 'attendance-subject-assignments.json');
const ENROLLMENTS_FILE = path.join(DATA_DIR, 'attendance-enrollments.json');
const RECORDS_FILE = path.join(DATA_DIR, 'attendance-records.json');
const SUMMARIES_FILE = path.join(DATA_DIR, 'attendance-summaries.json');
const SEMESTER_CONFIG_FILE = path.join(DATA_DIR, 'attendance-semester-config.json');
const AUDIT_FILE = path.join(DATA_DIR, 'attendance-audit-logs.json');
const FACULTY_PROFILES_FILE = path.join(DATA_DIR, 'faculty-profiles.json');

// Helper: Read JSON file
async function readJSON(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // Silently return empty data if file doesn't exist (Firestore migration)
        if (error.code === 'ENOENT') {
            return filePath.endsWith('.json') && !filePath.includes('audit') ? {} : [];
        }
        console.error(`Error reading ${filePath}:`, error);
        return filePath.endsWith('.json') && !filePath.includes('audit') ? {} : [];
    }
}

// Helper: Write JSON file
async function writeJSON(filePath, data) {
    try {
        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error(`Error writing ${filePath}:`, error);
        return false;
    }
}

// Helper: Add audit log
async function addAuditLog(action, details, userEmail) {
    const logs = await readJSON(AUDIT_FILE);
    logs.push({
        id: Date.now().toString(),
        action,
        details,
        userEmail,
        timestamp: new Date().toISOString()
    });
    // Keep only last 1000 logs
    if (logs.length > 1000) {
        logs.splice(0, logs.length - 1000);
    }
    await writeJSON(AUDIT_FILE, logs);
}

// ============================================================================
// CONFIGURATION ENDPOINTS (Admin Only)
// ============================================================================

// Get all sessions
router.get('/sessions', async (req, res) => {
    try {
        const sessions = await readJSON(SESSIONS_FILE);
        res.json({ success: true, sessions: Object.values(sessions) });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create session
router.post('/sessions', async (req, res) => {
    try {
        const { name, startYear, endYear, createdBy } = req.body;
        const sessions = await readJSON(SESSIONS_FILE);
        
        const id = `${startYear}-${endYear}`;
        if (sessions[id]) {
            return res.status(400).json({ success: false, error: 'Session already exists' });
        }
        
        sessions[id] = {
            id,
            name: name || id,
            startYear,
            endYear,
            status: 'active',
            createdAt: new Date().toISOString(),
            createdBy
        };
        
        await writeJSON(SESSIONS_FILE, sessions);
        await addAuditLog('CREATE_SESSION', { sessionId: id }, createdBy);
        
        res.json({ success: true, session: sessions[id] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get all branches
router.get('/branches', async (req, res) => {
    try {
        const branches = await readJSON(BRANCHES_FILE);
        res.json({ success: true, branches: Object.values(branches) });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create branch
router.post('/branches', async (req, res) => {
    try {
        const { id, name, code, createdBy } = req.body;
        const branches = await readJSON(BRANCHES_FILE);
        
        if (branches[id]) {
            return res.status(400).json({ success: false, error: 'Branch already exists' });
        }
        
        branches[id] = {
            id,
            name,
            code: code || id,
            status: 'active',
            semesters: [1, 2, 3, 4, 5, 6],
            createdAt: new Date().toISOString(),
            createdBy
        };
        
        await writeJSON(BRANCHES_FILE, branches);
        await addAuditLog('CREATE_BRANCH', { branchId: id }, createdBy);
        
        res.json({ success: true, branch: branches[id] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get all periods
router.get('/periods', async (req, res) => {
    try {
        const periods = await readJSON(PERIODS_FILE);
        res.json({ success: true, periods: Object.values(periods).sort((a, b) => a.order - b.order) });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create period
router.post('/periods', async (req, res) => {
    try {
        const { id, name, startTime, endTime, order, createdBy } = req.body;
        const periods = await readJSON(PERIODS_FILE);
        
        if (periods[id]) {
            return res.status(400).json({ success: false, error: 'Period already exists' });
        }
        
        periods[id] = {
            id,
            name,
            startTime,
            endTime,
            order,
            status: 'active',
            createdAt: new Date().toISOString(),
            createdBy
        };
        
        await writeJSON(PERIODS_FILE, periods);
        await addAuditLog('CREATE_PERIOD', { periodId: id }, createdBy);
        
        res.json({ success: true, period: periods[id] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get subjects (with filters)
router.get('/subjects', async (req, res) => {
    try {
        const { sessionId, branchId, semester } = req.query;
        let subjects = await readJSON(SUBJECTS_FILE);
        subjects = Object.values(subjects);
        
        if (sessionId) subjects = subjects.filter(s => s.sessionId === sessionId);
        if (branchId) subjects = subjects.filter(s => s.branchId === branchId);
        if (semester) subjects = subjects.filter(s => s.semester === parseInt(semester));
        
        res.json({ success: true, subjects });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// SEMESTER CONFIGURATION (Admin Only)
// ============================================================================

// Get semester configuration
router.get('/semester-config', async (req, res) => {
    try {
        const { sessionId, branchId, semester } = req.query;
        let config = await readJSON(SEMESTER_CONFIG_FILE);
        
        if (sessionId || branchId || semester) {
            config = Object.values(config).filter(c => {
                if (sessionId && c.sessionId !== sessionId) return false;
                if (branchId && c.branchId !== branchId) return false;
                if (semester && c.semester !== parseInt(semester)) return false;
                return true;
            });
            res.json({ success: true, configurations: config });
        } else {
            res.json({ success: true, configurations: Object.values(config) });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Set semester configuration (admin)
router.post('/semester-config', async (req, res) => {
    try {
        const { sessionId, branchId, semester, startDate, endDate, createdBy } = req.body;
        
        if (!sessionId || !branchId || !semester || !startDate || !endDate) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }
        
        const config = await readJSON(SEMESTER_CONFIG_FILE);
        const configKey = `${sessionId}_${branchId}_${semester}`;
        
        config[configKey] = {
            id: configKey,
            sessionId,
            branchId,
            semester: parseInt(semester),
            startDate,
            endDate,
            createdAt: new Date().toISOString(),
            createdBy: createdBy || 'admin',
            lastModified: new Date().toISOString()
        };
        
        await writeJSON(SEMESTER_CONFIG_FILE, config);
        await addAuditLog('SET_SEMESTER_CONFIG', { sessionId, branchId, semester, startDate, endDate }, createdBy);
        
        res.json({ success: true, configuration: config[configKey] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update semester configuration (admin)
router.put('/semester-config/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { startDate, endDate, modifiedBy } = req.body;
        
        const config = await readJSON(SEMESTER_CONFIG_FILE);
        
        if (!config[id]) {
            return res.status(404).json({ success: false, error: 'Configuration not found' });
        }
        
        if (startDate) config[id].startDate = startDate;
        if (endDate) config[id].endDate = endDate;
        config[id].lastModified = new Date().toISOString();
        config[id].modifiedBy = modifiedBy || 'admin';
        
        await writeJSON(SEMESTER_CONFIG_FILE, config);
        await addAuditLog('UPDATE_SEMESTER_CONFIG', { configId: id, startDate, endDate }, modifiedBy);
        
        res.json({ success: true, configuration: config[id] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create subject
router.post('/subjects', async (req, res) => {
    try {
        const { sessionId, branchId, semester, subjectCode, subjectName, credits, createdBy } = req.body;
        const subjects = await readJSON(SUBJECTS_FILE);
        
        const id = `${branchId}_${sessionId.split('-')[0]}_${semester}_${subjectCode}`;
        
        if (subjects[id]) {
            return res.status(400).json({ success: false, error: 'Subject already exists' });
        }
        
        subjects[id] = {
            id,
            sessionId,
            branchId,
            semester: parseInt(semester),
            subjectCode,
            subjectName,
            credits: parseInt(credits),
            status: 'active',
            createdAt: new Date().toISOString(),
            createdBy
        };
        
        await writeJSON(SUBJECTS_FILE, subjects);
        await addAuditLog('CREATE_SUBJECT', { subjectId: id }, createdBy);
        
        res.json({ success: true, subject: subjects[id] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// SUBJECT-FACULTY ASSIGNMENT (Admin Only)
// ============================================================================

// Get subject assignments
router.get('/subject-assignments', async (req, res) => {
    try {
        const { sessionId, branchId, semester, facultyEmail } = req.query;
        let assignments = await readJSON(ASSIGNMENTS_FILE);
        assignments = Object.values(assignments);
        
        if (sessionId) assignments = assignments.filter(a => a.sessionId === sessionId);
        if (branchId) assignments = assignments.filter(a => a.branchId === branchId);
        if (semester) assignments = assignments.filter(a => a.semester === parseInt(semester));
        if (facultyEmail) assignments = assignments.filter(a => a.facultyEmail === facultyEmail);
        
        res.json({ success: true, assignments });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Assign subject to faculty
router.post('/subject-assignments', async (req, res) => {
    try {
        const { subjectId, facultyEmail, facultyName, sessionId, branchId, semester, createdBy } = req.body;
        const assignments = await readJSON(ASSIGNMENTS_FILE);
        
        const id = `${subjectId}_${facultyEmail}`;
        
        assignments[id] = {
            id,
            subjectId,
            facultyEmail,
            facultyName,
            sessionId,
            branchId,
            semester: parseInt(semester),
            status: 'active',
            createdAt: new Date().toISOString(),
            createdBy
        };
        
        await writeJSON(ASSIGNMENTS_FILE, assignments);
        await addAuditLog('ASSIGN_SUBJECT', { subjectId, facultyEmail }, createdBy);
        
        res.json({ success: true, assignment: assignments[id] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// STUDENT ENROLLMENT (Admin Only)
// ============================================================================

// Get enrollments
router.get('/enrollments', async (req, res) => {
    try {
        const { sessionId, branchId, semester, studentEmail } = req.query;
        let enrollments = await readJSON(ENROLLMENTS_FILE);
        enrollments = Object.values(enrollments);
        
        if (sessionId) enrollments = enrollments.filter(e => e.sessionId === sessionId);
        if (branchId) enrollments = enrollments.filter(e => e.branchId === branchId);
        if (semester) enrollments = enrollments.filter(e => e.semester === parseInt(semester));
        if (studentEmail) enrollments = enrollments.filter(e => e.studentEmail === studentEmail);
        
        res.json({ success: true, enrollments });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Enroll student
router.post('/enrollments', async (req, res) => {
    try {
        const { studentEmail, studentId, studentName, sessionId, branchId, semester, createdBy } = req.body;
        const enrollments = await readJSON(ENROLLMENTS_FILE);
        
        const id = `${studentEmail}_${sessionId}_${branchId}_${semester}`;
        
        enrollments[id] = {
            id,
            studentEmail,
            studentId,
            studentName,
            sessionId,
            branchId,
            semester: parseInt(semester),
            status: 'active',
            createdAt: new Date().toISOString(),
            createdBy
        };
        
        await writeJSON(ENROLLMENTS_FILE, enrollments);
        await addAuditLog('ENROLL_STUDENT', { studentEmail, sessionId, branchId, semester }, createdBy);
        
        res.json({ success: true, enrollment: enrollments[id] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete enrollment
router.delete('/enrollments/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const enrollments = await readJSON(ENROLLMENTS_FILE);
        
        if (!enrollments[id]) {
            return res.status(404).json({ success: false, error: 'Enrollment not found' });
        }
        
        const deletedEnrollment = enrollments[id];
        delete enrollments[id];
        
        await writeJSON(ENROLLMENTS_FILE, enrollments);
        await addAuditLog('DELETE_ENROLLMENT', { 
            enrollmentId: id,
            studentEmail: deletedEnrollment.studentEmail,
            sessionId: deletedEnrollment.sessionId,
            branchId: deletedEnrollment.branchId,
            semester: deletedEnrollment.semester
        }, req.user?.email || 'admin');
        
        res.json({ success: true, message: 'Enrollment deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// ATTENDANCE MARKING (Faculty)
// ============================================================================

// Mark attendance
router.post('/mark-attendance', async (req, res) => {
    try {
        const { date, sessionId, branchId, semester, periodId, subjectId, attendance, classNotConducted, markedBy } = req.body;
        const records = await readJSON(RECORDS_FILE);
        
        // Create unique key for duplicate prevention
        const recordKey = `${date}_${sessionId}_${branchId}_${semester}_${periodId}_${subjectId}`;
        
        // Check if attendance already marked
        if (records[recordKey] && !records[recordKey].canEdit) {
            return res.status(400).json({ success: false, error: 'Attendance already marked and locked' });
        }
        
        // Calculate 24-hour edit window
        const now = new Date();
        const markedTime = new Date();
        const editUntil = new Date(markedTime.getTime() + 24 * 60 * 60 * 1000);
        
        records[recordKey] = {
            id: recordKey,
            date,
            sessionId,
            branchId,
            semester: parseInt(semester),
            periodId,
            subjectId,
            classNotConducted: classNotConducted || false,
            attendance: attendance || [],
            totalStudents: attendance ? attendance.length : 0,
            presentCount: attendance ? attendance.filter(a => a.status === 'present').length : 0,
            absentCount: attendance ? attendance.filter(a => a.status === 'absent').length : 0,
            markedBy,
            markedAt: markedTime.toISOString(),
            editUntil: editUntil.toISOString(),
            canEdit: true,
            status: 'submitted'
        };
        
        await writeJSON(RECORDS_FILE, records);
        
        // Update summaries for each student
        if (!classNotConducted && attendance) {
            await updateStudentSummaries(attendance, sessionId, branchId, semester, subjectId);
        }
        
        await addAuditLog('MARK_ATTENDANCE', { date, sessionId, branchId, semester, periodId, subjectId }, markedBy);
        
        res.json({ success: true, record: records[recordKey] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Helper: Update student attendance summaries
async function updateStudentSummaries(attendance, sessionId, branchId, semester, subjectId) {
    const summaries = await readJSON(SUMMARIES_FILE);
    
    for (const record of attendance) {
        const key = `${record.studentEmail}_${sessionId}_${branchId}_${semester}_${subjectId}`;
        
        if (!summaries[key]) {
            summaries[key] = {
                id: key,
                studentEmail: record.studentEmail,
                studentId: record.studentId,
                studentName: record.studentName,
                sessionId,
                branchId,
                semester: parseInt(semester),
                subjectId,
                totalConducted: 0,
                totalPresent: 0,
                totalAbsent: 0,
                percentage: 0,
                lastUpdated: new Date().toISOString()
            };
        }
        
        summaries[key].totalConducted += 1;
        if (record.status === 'present') {
            summaries[key].totalPresent += 1;
        } else {
            summaries[key].totalAbsent += 1;
        }
        summaries[key].percentage = ((summaries[key].totalPresent / summaries[key].totalConducted) * 100).toFixed(2);
        summaries[key].lastUpdated = new Date().toISOString();
    }
    
    await writeJSON(SUMMARIES_FILE, summaries);
}

// Get attendance records (with filters)
router.get('/records', async (req, res) => {
    try {
        const { date, sessionId, branchId, semester, periodId, subjectId, markedBy } = req.query;
        let records = await readJSON(RECORDS_FILE);
        records = Object.values(records);
        
        if (date) records = records.filter(r => r.date === date);
        if (sessionId) records = records.filter(r => r.sessionId === sessionId);
        if (branchId) records = records.filter(r => r.branchId === branchId);
        if (semester) records = records.filter(r => r.semester === parseInt(semester));
        if (periodId) records = records.filter(r => r.periodId === periodId);
        if (subjectId) records = records.filter(r => r.subjectId === subjectId);
        if (markedBy) records = records.filter(r => r.markedBy === markedBy);
        
        res.json({ success: true, records });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get student list for attendance marking
router.get('/student-list', async (req, res) => {
    try {
        const { sessionId, branchId, semester } = req.query;
        
        if (!sessionId || !branchId || !semester) {
            return res.status(400).json({ success: false, error: 'Missing required parameters' });
        }
        
        const enrollments = await readJSON(ENROLLMENTS_FILE);
        const students = Object.values(enrollments).filter(e => 
            e.sessionId === sessionId && 
            e.branchId === branchId && 
            e.semester === parseInt(semester) &&
            e.status === 'active'
        );
        
        res.json({ success: true, students });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// STUDENT VIEW
// ============================================================================

// Get student attendance summary
router.get('/student-summary/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const summaries = await readJSON(SUMMARIES_FILE);
        
        const studentSummaries = Object.values(summaries).filter(s => s.studentEmail === email);
        
        res.json({ success: true, summaries: studentSummaries });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get student daily attendance
router.get('/student-daily/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const { sessionId, branchId, semester, startDate, endDate } = req.query;
        
        const records = await readJSON(RECORDS_FILE);
        let dailyRecords = [];
        
        for (const record of Object.values(records)) {
            if (record.classNotConducted) continue;
            
            const studentRecord = record.attendance.find(a => a.studentEmail === email);
            if (studentRecord) {
                if (sessionId && record.sessionId !== sessionId) continue;
                if (branchId && record.branchId !== branchId) continue;
                if (semester && record.semester !== parseInt(semester)) continue;
                if (startDate && record.date < startDate) continue;
                if (endDate && record.date > endDate) continue;
                
                dailyRecords.push({
                    date: record.date,
                    periodId: record.periodId,
                    subjectId: record.subjectId,
                    status: studentRecord.status,
                    markedAt: record.markedAt
                });
            }
        }
        
        res.json({ success: true, records: dailyRecords });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get student attendance records grouped by date and period (for Day Wise Attendance modal)
router.get('/student-records/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const { sessionId, branchId, semester, fromDate, toDate } = req.query;
        
        const records = await readJSON(RECORDS_FILE);
        const periods = await readJSON(PERIODS_FILE);
        const subjects = await readJSON(SUBJECTS_FILE);
        const facultyProfiles = await readJSON(FACULTY_PROFILES_FILE);
        
        // Get all period IDs sorted by order
        const allPeriods = Object.values(periods)
            .filter(p => p.status === 'active')
            .sort((a, b) => a.order - b.order);
        
        // Group records by date
        const dateMap = {};
        
        for (const record of Object.values(records)) {
            if (record.classNotConducted) continue;
            
            const studentRecord = record.attendance.find(a => a.studentEmail === email);
            if (!studentRecord) continue;
            
            // Apply filters
            if (sessionId && record.sessionId !== sessionId) continue;
            if (branchId && record.branchId !== branchId) continue;
            if (semester && record.semester !== parseInt(semester)) continue;
            if (fromDate && record.date < fromDate) continue;
            if (toDate && record.date > toDate) continue;
            
            // Initialize date entry if not exists
            if (!dateMap[record.date]) {
                dateMap[record.date] = {
                    date: record.date,
                    periods: []
                };
            }
            
            // Extract period number from periodId (e.g., "P1" -> 1)
            const periodMatch = record.periodId.match(/P(\d+)/);
            const periodNumber = periodMatch ? parseInt(periodMatch[1]) : null;
            
            // Get subject details
            const subject = subjects[record.subjectId] || {};
            
            // Get faculty details
            const facultyEmail = record.markedBy || 'Unknown';
            const faculty = facultyProfiles[facultyEmail] || {};
            const facultyName = faculty.fullName || facultyEmail;
            const facultyEmployeeId = faculty.employeeId || 'N/A';
            
            if (periodNumber) {
                dateMap[record.date].periods.push({
                    period: periodNumber,
                    periodId: record.periodId,
                    status: studentRecord.status,
                    subjectId: record.subjectId,
                    subjectName: subject.subjectName || record.subjectId,
                    subjectCode: subject.subjectCode || '',
                    facultyName: facultyName,
                    facultyEmployeeId: facultyEmployeeId,
                    markedAt: record.markedAt
                });
            }
        }
        
        // Convert to array and sort by date (newest first)
        const dateWiseRecords = Object.values(dateMap)
            .sort((a, b) => new Date(b.date) - new Date(a.date));
        
        res.json({ 
            success: true, 
            records: dateWiseRecords,
            totalDays: dateWiseRecords.length
        });
    } catch (error) {
        console.error('Error fetching student records:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// ADMIN OVERRIDE & REPORTS
// ============================================================================

// Admin: Lock/Unlock attendance record
router.put('/records/:id/lock', async (req, res) => {
    try {
        const { id } = req.params;
        const { lock, modifiedBy } = req.body;
        
        const records = await readJSON(RECORDS_FILE);
        
        if (!records[id]) {
            return res.status(404).json({ success: false, error: 'Record not found' });
        }
        
        records[id].canEdit = !lock;
        records[id].lockedBy = lock ? modifiedBy : null;
        records[id].lockedAt = lock ? new Date().toISOString() : null;
        
        await writeJSON(RECORDS_FILE, records);
        await addAuditLog(lock ? 'LOCK_ATTENDANCE' : 'UNLOCK_ATTENDANCE', { recordId: id }, modifiedBy);
        
        res.json({ success: true, record: records[id] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Admin: Edit attendance record
router.put('/records/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { attendance, modifiedBy } = req.body;
        
        const records = await readJSON(RECORDS_FILE);
        
        if (!records[id]) {
            return res.status(404).json({ success: false, error: 'Record not found' });
        }
        
        records[id].attendance = attendance;
        records[id].presentCount = attendance.filter(a => a.status === 'present').length;
        records[id].absentCount = attendance.filter(a => a.status === 'absent').length;
        records[id].modifiedBy = modifiedBy;
        records[id].modifiedAt = new Date().toISOString();
        
        await writeJSON(RECORDS_FILE, records);
        
        // Recalculate summaries
        const summaries = await readJSON(SUMMARIES_FILE);
        const affectedSummaries = Object.keys(summaries).filter(key => 
            summaries[key].sessionId === records[id].sessionId &&
            summaries[key].branchId === records[id].branchId &&
            summaries[key].semester === records[id].semester &&
            summaries[key].subjectId === records[id].subjectId
        );
        
        // Reset and recalculate
        for (const key of affectedSummaries) {
            summaries[key].totalConducted = 0;
            summaries[key].totalPresent = 0;
            summaries[key].totalAbsent = 0;
        }
        
        for (const record of Object.values(records)) {
            if (record.classNotConducted) continue;
            if (record.sessionId === records[id].sessionId &&
                record.branchId === records[id].branchId &&
                record.semester === records[id].semester &&
                record.subjectId === records[id].subjectId) {
                
                for (const att of record.attendance) {
                    const key = `${att.studentEmail}_${record.sessionId}_${record.branchId}_${record.semester}_${record.subjectId}`;
                    if (summaries[key]) {
                        summaries[key].totalConducted += 1;
                        if (att.status === 'present') summaries[key].totalPresent += 1;
                        else summaries[key].totalAbsent += 1;
                        summaries[key].percentage = ((summaries[key].totalPresent / summaries[key].totalConducted) * 100).toFixed(2);
                    }
                }
            }
        }
        
        await writeJSON(SUMMARIES_FILE, summaries);
        await addAuditLog('EDIT_ATTENDANCE', { recordId: id }, modifiedBy);
        
        res.json({ success: true, record: records[id] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get audit logs
router.get('/audit-logs', async (req, res) => {
    try {
        const { startDate, endDate, userEmail, action } = req.query;
        let logs = await readJSON(AUDIT_FILE);
        
        if (startDate) logs = logs.filter(l => l.timestamp >= startDate);
        if (endDate) logs = logs.filter(l => l.timestamp <= endDate);
        if (userEmail) logs = logs.filter(l => l.userEmail === userEmail);
        if (action) logs = logs.filter(l => l.action === action);
        
        res.json({ success: true, logs: logs.slice(-100).reverse() }); // Last 100 logs
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Admin: Clean up orphaned attendance data (for users that no longer exist)
router.post('/cleanup-orphaned-data', async (req, res) => {
    try {
        const fs = require('fs');
        const path = require('path');
        const USERS_FILE = path.join(__dirname, '../data/users.json');
        
        // Load all users
        const usersData = fs.readFileSync(USERS_FILE, 'utf8');
        const users = JSON.parse(usersData);
        const validEmails = Object.keys(users);
        
        console.log('🧹 Starting orphaned data cleanup...');
        console.log(`✅ Valid users: ${validEmails.length}`);
        
        let cleanupStats = {
            enrollmentsDeleted: 0,
            recordsModified: 0,
            summariesDeleted: 0
        };
        
        // Clean up enrollments
        const enrollments = await readJSON(ENROLLMENTS_FILE);
        const enrollmentKeys = Object.keys(enrollments);
        enrollmentKeys.forEach(key => {
            const enrollment = enrollments[key];
            if (!validEmails.includes(enrollment.studentEmail)) {
                console.log(`  🗑️ Deleting orphaned enrollment: ${key}`);
                delete enrollments[key];
                cleanupStats.enrollmentsDeleted++;
            }
        });
        if (cleanupStats.enrollmentsDeleted > 0) {
            await writeJSON(ENROLLMENTS_FILE, enrollments);
        }
        
        // Clean up attendance records (remove students from arrays)
        const records = await readJSON(RECORDS_FILE);
        const recordKeys = Object.keys(records);
        recordKeys.forEach(key => {
            const record = records[key];
            if (record.attendance && Array.isArray(record.attendance)) {
                const initialLength = record.attendance.length;
                record.attendance = record.attendance.filter(a => validEmails.includes(a.studentEmail));
                
                if (record.attendance.length < initialLength) {
                    record.totalStudents = record.attendance.length;
                    record.presentCount = record.attendance.filter(a => a.status === 'present').length;
                    record.absentCount = record.attendance.filter(a => a.status === 'absent').length;
                    cleanupStats.recordsModified++;
                }
            }
        });
        if (cleanupStats.recordsModified > 0) {
            await writeJSON(RECORDS_FILE, records);
        }
        
        // Clean up summaries
        const summaries = await readJSON(SUMMARIES_FILE);
        const summaryKeys = Object.keys(summaries);
        summaryKeys.forEach(key => {
            const summary = summaries[key];
            if (!validEmails.includes(summary.studentEmail)) {
                console.log(`  🗑️ Deleting orphaned summary: ${key}`);
                delete summaries[key];
                cleanupStats.summariesDeleted++;
            }
        });
        if (cleanupStats.summariesDeleted > 0) {
            await writeJSON(SUMMARIES_FILE, summaries);
        }
        
        // Add audit log
        await addAuditLog('CLEANUP_ORPHANED_DATA', cleanupStats, 'system');
        
        console.log('✅ Orphaned data cleanup completed');
        console.log(`   - Enrollments deleted: ${cleanupStats.enrollmentsDeleted}`);
        console.log(`   - Records modified: ${cleanupStats.recordsModified}`);
        console.log(`   - Summaries deleted: ${cleanupStats.summariesDeleted}`);
        
        res.json({
            success: true,
            message: 'Orphaned data cleanup completed',
            stats: cleanupStats
        });
        
    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;

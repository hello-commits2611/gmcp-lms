# 🔐 Biometric Attendance Integration Guide

## ✅ Complete Setup (One Command)

### 1. Stop Current Server
If your server is running, press `Ctrl+C` to stop it.

### 2. Restart Server
```powershell
npm start
```

### 3. Run Deployment Script
Open a **NEW PowerShell window** and run:
```powershell
.\deploy-biometric.ps1
```

This will:
- ✅ Deploy Firestore indexes
- ✅ Register your X2008 device
- ✅ Enroll admin user  (Template ID: 1)
- ✅ Test the integration
- ✅ Verify attendance recording

---

## 🎯 Quick Test

After deployment, test with a real fingerprint punch:

1. **Go to X2008 device**
2. **Place enrolled finger** on scanner
3. **Wait for beep**
4. **Check results**:
   ```powershell
   node check-attendance.js
   ```

---

## 📱 X2008 Device Configuration

Your device should already be configured with:

| Setting | Value |
|---------|-------|
| **Server Mode** | ADMS |
| **Server Address** | 192.168.60.74 |
| **Server Port** | 3000 |
| **Proxy** | Off |
| **Domain Name** | Disabled |

---

## 👤 User Enrollment

### Enroll More Users

To enroll additional users (teachers, staff):

```powershell
# First, add user to X2008 device:
# Device Menu → User Management → New User → Enter ID (e.g., 2) → Scan finger

# Then enroll in system:
$enrollBody = @{
    templateId = "2"  # Match the ID from X2008 device
    deviceIds = @("CUB7250700545")
} | ConvertTo-Json

Invoke-RestMethod `
    -Uri "http://localhost:3000/api/biometric/users/teacher@gmcpnalanda.com/enroll" `
    -Method PUT `
    -Body $enrollBody `
    -ContentType "application/json"
```

**IMPORTANT:** The `templateId` MUST match the User ID in the X2008 device!

---

## 📊 View Attendance Data

### Method 1: Command Line
```powershell
node check-attendance.js
```

### Method 2: API
```powershell
# Today's attendance
Invoke-RestMethod "http://localhost:3000/api/biometric/reports/daily"

# Specific user's attendance
Invoke-RestMethod "http://localhost:3000/api/biometric/attendance/admin@gmcpnalanda.com?limit=10"

# All registered devices
Invoke-RestMethod "http://localhost:3000/api/biometric/devices"
```

### Method 3: Admin Portal
Open: `http://localhost:3000/admin` (needs frontend implementation)

---

## 🔧 Troubleshooting

### Problem: "ERROR:No valid records"

**Solution:** Restart the server. The text/plain parser must load before JSON parser.

```powershell
# Stop server (Ctrl+C), then:
npm start
```

---

### Problem: "User not found for template ID: X"

**Solution:** The template ID doesn't match. Re-enroll the user:

```powershell
# Check what template ID the device sent (look at server logs)
# Then enroll with correct ID:
$enrollBody = @{
    templateId = "X"  # Use the ID from server logs
    deviceIds = @("CUB7250700545")
} | ConvertTo-Json

Invoke-RestMethod `
    -Uri "http://localhost:3000/api/biometric/users/USER_EMAIL/enroll" `
    -Method PUT `
    -Body $enrollBody `
    -ContentType "application/json"
```

---

### Problem: Device not sending data

**Checklist:**
1. ✅ Server is running (`npm start`)
2. ✅ Device and laptop on same network
3. ✅ Server address in device matches laptop IP
4. ✅ Port 3000 is not blocked by firewall

**Test connectivity:**
```powershell
# Allow Node.js through firewall:
netsh advfirewall firewall add rule name="Node.js Port 3000" dir=in action=allow protocol=TCP localport=3000

# Verify device can reach server:
curl http://192.168.60.74:3000/api/health
```

---

### Problem: Firestore index errors

**Solution:** Deploy indexes:

```powershell
firebase deploy --only firestore:indexes
```

Or click the link in the error message to create the index manually.

---

## 📖 How It Works

### Data Flow

```
👤 Employee punches finger
         ↓
🔴 X2008 matches fingerprint → User ID (e.g., "1")
         ↓
📡 Device sends to: POST /api/biometric/iclock/cdata
   Format: PUNCH\t1\t2025-12-19 19:00:00\t0\t1\t0
         ↓
💻 Server receives data
         ↓
🔍 Server finds user with biometricData.templateId = "1"
         ↓
📊 Server determines IN/OUT based on last punch
         ↓
💾 Server saves to Firestore (attendance collection)
         ↓
📈 Server updates daily summary
         ↓
✅ Response sent to device: "OK"
         ↓
👨‍💼 Admin sees attendance in portal
```

### Attendance Logic

- **First punch of day** = IN
- **Second punch** = OUT  
- **Third punch** = IN (cycle continues)
- **Duplicate prevention**: Ignores punches within 5 minutes
- **Status calculation**:
  - IN before 9:00 AM = PRESENT
  - IN after 9:00 AM = LATE
  - OUT before 4:00 PM = EARLY_OUT

---

## 🗄️ Database Structure

### attendance Collection
```javascript
{
  id: "auto-generated",
  userId: "admin@gmcpnalanda.com",
  employeeId: "ADM001",
  biometricData: {
    templateId: "1",
    deviceId: "CUB7250700545",
    deviceLocation: "Main Entrance",
    verificationMethod: "fingerprint",
    confidence: 95
  },
  attendance: {
    date: "2025-12-19",
    timestamp: Timestamp,
    type: "IN",  // or "OUT"
    status: "PRESENT",  // or "LATE", "EARLY_OUT"
    location: "Main Entrance"
  },
  metadata: {
    ipAddress: "192.168.60.74",
    rawData: "{ ... }",
    processed: true
  },
  createdAt: Timestamp
}
```

---

## 🚀 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/biometric/iclock/cdata` | Device punch data (X2008) |
| GET | `/api/biometric/iclock/getrequest` | Device polling |
| POST | `/api/biometric/devices` | Register device |
| PUT | `/api/biometric/users/:userId/enroll` | Enroll user |
| GET | `/api/biometric/attendance/:userId` | Get user attendance |
| GET | `/api/biometric/reports/daily` | Daily report |
| GET | `/api/biometric/devices` | List devices |

---

## ✅ Verification Checklist

After setup, verify everything is working:

- [ ] Server starts without errors
- [ ] Device registration successful
- [ ] Admin user enrolled
- [ ] Test punch returns "OK"
- [ ] Attendance record appears in Firestore
- [ ] `check-attendance.js` shows record
- [ ] Real finger punch is detected
- [ ] Server logs show attendance processing
- [ ] IN/OUT toggle works correctly

---

## 📞 Support Commands

```powershell
# Check server health
Invoke-RestMethod http://localhost:3000/api/health

# View all attendance records
node check-attendance.js

# Test a simulated punch
node quick-test.js

# Deploy everything
.\deploy-biometric.ps1
```

---

## 🎉 Success Indicators

You know it's working when:

1. ✅ Server logs show: `✅ Attendance recorded: [Name] - IN/OUT at [time]`
2. ✅ Device beeps after fingerprint
3. ✅ `check-attendance.js` shows the record
4. ✅ Firestore console shows new documents in `attendance` collection
5. ✅ Each subsequent punch toggles IN/OUT correctly

---

**Last Updated:** 2025-12-19  
**Device Model:** X2008  
**Protocol:** ADMS  
**Firestore Project:** admission-form-2025

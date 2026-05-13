# X2008 Biometric Device Setup Guide

## ✅ Configuration Review

### Your Current X2008 Device Settings
```
Device Model: X2008
Server Mode: ADMS ✅
Domain Name: Disabled ✅
Server Address: 192.168.60.74 (Your laptop IP) ✅
Server Port: 3000 (Node.js port) ✅
Proxy: Off ✅
```

**Status**: ✅ Configuration looks correct!

## 📡 How It Works

When someone punches on the X2008 device:
1. Device sends data to: `http://192.168.60.74:3000/api/biometric/iclock/cdata`
2. Your Node.js server receives the punch data
3. Server matches user by template ID
4. Determines IN/OUT based on last punch
5. Saves to Firestore database
6. Updates daily attendance summary
7. ✨ **Immediately visible in admin portal!**

## 🔧 Code Changes Made

### 1. server.js
**Fixed**:
- ✅ Removed duplicate code (lines 27-28, 30-32, 125-126)
- ✅ Cleaned up middleware declarations
- ✅ Biometric routes properly registered at `/api/biometric/*`

### 2. biometric.js
**Added**:
- ✅ `/api/biometric/iclock/cdata` (POST) - Main attendance endpoint
- ✅ `/api/biometric/iclock/getrequest` (GET) - Device polling endpoint
- ✅ ADMS protocol parser for X2008 format
- ✅ Real-time attendance processing
- ✅ Automatic IN/OUT detection
- ✅ Duplicate punch prevention (5-minute window)

## 🎯 API Endpoints

### X2008 Device Endpoints (ADMS Protocol)
```
POST http://192.168.60.74:3000/api/biometric/iclock/cdata
GET  http://192.168.60.74:3000/api/biometric/iclock/getrequest
```

### Admin Portal Endpoints
```
GET  /api/biometric/attendance/:userId - View user attendance
GET  /api/biometric/reports/daily - Daily attendance report
PUT  /api/biometric/users/:userId/enroll - Enroll user biometric
POST /api/biometric/devices - Register device
```

## 🚀 Testing Steps

### Step 1: Start Your Server
```bash
cd backend
npm start
```

**Expected Output**:
```
📄 Loading Firebase credentials from file
✅ Firebase Admin SDK initialized successfully
🚀 GMCP LMS Unified Portal running on port 3000
```

### Step 2: Register the X2008 Device
Open your browser or use curl:

```bash
curl -X POST http://localhost:3000/api/biometric/devices \
  -H "Content-Type: application/json" \
  -d '{
    "deviceInfo": {
      "deviceId": "X2008",
      "model": "X2008",
      "manufacturer": "eSSL",
      "serialNumber": "X2008-001"
    },
    "networkInfo": {
      "ipAddress": "192.168.60.74",
      "port": 3000
    },
    "location": {
      "name": "Main Entrance",
      "building": "Main Building",
      "floor": "Ground Floor"
    }
  }'
```

### Step 3: Enroll a User for Biometric

**Important**: The `templateId` must match what's stored in the X2008 device for that user.

```bash
curl -X PUT http://localhost:3000/api/biometric/users/admin@gmcpnalanda.com/enroll \
  -H "Content-Type: application/json" \
  -d '{
    "templateId": "1",
    "deviceIds": ["X2008"]
  }'
```

**Replace**:
- `admin@gmcpnalanda.com` with the actual user email
- `"1"` with the user ID stored in X2008 device

### Step 4: Test Punch from Device

**Option A**: Actual punch on X2008
- Have someone punch their fingerprint on the device
- Check server console logs

**Option B**: Simulate punch (testing)
```bash
curl -X POST http://localhost:3000/api/biometric/iclock/cdata \
  -H "Content-Type: text/plain" \
  -H "SN: X2008" \
  -d "PUNCH	1	2025-12-19 18:30:00	0	1	0"
```

**Expected Server Logs**:
```
🔄 POST /api/biometric/iclock/cdata
🟢 X2008 Device Data Received
📊 Parsed 1 attendance records
✅ Attendance recorded: Admin Name - IN at 18:30:00
📤 Sending response to device: OK
```

### Step 5: Verify in Admin Portal

1. Login to admin portal: `http://localhost:3000`
2. Navigate to **Attendance** or **Reports** section
3. You should see the punch record immediately!

Or check via API:
```bash
curl http://localhost:3000/api/biometric/reports/daily?date=2025-12-19
```

## 🔍 Troubleshooting

### Issue 1: Device Not Connecting
**Check**:
- ✅ Both device and laptop on same network (192.168.60.x)
- ✅ Firewall not blocking port 3000
- ✅ Server is running
- ✅ Device IP configured correctly

**Test connectivity**:
```bash
# On your laptop
ipconfig  # Confirm IP is 192.168.60.74

# From device web interface, test connection
curl http://192.168.60.74:3000/api/health
```

### Issue 2: "User not found" Error
**Reason**: User not enrolled or template ID mismatch

**Solution**:
1. Check template ID in X2008 device
2. Enroll user with correct template ID
3. Verify enrollment:
```bash
curl http://localhost:3000/api/biometric/users/user@email.com
```

### Issue 3: No Data Showing in Portal
**Check**:
1. Server logs for errors
2. Firestore database has data:
   - Go to Firebase Console
   - Check `attendance` collection
3. User has correct permissions

### Issue 4: Duplicate Punches
**Normal behavior**: System ignores punches within 5 minutes of last punch

**To adjust**: Edit `biometric.js` line 397:
```javascript
const duplicateCheckWindow = 300; // Change to different seconds
```

## 📊 Data Format

### X2008 ADMS Protocol Format
```
PUNCH	<UserID>	<DateTime>	<PunchState>	<VerifyType>	<WorkCode>
```

**Example**:
```
PUNCH	1	2025-12-19 18:30:00	0	1	0
```

**Fields**:
- `PUNCH` - Record type
- `1` - User ID (template ID)
- `2025-12-19 18:30:00` - Timestamp
- `0` - Punch state (0=normal)
- `1` - Verify type (1=fingerprint, 15=face)
- `0` - Work code

### Saved in Firestore
```javascript
{
  userId: "admin@gmcpnalanda.com",
  employeeId: "EMP001",
  biometricData: {
    templateId: "1",
    deviceId: "X2008",
    deviceLocation: "Main Entrance",
    verificationMethod: "fingerprint"
  },
  attendance: {
    date: "2025-12-19",
    timestamp: Timestamp,
    type: "IN",  // or "OUT"
    status: "PRESENT",  // or "LATE"
    location: "Main Entrance"
  }
}
```

## 🔐 Security Notes

1. **Network Security**: Device and server on same network
2. **No Authentication**: Currently accepts all requests from device
3. **Production**: Add webhook secret in `.env`:
```env
ESSL_WEBHOOK_SECRET=your-strong-random-secret
```

## 📝 Device Configuration Checklist

On X2008 device web interface:

- [x] Server Mode: ADMS
- [x] Server Address: 192.168.60.74
- [x] Server Port: 3000
- [x] Push Interval: Real-time or 5 minutes
- [x] Attendance Upload: Enabled
- [ ] Test Connection: Click "Test" button
- [ ] Save Settings
- [ ] Restart Device

## 🎉 Success Indicators

You'll know it's working when you see:

**In Server Console**:
```
🟢 X2008 Device Data Received
✅ Attendance recorded: John Doe - IN at 09:00:00
```

**In Admin Portal**:
- Attendance record appears immediately
- Shows correct timestamp
- Shows IN/OUT correctly
- User name displayed

**In Firebase Console**:
- New document in `attendance` collection
- New/updated document in `attendance_summary` collection

## 🚨 Common Mistakes

1. ❌ **Wrong endpoint**: Device sending to `/attendance/push` instead of `/iclock/cdata`
   - ✅ **Fix**: Use `/api/biometric/iclock/cdata`

2. ❌ **Template ID mismatch**: User enrolled with ID "1" but device has "001"
   - ✅ **Fix**: Match exactly - use same ID

3. ❌ **Laptop IP changed**: DHCP assigned new IP
   - ✅ **Fix**: Set static IP or update device config

4. ❌ **Port already in use**: Another app using port 3000
   - ✅ **Fix**: Stop other app or change port

## 📞 Support

If issues persist, check:
1. Server logs: `backend/` terminal window
2. Device logs: X2008 web interface → System Log
3. Firebase Console: Check if data is being saved
4. Network: Ping test between device and laptop

---

## ✅ Summary

**Your setup is correct!** The code is now properly configured for X2008 ADMS mode.

**Next Steps**:
1. Start server: `npm start`
2. Register device (POST to /devices)
3. Enroll users (PUT to /users/:id/enroll)
4. Test punch on device
5. Check admin portal

**The attendance will immediately reflect in your LMS admin portal!** 🎉

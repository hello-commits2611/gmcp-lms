# X2008 Biometric Device Setup Guide

## ✅ Device Overview

**Model**: eSSL X2008  
**Serial Number**: CUB7250700545  
**Location**: Main Entrance, Main Building, Ground Floor  
**Protocol**: ADMS (Attendance Data Management System)

---

## 🔧 Device Configuration

Configure these settings on your X2008 device (via device menu or web interface):

| Setting | Value |
|---------|-------|
| **Server Mode** | ADMS |
| **Server Address** | 192.168.60.74 (your local IP) |
| **Server Port** | 3000 |
| **Proxy** | Off |
| **Domain Name** | Disabled |

### How to Configure Device

1. **Access Device Menu**:
   - Press `MENU` button on device
   - Enter admin password
   - Navigate to: `Comm. → TCP/IP`

2. **Set Network Settings**:
   - IP Address: Auto (DHCP) or static IP on your network
   - Gateway: Your router IP
   - DNS: 8.8.8.8

3. **Configure Server Push**:
   - Navigate to: `Comm. → Cloud Server`
   - Server Mode: **ADMS**
   - Server Address: **192.168.60.74** (replace with your server IP)
   - Server Port: **3000**
   - Proxy: **Off**
   - Domain Name: **Disabled**

4. **Save and Exit**:
   - Press `OK` to save
   - Device will automatically connect to server

---

## 📡 How It Works

```
👆 User punches finger on X2008
         ↓
🔴 Device matches fingerprint → Gets User ID (e.g., "1")
         ↓
📡 Device sends to: POST http://192.168.60.74:3000/api/biometric/iclock/cdata
   Format: PUNCH\t1\t2025-02-25 09:15:00\t0\t1\t0
         ↓
💻 Server receives data
         ↓
🔍 Server finds user with biometricData.templateId = "1"
         ↓
📊 Server determines IN/OUT based on last punch
         ↓
💾 Server saves to Firestore (attendance collection)
         ↓
✅ Response sent to device: "OK"
         ↓
👨‍💼 Admin sees attendance in portal immediately
```

---

## 🚀 Setup Steps (After Deployment)

### Step 1: Register Device in Firestore

After deploying your LMS to Render, run this command:

```bash
node scripts/register-x2008-device.js
```

This will:
- ✅ Register the X2008 device in Firestore
- ✅ Set up device configuration
- ✅ Enable device status tracking

### Step 2: Enroll Users

To enable biometric attendance for a user, you need to:

1. **Add user to X2008 device physically**:
   - Go to device: `Menu → User Management → New User`
   - Enter User ID (e.g., 1, 2, 3, etc.)
   - Scan fingerprint 3-5 times
   - Save

2. **Enroll user in LMS system**:
   ```bash
   curl -X PUT https://lms.gmcpnalanda.com/api/biometric/users/USER_EMAIL/enroll \
     -H "Content-Type: application/json" \
     -d '{
       "templateId": "1",
       "deviceIds": ["CUB7250700545"]
     }'
   ```

   **Replace**:
   - `USER_EMAIL` with actual user email (e.g., admin@gmcpnalanda.com)
   - `"1"` with the User ID you entered in the X2008 device

**CRITICAL**: The `templateId` in the API call MUST match the User ID in the X2008 device!

### Step 3: Test Device Connection

1. **Check server is running**:
   ```bash
   curl https://lms.gmcpnalanda.com/api/health
   ```

2. **Test biometric punch**:
   - Have an enrolled user punch their finger on X2008
   - Check server logs for success message
   - Verify attendance in admin portal

3. **View attendance records**:
   ```bash
   curl https://lms.gmcpnalanda.com/api/biometric/attendance/USER_EMAIL?limit=10
   ```

---

## 🎯 Admin Portal Access

After setup, the biometric system will be visible in the admin portal:

1. **Login to Admin Portal**: https://lms.gmcpnalanda.com
2. **Navigate to**: `👆 Biometric Attendance` (in left sidebar)
3. **Available tabs**:
   - **📱 Devices**: View all registered biometric devices
   - **✋ Enrollment Status**: See which users are enrolled
   - **📊 Attendance Log**: View daily attendance records
   - **📈 Reports**: Generate attendance reports

---

## 🔍 Troubleshooting

### Problem 1: Device Not Connecting

**Symptoms**: No data appearing in admin portal after punch

**Solutions**:
1. ✅ Verify both device and server are on same network
2. ✅ Check device can reach server:
   - From device web interface, test connection to server IP
3. ✅ Verify firewall allows port 3000:
   ```bash
   # On server (Render automatically handles this)
   netstat -an | grep 3000
   ```
4. ✅ Check device configuration matches server IP

### Problem 2: "User not found" Error

**Symptoms**: Server logs show "User not found for template ID: X"

**Solutions**:
1. Check what template ID the device is sending (see server logs)
2. Re-enroll user with correct template ID:
   ```bash
   curl -X PUT https://lms.gmcpnalanda.com/api/biometric/users/USER_EMAIL/enroll \
     -H "Content-Type: application/json" \
     -d '{"templateId": "X", "deviceIds": ["CUB7250700545"]}'
   ```
3. Verify enrollment:
   ```bash
   curl https://lms.gmcpnalanda.com/api/biometric/users/USER_EMAIL
   ```

### Problem 3: Duplicate Punches

**Normal Behavior**: System ignores punches within 5 minutes of last punch

**To adjust**: Edit the `duplicateCheckWindow` in device configuration (default: 300 seconds)

### Problem 4: Device Not Showing in Admin Portal

**Solutions**:
1. Run device registration script:
   ```bash
   node scripts/register-x2008-device.js
   ```
2. Verify device exists in Firestore:
   - Go to Firebase Console
   - Navigate to Firestore Database
   - Check `biometric_devices` collection
3. Refresh admin portal page

---

## 📊 API Endpoints

### X2008 Device Endpoints (ADMS Protocol)
```
POST /api/biometric/iclock/cdata    - Receive attendance punches
GET  /api/biometric/iclock/getrequest - Device polling endpoint
```

### Admin Portal Endpoints
```
GET  /api/biometric/devices                    - List all devices
GET  /api/biometric/attendance/:userId         - Get user attendance
GET  /api/biometric/reports/daily?date=YYYY-MM-DD - Daily report
PUT  /api/biometric/users/:userId/enroll       - Enroll user
POST /api/biometric/devices                    - Register device
```

---

## 📝 Data Format

### ADMS Protocol (X2008 → Server)
```
PUNCH\t<templateId>\t<timestamp>\t<status>\t<verifyType>\t<workCode>

Example:
PUNCH\t1\t2025-02-25 09:15:00\t0\t1\t0
```

**Fields**:
- `templateId`: User ID in device (e.g., 1, 2, 3)
- `timestamp`: Punch time (YYYY-MM-DD HH:mm:ss)
- `status`: 0 = success
- `verifyType`: 1 = fingerprint
- `workCode`: 0 = normal punch

### Firestore Attendance Record
```json
{
  "userId": "admin@gmcpnalanda.com",
  "biometricData": {
    "templateId": "1",
    "deviceId": "CUB7250700545",
    "deviceLocation": "Main Entrance",
    "verificationMethod": "fingerprint",
    "confidence": 95
  },
  "attendance": {
    "date": "2025-02-25",
    "timestamp": "2025-02-25T09:15:00.000Z",
    "type": "IN",
    "status": "PRESENT",
    "location": "Main Entrance"
  }
}
```

---

## 🔐 Security Notes

1. **Network Security**: X2008 device should be on same local network as server
2. **Firestore Rules**: Ensure proper authentication rules for biometric data
3. **Template IDs**: Keep template ID mapping secure (user email ↔ device user ID)
4. **Device Access**: Restrict physical access to device admin menu

---

## 📞 Support

For technical issues:
1. Check server logs: Render Dashboard → Logs
2. Check Firestore data: Firebase Console → Firestore Database
3. Review device logs: X2008 Menu → System → Logs
4. Test API endpoints with curl commands above

---

## 📚 Additional Resources

- **X2008 Manual**: [eSSL Official Documentation](https://www.essl.in)
- **ADMS Protocol**: See X2008_SETUP_GUIDE.md for detailed protocol info
- **Firebase Console**: https://console.firebase.google.com
- **Render Dashboard**: https://dashboard.render.com

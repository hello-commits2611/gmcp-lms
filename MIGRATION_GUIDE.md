# GMCP LMS Firebase Migration & Biometric Integration Guide

## Overview

This guide covers the complete migration process from JSON-based storage to Firebase Firestore and the integration of eSSL X990 biometric attendance devices.

## Prerequisites

- Node.js v14 or higher
- Firebase project with Firestore and Storage enabled
- eSSL X990 biometric device(s)
- Access to Firebase Admin SDK service account credentials

## Phase 1: Environment Setup

### 1.1 Install Dependencies

```bash
npm install moment-timezone
```

### 1.2 Configure Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required environment variables:
- `FIREBASE_SERVICE_ACCOUNT`: Your Firebase service account JSON
- `FIREBASE_STORAGE_BUCKET`: Your Firebase storage bucket URL
- `ESSL_WEBHOOK_SECRET`: Secret for verifying device webhooks
- `ATTENDANCE_TIMEZONE`: Timezone for attendance (e.g., Asia/Kolkata)

### 1.3 Firebase Console Setup

1. Go to Firebase Console → Project Settings → Service Accounts
2. Generate new private key
3. Copy the JSON content to `FIREBASE_SERVICE_ACCOUNT` environment variable
4. Enable Firestore Database
5. Enable Firebase Storage

## Phase 2: Data Migration

### 2.1 Backup Existing Data

The migration script automatically backs up all JSON files before migration:

```bash
node scripts/migrate-to-firestore.js
```

This will:
- Create timestamped backup in `backend/data-backup/`
- Migrate all collections to Firestore
- Preserve existing data structure

### 2.2 Manual Backup (Optional)

```bash
# Create manual backup
mkdir -p data-backup/manual-$(date +%Y%m%d)
cp data/*.json data-backup/manual-$(date +%Y%m%d)/
```

### 2.3 Verify Migration

After migration, verify data in Firebase Console:

1. Navigate to Firestore Database
2. Check collections: `users`, `profiles`, `hostel`, `requests`, `documents`
3. Verify document counts match original JSON files

## Phase 3: Deploy Security Rules

### 3.1 Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

Or manually copy `firestore.rules` to Firebase Console → Firestore → Rules tab

### 3.2 Deploy Storage Rules

```bash
firebase deploy --only storage:rules
```

Or manually copy `storage.rules` to Firebase Console → Storage → Rules tab

## Phase 4: Deploy Firestore Indexes

### 4.1 Automatic Index Deployment

```bash
firebase deploy --only firestore:indexes
```

### 4.2 Manual Index Creation

If automatic deployment isn't available:

1. Go to Firebase Console → Firestore → Indexes
2. Create composite indexes as specified in `firestore.indexes.json`
3. Wait for indexes to build (can take several minutes)

Required indexes:
- `attendance`: (userId, attendance.date)
- `attendance`: (userId, attendance.timestamp)
- `attendance_summary`: (userId, period.type, period.date)
- `users`: (role, status, createdAt)
- `requests`: (studentInfo.studentEmail, submittedAt)

## Phase 5: Update Backend Routes

### 5.1 Register Biometric Routes

Update `backend/server.js` to include biometric routes:

```javascript
const biometricRoutes = require('./routes/biometric');

// Add after existing routes
app.use('/api/biometric', biometricRoutes);
```

### 5.2 Test API Endpoints

Start the server:

```bash
npm start
```

Test biometric endpoints:

```bash
# Health check
curl http://localhost:3000/api/biometric/devices

# Register device (requires admin auth)
curl -X POST http://localhost:3000/api/biometric/devices \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "deviceInfo": {
      "deviceId": "eSSL-X990-001",
      "model": "X990",
      "manufacturer": "eSSL",
      "serialNumber": "SN123456",
      "firmwareVersion": "1.0.0"
    },
    "networkInfo": {
      "ipAddress": "192.168.1.100",
      "port": 4370,
      "macAddress": "AA:BB:CC:DD:EE:FF"
    },
    "location": {
      "name": "Main Gate",
      "building": "Main Building",
      "floor": "Ground Floor"
    }
  }'
```

## Phase 6: Biometric Device Configuration

### 6.1 Configure eSSL X990 Device

1. Access device admin panel (usually at device IP address)
2. Set Push URL to your backend:
   ```
   https://your-domain.com/api/biometric/attendance/push
   ```

3. Configure authentication headers:
   ```
   X-Webhook-Secret: YOUR_WEBHOOK_SECRET
   ```

4. Set push interval (recommended: real-time or every 5 minutes)

### 6.2 Device Data Format

The device should send data in this format:

**Real-time Push:**
```json
{
  "templateId": "user-biometric-template-id",
  "deviceId": "eSSL-X990-001",
  "timestamp": "2024-12-15T10:30:00Z",
  "verificationMethod": "fingerprint",
  "confidence": 95.5
}
```

**Batch Push:**
```json
{
  "deviceId": "eSSL-X990-001",
  "records": [
    {
      "templateId": "template-1",
      "timestamp": "2024-12-15T10:30:00Z",
      "verificationMethod": "fingerprint",
      "confidence": 95.5
    },
    {
      "templateId": "template-2",
      "timestamp": "2024-12-15T10:31:00Z",
      "verificationMethod": "face",
      "confidence": 92.0
    }
  ]
}
```

### 6.3 Enroll Users for Biometric

Enroll users via API:

```bash
curl -X PUT http://localhost:3000/api/biometric/users/{userId}/enroll \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT" \
  -d '{
    "templateId": "biometric-template-id-from-device",
    "deviceIds": ["eSSL-X990-001"]
  }'
```

## Phase 7: Testing Attendance System

### 7.1 Test Attendance Recording

1. Enroll a test user's fingerprint on the device
2. Record attendance on device
3. Verify in Firestore:
   - Check `attendance` collection for new record
   - Check `attendance_summary` collection for daily summary

### 7.2 Test Attendance Queries

Get user attendance:
```bash
curl http://localhost:3000/api/biometric/attendance/{userId}?startDate=2024-12-01&endDate=2024-12-31 \
  -H "Authorization: Bearer YOUR_JWT"
```

Get attendance summary:
```bash
curl http://localhost:3000/api/biometric/attendance/summary/{userId}?type=daily&month=2024-12 \
  -H "Authorization: Bearer YOUR_JWT"
```

Get daily report:
```bash
curl http://localhost:3000/api/biometric/reports/daily?date=2024-12-15 \
  -H "Authorization: Bearer YOUR_ADMIN_JWT"
```

## Phase 8: Production Deployment

### 8.1 Render Configuration

Create `render.yaml` in project root:

```yaml
services:
  - type: web
    name: gmcp-lms-backend
    env: node
    region: singapore
    plan: starter
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
      - key: JWT_SECRET
        sync: false
      - key: FIREBASE_SERVICE_ACCOUNT
        sync: false
      - key: FIREBASE_STORAGE_BUCKET
        sync: false
      - key: ESSL_WEBHOOK_SECRET
        sync: false
      - key: ATTENDANCE_TIMEZONE
        value: Asia/Kolkata
```

### 8.2 Set Environment Variables on Render

1. Go to Render Dashboard → Your Service → Environment
2. Add all required environment variables from `.env`
3. Deploy the service

### 8.3 Update Device Webhook URL

Update eSSL device to use production URL:
```
https://your-render-app.onrender.com/api/biometric/attendance/push
```

## Phase 9: Monitoring & Maintenance

### 9.1 Monitor Firestore Usage

- Go to Firebase Console → Firestore → Usage tab
- Monitor:
  - Read/Write operations
  - Storage size
  - Index usage

### 9.2 Monitor Attendance Records

Check for:
- Duplicate records (should be filtered automatically)
- Missing IN/OUT pairs
- Device connectivity issues

### 9.3 Regular Backups

Set up automated backups:

```bash
# Add to cron or use Render cron jobs
0 2 * * * node scripts/backup-firestore.js
```

## Troubleshooting

### Issue: Migration Failed

**Solution:**
1. Check Firebase credentials in `.env`
2. Verify Firestore is enabled in Firebase Console
3. Check migration script logs for specific errors
4. Restore from backup if needed

### Issue: Biometric Device Not Pushing Data

**Solution:**
1. Verify device network connectivity
2. Check webhook URL configuration
3. Verify webhook secret matches
4. Check device logs for push errors
5. Test with curl to ensure endpoint is accessible

### Issue: Duplicate Attendance Records

**Solution:**
- Adjust `duplicateCheckWindow` in device configuration
- Default is 300 seconds (5 minutes)
- Increase if users tap multiple times

### Issue: Firestore Query Too Slow

**Solution:**
1. Check if required indexes are built
2. Deploy missing indexes from `firestore.indexes.json`
3. Wait for indexes to finish building

### Issue: Security Rules Blocking Requests

**Solution:**
1. Check JWT token includes correct role claim
2. Verify security rules in Firebase Console
3. Check request.auth.token in Firestore rules simulator

## API Endpoints Reference

### Biometric Attendance

- `POST /api/biometric/attendance/push` - Batch attendance push from device
- `POST /api/biometric/attendance/realtime` - Single attendance record
- `GET /api/biometric/attendance/:userId` - Get user attendance records
- `GET /api/biometric/attendance/summary/:userId` - Get attendance summary

### Device Management

- `POST /api/biometric/devices` - Register new device
- `GET /api/biometric/devices` - List all devices
- `GET /api/biometric/devices/:deviceId` - Get device details
- `POST /api/biometric/devices/:deviceId/heartbeat` - Device heartbeat

### User Enrollment

- `PUT /api/biometric/users/:userId/enroll` - Enroll user for biometric

### Reports

- `GET /api/biometric/reports/daily` - Get daily attendance report

## Performance Optimization Tips

1. **Index Optimization**: Ensure all composite indexes are deployed
2. **Caching**: Enable Firestore offline persistence
3. **Batch Operations**: Use batch writes for multiple records
4. **Query Limits**: Always use pagination for large result sets
5. **Device Heartbeat**: Configure reasonable heartbeat intervals (5-10 minutes)

## Security Best Practices

1. **Webhook Secret**: Use strong, random webhook secret
2. **JWT Tokens**: Set reasonable expiration times
3. **HTTPS Only**: Always use HTTPS in production
4. **Role-Based Access**: Enforce security rules strictly
5. **Device Authentication**: Implement device-level authentication
6. **Rate Limiting**: Enable rate limiting on public endpoints

## Next Steps

After successful migration:

1. ✅ Migrate existing routes to use FirestoreDAO
2. ✅ Implement attendance frontend UI
3. ✅ Add attendance reports and analytics
4. ✅ Integrate with payroll systems (if needed)
5. ✅ Set up monitoring and alerts
6. ✅ Train staff on new attendance system

## Support

For issues or questions:
- Check Firebase Console logs
- Review Render deployment logs
- Check device admin panel logs
- Review this migration guide

## Rollback Plan

If migration needs to be rolled back:

1. Stop the server
2. Restore JSON files from backup:
   ```bash
   cp data-backup/backup-TIMESTAMP/* data/
   ```
3. Revert code changes to use JSON files
4. Restart server

**Note:** Keep backups for at least 30 days before deleting.

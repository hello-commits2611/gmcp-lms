# Quick Action API Documentation

This document describes the API endpoints for the Quick Action feature that allows students to submit "Leave Hostel" and "Outing" requests, with admin approval workflow.

## Overview

The Quick Action feature provides:
1. **Leave Hostel**: For absences longer than 24 hours
2. **Outing**: For short outings of a few hours with specified return time
3. **Admin Notification System**: Automatic notifications to admin when requests are submitted
4. **Admin Approval Workflow**: Admin can approve or decline requests with remarks
5. **File Upload Support**: PDF documents can be uploaded as supporting evidence

## Student Endpoints

### 1. Submit Leave Hostel Request
```
POST /api/hostel/quick-action/leave-hostel
Content-Type: multipart/form-data
```

**Form Fields:**
- `email` (required): Student email
- `leaveType` (required): Type of leave (dropdown selection)
- `leaveStartDate` (required): Start date of leave (YYYY-MM-DD)
- `leaveEndDate` (required): End date of leave (YYYY-MM-DD)
- `purposeOfLeave` (required): Reason for leave (textarea)
- `placeOfVisit` (required): Destination/place of visit
- `dateOfLeaving`: Actual departure date (defaults to leaveStartDate)
- `timeOfLeaving`: Departure time in 24Hrs format (HH:MM:SS)
- `arrivalDate`: Expected return date (defaults to leaveEndDate)
- `arrivalTime`: Expected return time in 24Hrs format (HH:MM:SS)
- `contactNoDuringLeave`: Contact number during leave period
- `supportingDocument`: PDF file upload (optional, max 5MB)

**Response:**
```json
{
  "success": true,
  "message": "Leave hostel request submitted successfully",
  "requestId": "REQ-1703123456789-ABC123XYZ",
  "request": {
    "id": "REQ-1703123456789-ABC123XYZ",
    "type": "leave_hostel",
    "studentEmail": "student@example.com",
    "studentName": "John Doe",
    "status": "pending",
    // ... other fields
  }
}
```

### 2. Submit Outing Request
```
POST /api/hostel/quick-action/outing
Content-Type: multipart/form-data
```

**Form Fields:**
- `email` (required): Student email
- `outingDate` (required): Date of outing (YYYY-MM-DD)
- `outingStartTime` (required): Start time (HH:MM:SS)
- `outingEndTime` (required): End time (HH:MM:SS)
- `purposeOfOuting` (required): Purpose of outing
- `placeOfVisit` (required): Place to visit
- `contactNoDuringOuting`: Contact number during outing
- `expectedReturnTime`: Expected return time (defaults to outingEndTime)
- `supportingDocument`: PDF file upload (optional, max 5MB)

**Response:**
```json
{
  "success": true,
  "message": "Outing request submitted successfully",
  "requestId": "REQ-1703123456789-DEF456UVW",
  "request": {
    "id": "REQ-1703123456789-DEF456UVW",
    "type": "outing",
    "studentEmail": "student@example.com",
    "studentName": "John Doe",
    "status": "pending",
    // ... other fields
  }
}
```

### 3. Get My Requests
```
GET /api/hostel/my-requests?email=student@example.com
```

**Response:**
```json
{
  "success": true,
  "requests": [
    {
      "id": "REQ-1703123456789-ABC123XYZ",
      "type": "leave_hostel",
      "status": "pending",
      "submittedAt": "2023-12-21T10:30:00.000Z",
      "leaveStartDate": "2023-12-25",
      "leaveEndDate": "2023-12-30",
      "purposeOfLeave": "Going home for Christmas",
      // ... other fields
    }
  ],
  "totalCount": 1
}
```

### 4. Get Student Notifications
```
GET /api/hostel/student/notifications?email=student@example.com
```

**Response:**
```json
{
  "success": true,
  "notifications": [
    {
      "id": "NOTIF-1703123456789-abc123",
      "type": "request_approved",
      "message": "Your Leave Hostel request has been approved",
      "requestId": "REQ-1703123456789-ABC123XYZ",
      "requestType": "Leave Hostel",
      "timestamp": "2023-12-21T10:35:00.000Z",
      "read": false
    }
  ],
  "unreadCount": 1
}
```

## Admin Endpoints

### 1. Get Pending Requests
```
GET /api/hostel/admin/pending-requests
```

**Response:**
```json
{
  "success": true,
  "requests": [
    {
      "id": "REQ-1703123456789-ABC123XYZ",
      "type": "leave_hostel",
      "studentName": "John Doe",
      "studentEmail": "student@example.com",
      "roomNumber": "A-101",
      "status": "pending",
      "submittedAt": "2023-12-21T10:30:00.000Z",
      // ... all request fields
    }
  ],
  "totalCount": 1
}
```

### 2. Get All Requests (with filters)
```
GET /api/hostel/admin/all-requests?status=approved&type=outing&studentEmail=student@example.com
```

**Query Parameters:**
- `status`: pending, approved, declined
- `type`: leave_hostel, outing
- `studentEmail`: specific student's requests

### 3. Review Request (Approve/Decline)
```
POST /api/hostel/admin/review-request
Content-Type: application/json

{
  "requestId": "REQ-1703123456789-ABC123XYZ",
  "action": "approve", // or "decline"
  "adminRemarks": "Approved for family emergency",
  "reviewedBy": "Admin Name"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Request approved successfully",
  "request": {
    "id": "REQ-1703123456789-ABC123XYZ",
    "status": "approved",
    "adminRemarks": "Approved for family emergency",
    "reviewedAt": "2023-12-21T10:35:00.000Z",
    "reviewedBy": "Admin Name",
    // ... other fields
  }
}
```

### 4. Get Admin Notifications
```
GET /api/hostel/admin/notifications
```

**Response:**
```json
{
  "success": true,
  "notifications": [
    {
      "id": "NOTIF-1703123456789-abc123",
      "type": "new_request",
      "message": "New Leave Hostel request from John Doe (student@example.com)",
      "requestId": "REQ-1703123456789-ABC123XYZ",
      "requestType": "Leave Hostel",
      "timestamp": "2023-12-21T10:30:00.000Z",
      "read": false
    }
  ],
  "unreadCount": 1
}
```

## Common Endpoints

### Mark Notification as Read
```
POST /api/hostel/notifications/mark-read
Content-Type: application/json

{
  "notificationId": "NOTIF-1703123456789-abc123"
}
```

## Request Status Flow

1. **pending**: Initial status when request is submitted
2. **approved**: Admin has approved the request
3. **declined**: Admin has declined the request

## Automatic Notifications

1. When student submits a request → Admin gets notification
2. When admin approves/declines → Student gets notification

## File Upload

- Only PDF files are accepted
- Maximum file size: 5MB
- Files are stored in `/backend/uploads/supporting-documents/`
- File names are auto-generated with timestamp and random suffix

## Prerequisites

Students must have completed hostel information before submitting requests. The system checks for:
- `user.hostelInfo.isComplete` must be `true`

## Error Handling

All endpoints return appropriate HTTP status codes:
- 200: Success
- 400: Bad request (validation errors)
- 403: Forbidden (permission errors)
- 404: Not found
- 500: Server errors

Example error response:
```json
{
  "success": false,
  "error": "All required fields must be filled"
}
```

## Data Files Structure

The system uses the following JSON files:
- `/data/hostel-requests.json`: All leave and outing requests
- `/data/notifications.json`: All notifications for admin and students
- `/data/users.json`: User information with hostel data
- `/data/hostel.json`: Hostel-specific data

## Frontend Integration Notes

1. **Form UI**: Replicate the form shown in `leave hostel.png`
2. **File Upload**: Implement file selection for PDF documents
3. **Date/Time Pickers**: Use appropriate UI components for date and time fields
4. **Real-time Updates**: Consider implementing polling or WebSockets for live notification updates
5. **Status Indicators**: Show request status with visual indicators (pending, approved, declined)
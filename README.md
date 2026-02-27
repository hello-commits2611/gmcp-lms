# Role-Based LMS System - GMCP

A comprehensive Learning Management System with Firebase Authentication and role-based access control for Ganga Memorial College.

## 🎯 Overview

This system provides a secure, role-based LMS where only users with `@gmcpnalanda.com` email addresses can access the system. Users are manually created by administrators with specific roles, and each role has different levels of access and functionality.

## 🏗️ Architecture

### Authentication Flow
1. User logs in with `@gmcpnalanda.com` email
2. Firebase Authentication validates credentials
3. System fetches user profile from Firestore using UID
4. User is redirected to appropriate dashboard based on role
5. All subsequent requests are protected by Firebase Security Rules

### Database Structure

```
users/
├── {uid}/
    ├── uid: string
    ├── email: string (must end with @gmcpnalanda.com)
    ├── name: string
    ├── role: 'student' | 'teacher' | 'management' | 'admin'
    ├── active: boolean
    ├── createdAt: timestamp
    ├── updatedAt: timestamp
    ├── createdBy: string (admin uid)
    ├── studentData?: {
    │   ├── branch: string
    │   ├── year: number
    │   ├── rollNumber?: string
    │   └── semester?: number
    │   }
    ├── teacherData?: {
    │   ├── subjects: string[]
    │   ├── branches: string[]
    │   └── employeeId: string
    │   }
    └── managementData?: {
        ├── department: string
        └── permissions: string[]
        }
```

## 👥 User Roles & Permissions

### 🎓 Student
- **Access**: Own data only
- **Features**:
  - View assignments for their branch/year
  - Submit assignments
  - View their own grades and attendance
  - Update basic profile information
  - Read course materials

### 👨‍🏫 Teacher  
- **Access**: Their subjects and assigned students
- **Features**:
  - Create and manage assignments for their subjects
  - Mark attendance for their classes
  - Grade student submissions
  - View students from their assigned branches
  - Upload course materials
  - Generate attendance reports

### 🏢 Management/Admin
- **Access**: Everything (full system access)
- **Features**:
  - Create, update, and delete all users
  - Access all data and reports  
  - System configuration and settings
  - View audit logs
  - Backup and security management

## 🔐 Security Features

### Email Domain Restriction
- Only `@gmcpnalanda.com` emails allowed
- Validation on both client and server side
- Firebase Security Rules enforce domain restriction

### Role-Based Access Control
- Users can only access data appropriate to their role
- Firebase Security Rules prevent unauthorized access
- Client-side route protection based on user role

### Account Management
- All accounts manually created by admin
- No self-registration allowed
- Active/inactive status for account control

## 📁 File Structure

```
lms-system/
├── public/
│   ├── index.html                 # Main login page
│   ├── firebase-config.js         # Firebase configuration & functions
│   ├── admin-panel.html          # User management interface
│   ├── student-dashboard.html    # Student dashboard
│   ├── teacher-dashboard.html    # Teacher dashboard
│   └── management-dashboard.html # Management/Admin dashboard
├── firestore.rules               # Firebase Security Rules
└── README.md                     # This documentation
```

## 🚀 Setup Instructions

### 1. Firebase Configuration

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
2. Enable Authentication with Email/Password provider
3. Create Firestore database
4. Update `firebase-config.js` with your Firebase config:

```javascript
const firebaseConfig = {
    apiKey: "your-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
};
```

### 2. Deploy Security Rules

Copy the contents of `firestore.rules` to your Firebase project:

1. Go to Firebase Console > Firestore Database > Rules
2. Replace the default rules with the rules from `firestore.rules`
3. Publish the rules

### 3. Create Initial Admin User

Since all users must be created manually, you'll need to create an initial admin:

1. Temporarily modify the security rules to allow one-time user creation
2. Use Firebase Console to create a user with admin role
3. Restore the production security rules

### 4. Deploy the Application

Deploy the `public/` folder to your web server or hosting platform (Firebase Hosting, Netlify, etc.).

## 💻 Usage Guide

### Admin Workflow

1. **Login** with admin credentials
2. **Access Admin Panel** to manage users
3. **Create Users**:
   - Enter user details (name, email, role)
   - Add role-specific information
   - Set temporary password
   - User receives credentials and can login

### Student Workflow

1. **Login** with provided credentials
2. **Dashboard** shows:
   - Pending assignments
   - Attendance percentage
   - Current GPA
   - Recent activity
3. **Access Features**:
   - View and submit assignments
   - Check grades and attendance
   - Update profile

### Teacher Workflow

1. **Login** with teacher credentials  
2. **Dashboard** shows:
   - Assigned classes and students
   - Pending submissions to review
   - Recent activity
3. **Manage Classes**:
   - Create assignments
   - Mark attendance  
   - Grade submissions
   - Upload course materials

## 🔧 Customization

### Adding New User Roles

1. **Update USER_ROLES** in `firebase-config.js`
2. **Modify Security Rules** to include new role permissions
3. **Create Dashboard** for the new role
4. **Update Login Logic** to handle new role redirect

### Adding New Fields

1. **Update Database Structure** in user creation functions
2. **Modify Security Rules** to allow read/write of new fields
3. **Update Admin Panel** forms to collect new data
4. **Update Dashboards** to display new information

## 📊 Firebase Collections

### Core Collections
- **users**: User profiles and role data
- **assignments**: Course assignments
- **submissions**: Student assignment submissions  
- **attendance**: Attendance records
- **grades**: Student grades
- **courses**: Course information
- **notifications**: System notifications

### Security Rules Summary

- **Students**: Can only read/write their own data
- **Teachers**: Can access data for their subjects/students
- **Management/Admin**: Full system access
- **Email Validation**: Only @gmcpnalanda.com emails allowed
- **Active Users**: Only active users can access data

## 🛡️ Best Practices

### Security
- Always validate user roles on both client and server
- Use Firebase Security Rules as the primary security layer
- Implement proper input validation and sanitization
- Regular security audits and rule testing

### Performance  
- Use pagination for large data sets
- Implement proper indexing in Firestore
- Cache user data locally when appropriate
- Optimize queries with proper where clauses

### Maintenance
- Regular backup of Firestore data
- Monitor authentication and usage patterns
- Keep Firebase SDK updated
- Implement proper error logging

## 🐛 Troubleshooting

### Common Issues

1. **Login Fails with Valid Credentials**
   - Check if user exists in Firestore
   - Verify user is marked as active
   - Confirm email domain is @gmcpnalanda.com

2. **Access Denied Errors**
   - Verify Firebase Security Rules are deployed
   - Check user role in Firestore
   - Confirm user has required permissions

3. **Dashboard Not Loading**
   - Check browser console for errors
   - Verify user role matches dashboard access
   - Confirm Firebase config is correct

### Debug Mode
Enable debug logging in `firebase-config.js`:

```javascript
// Add this for debugging
console.log('User data:', userData);
console.log('User role:', userData.role);
```

## 📞 Support

For technical support or questions:
- Check this documentation first
- Review Firebase Console for authentication issues
- Examine browser console for client-side errors
- Contact system administrator for account-related issues

## 🔄 Updates & Changelog

### Version 1.0.0
- Initial release with role-based authentication
- Student, Teacher, Management, and Admin roles
- Complete Firebase integration
- Comprehensive security rules
- Admin panel for user management
- Role-specific dashboards

---

**Security Notice**: This system is designed for educational institutions. Ensure proper backup, monitoring, and security practices are in place before deploying to production.

# 🚀 Step-by-Step Setup Guide - Role-Based LMS System

Follow these exact steps to get your role-based LMS system up and running.

## 📋 Prerequisites

Before starting, make sure you have:
- A Google account (for Firebase)
- A web browser
- Text editor (VS Code recommended)
- Basic understanding of copy-paste operations

---

## 🔥 STEP 1: Create Firebase Project

### 1.1 Go to Firebase Console
1. Open your web browser
2. Go to: https://console.firebase.google.com
3. Click **"Create a project"** or **"Add project"**

### 1.2 Project Setup
1. **Project name**: Enter `gmcp-lms-system` (or any name you prefer)
2. **Google Analytics**: You can disable this for now (optional)
3. Click **"Create project"**
4. Wait for setup to complete (takes 1-2 minutes)
5. Click **"Continue"** when ready

---

## 🔑 STEP 2: Setup Firebase Authentication

### 2.1 Enable Authentication
1. In your Firebase project dashboard, click **"Authentication"** from the left menu
2. Click **"Get started"**
3. Go to the **"Sign-in method"** tab
4. Click on **"Email/Password"**
5. **Enable** the first toggle (Email/Password)
6. **Leave the second toggle disabled** (Email link sign-in)
7. Click **"Save"**

### 2.2 Configure Authentication Settings
1. Still in Authentication, go to **"Settings"** tab
2. Scroll down to **"Authorized domains"**
3. You'll see `localhost` is already there (good for testing)
4. Add your domain when you deploy live (we'll do this later)

---

## 💾 STEP 3: Setup Firestore Database

### 3.1 Create Firestore Database
1. In Firebase Console, click **"Firestore Database"** from left menu
2. Click **"Create database"**
3. **Security rules**: Select **"Start in test mode"** for now
4. **Location**: Choose your nearest location (e.g., `us-central1`)
5. Click **"Done"**

### 3.2 Deploy Security Rules
1. In Firestore, go to **"Rules"** tab
2. **DELETE ALL** existing rules
3. Copy the entire content from your `lms-system/firestore.rules` file
4. Paste it in the rules editor
5. Click **"Publish"**
6. ✅ You should see "Rules published successfully"

---

## ⚙️ STEP 4: Get Firebase Configuration

### 4.1 Get Your Firebase Config
1. In Firebase Console, click the **gear icon** (⚙️) next to "Project Overview"
2. Click **"Project settings"**
3. Scroll down to **"Your apps"** section
4. Click **"Web"** icon `</>`
5. **App nickname**: Enter `GMCP-LMS`
6. **Don't check** "Also set up Firebase Hosting"
7. Click **"Register app"**

### 4.2 Copy Configuration
You'll see a code block like this:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

**COPY THIS ENTIRE CONFIG BLOCK** - you'll need it in the next step!

---

## 💻 STEP 5: Update Your Code

### 5.1 Update Firebase Configuration
1. Open your `lms-system/public/firebase-config.js` file
2. Find this section at the top:
```javascript
const firebaseConfig = {
    // Replace with your actual Firebase config
    apiKey: "your-api-key",
    authDomain: "your-auth-domain",
    projectId: "your-project-id",
    storageBucket: "your-storage-bucket",
    messagingSenderId: "your-messaging-sender-id",
    appId: "your-app-id"
};
```
3. **REPLACE** this entire block with the config you copied from Firebase Console
4. **Save** the file

### 5.2 Verify File Structure
Make sure you have these files in your `lms-system/public/` folder:
```
public/
├── index.html
├── firebase-config.js (✅ Updated with your config)
├── admin-panel.html
├── student-dashboard.html
├── teacher-dashboard.html
└── management-dashboard.html
```

---

## 🌐 STEP 6: Test Your System Locally

### 6.1 Serve Files Locally
**Option A: Using Python (if installed)**
1. Open Command Prompt or PowerShell
2. Navigate to your `lms-system/public` folder:
   ```bash
   cd "C:\Users\Kumar Uttchrist\Desktop\github repo admission backend\gmcp-ecosystem\lms-system\public"
   ```
3. Run a local server:
   ```bash
   python -m http.server 8080
   ```
4. Open browser to: http://localhost:8080

**Option B: Using VS Code Live Server Extension**
1. Install "Live Server" extension in VS Code
2. Right-click on `index.html`
3. Select "Open with Live Server"

**Option C: Direct File Opening (may have limitations)**
1. Double-click `index.html` to open in browser

### 6.2 Test the Login Page
1. You should see the GMCP LMS login page
2. Try entering any email - you should get validation errors for non-@gmcpnalanda.com emails
3. Don't worry if login fails - you haven't created users yet!

---

## 👤 STEP 7: Create Your First Admin User

Since the system requires manual user creation, you need to create an initial admin user.

### 7.1 Temporary Rules Modification
1. Go back to Firebase Console → Firestore Database → Rules
2. **Temporarily** replace ALL rules with this simple rule:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```
3. Click **"Publish"**

### 7.2 Create Admin User in Firebase Auth
1. Go to Firebase Console → Authentication → Users
2. Click **"Add user"**
3. **Email**: `admin@gmcpnalanda.com` (or your preferred admin email)
4. **Password**: Create a secure password (remember this!)
5. Click **"Add user"**
6. **Copy the User UID** (long string like `abc123def456...`) - you'll need this!

### 7.3 Create Admin Profile in Firestore
1. Go to Firebase Console → Firestore Database
2. Click **"Start collection"**
3. **Collection ID**: `users`
4. Click **"Next"**
5. **Document ID**: Paste the User UID you copied
6. Add these fields:

| Field | Type | Value |
|-------|------|--------|
| `uid` | string | (paste the User UID) |
| `email` | string | `admin@gmcpnalanda.com` |
| `name` | string | `System Administrator` |
| `role` | string | `admin` |
| `active` | boolean | `true` |
| `createdAt` | timestamp | (click the timestamp icon and select "now") |
| `updatedAt` | timestamp | (click the timestamp icon and select "now") |
| `createdBy` | string | `system` |

7. Click **"Save"**

### 7.4 Restore Production Rules
1. Go back to Firestore → Rules
2. **Replace** the temporary rules with the original production rules from your `firestore.rules` file
3. Click **"Publish"**

---

## ✅ STEP 8: Test Your Complete System

### 8.1 Test Admin Login
1. Go to your local server (http://localhost:8080)
2. Enter:
   - **Email**: `admin@gmcpnalanda.com`
   - **Password**: (the password you set)
3. Click **"Login to Dashboard"**
4. You should be redirected to the Management Dashboard
5. ✅ **Success!** Your admin login works

### 8.2 Test Admin Panel
1. From the Management Dashboard, click **"Admin Panel"**
2. You should see the user management interface
3. Try creating a test student user:
   - **Name**: `John Doe`
   - **Email**: `john.doe@gmcpnalanda.com`
   - **Role**: `Student`
   - **Password**: `testpass123`
   - **Branch**: `CSE`
   - **Year**: `3`
4. Click **"Create User"**
5. ✅ **Success!** You can create users

### 8.3 Test Student Login
1. Open a new browser tab to http://localhost:8080
2. Login with the student credentials you just created
3. You should see the Student Dashboard
4. ✅ **Success!** Role-based redirection works

---

## 🚀 STEP 9: Deploy to Production (Optional)

### 9.1 Firebase Hosting (Recommended)
1. In Firebase Console → Hosting
2. Click **"Get started"**
3. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```
4. Login to Firebase:
   ```bash
   firebase login
   ```
5. Initialize in your project folder:
   ```bash
   cd "C:\Users\Kumar Uttchrist\Desktop\github repo admission backend\gmcp-ecosystem\lms-system"
   firebase init hosting
   ```
6. Select your Firebase project
7. **Public directory**: `public`
8. **Single-page app**: `No`
9. **Overwrite index.html**: `No`
10. Deploy:
    ```bash
    firebase deploy
    ```

### 9.2 Update Authentication Domain
1. After deployment, you'll get a URL like: `https://your-project.web.app`
2. Go to Firebase Console → Authentication → Settings → Authorized domains
3. Add your deployment URL to authorized domains

---

## 🎉 STEP 10: You're Done!

### What You Can Do Now:

1. **Access your live system** at your Firebase Hosting URL
2. **Login as admin** and create more users
3. **Test different user roles** (Student, Teacher, Management)
4. **Customize dashboards** by editing the HTML files
5. **Add more features** as needed

### Next Steps for Production:

1. **Change default passwords** for all users
2. **Add your college logo** to the login pages
3. **Customize the color scheme** to match your branding
4. **Create proper user accounts** for your staff and students
5. **Set up regular backups** of your Firestore data

---

## 🆘 Troubleshooting

### Common Issues and Solutions:

**Problem**: "Firebase not initialized" error
**Solution**: Check that your Firebase config is correct in `firebase-config.js`

**Problem**: "Permission denied" when creating users
**Solution**: Make sure you restored the production security rules after creating the admin user

**Problem**: Login page shows but login fails
**Solution**: Check browser console for errors, verify Firebase config and that the user exists in both Auth and Firestore

**Problem**: "Domain not authorized" error
**Solution**: Add your domain to Firebase Authentication → Settings → Authorized domains

---

## 📞 Need Help?

If you get stuck at any step:
1. **Check browser console** for error messages (F12 → Console tab)
2. **Verify Firebase Console** settings match the instructions
3. **Double-check** that all files are in the correct locations
4. **Review** the error messages - they usually point to the exact issue

---

**🎊 Congratulations!** You now have a fully functional, secure, role-based LMS system running on Firebase!

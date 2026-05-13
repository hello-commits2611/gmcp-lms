# ✅ Quick Setup Checklist - GMCP LMS

Print this checklist and check off each item as you complete it.

## 🔥 Firebase Setup
- [ ] Created Firebase project at https://console.firebase.google.com
- [ ] Enabled Email/Password authentication 
- [ ] Created Firestore database (test mode initially)
- [ ] Deployed security rules from `firestore.rules` file
- [ ] Registered web app and copied Firebase config

## 💻 Code Setup  
- [ ] Updated `firebase-config.js` with my Firebase config
- [ ] Verified all HTML files are in `public/` folder
- [ ] Started local server to test

## 👤 Admin User Creation
- [ ] Temporarily set open Firestore rules
- [ ] Created admin user in Firebase Auth
- [ ] Copied the User UID
- [ ] Created admin profile in Firestore `users` collection
- [ ] Restored production security rules

## ✅ Testing
- [ ] Admin login works → redirects to Management Dashboard
- [ ] Can access Admin Panel from Management Dashboard  
- [ ] Successfully created a test student user
- [ ] Student login works → redirects to Student Dashboard
- [ ] Role-based access control working

## 🚀 Optional Deployment
- [ ] Installed Firebase CLI (`npm install -g firebase-tools`)
- [ ] Ran `firebase login`
- [ ] Initialized hosting (`firebase init hosting`)
- [ ] Deployed with `firebase deploy`
- [ ] Added deployment URL to authorized domains

---

## 🆘 If Something Goes Wrong

**Check these first:**
1. Browser console (F12) for error messages
2. Firebase Console Authentication and Firestore tabs
3. That all files are saved after editing
4. That the Firebase config is correct in `firebase-config.js`

## 📧 Test Accounts

**Admin Account:**
- Email: `admin@gmcpnalanda.com`
- Password: [your chosen password]
- Should redirect to: Management Dashboard

**Test Student Account:**
- Email: `john.doe@gmcpnalanda.com`  
- Password: `testpass123`
- Should redirect to: Student Dashboard

---

## 🎯 What Works After Setup

✅ **Secure Login** - Only @gmcpnalanda.com emails  
✅ **Role-Based Access** - Students see only their data  
✅ **Admin Panel** - Create/manage users with different roles  
✅ **Multiple Dashboards** - Different interface for each role  
✅ **Firebase Security** - Rules prevent unauthorized access  

---

**🎊 Success!** You now have a production-ready LMS system!

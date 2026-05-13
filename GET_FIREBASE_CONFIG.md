# 🔥 Get Your Firebase Configuration

Since you already have Firebase set up with project `admission-form-2025`, you just need to get your frontend configuration keys.

## 📋 Quick Steps to Get Your Config

### Step 1: Go to Firebase Console
1. Open: https://console.firebase.google.com
2. Click on your existing project: **`admission-form-2025`**

### Step 2: Get Web App Configuration
1. Click the **gear icon** ⚙️ next to "Project Overview"
2. Click **"Project settings"**
3. Scroll down to **"Your apps"** section
4. If you don't have a web app yet:
   - Click the **Web icon** `</>`
   - App nickname: `LMS-Frontend`
   - Click **"Register app"**

### Step 3: Copy the Configuration
You'll see something like this:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC1234567890abcdefghijklmnop",
  authDomain: "admission-form-2025.firebaseapp.com",
  projectId: "admission-form-2025",
  storageBucket: "admission-form-2025.firebasestorage.app",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123def456"
};
```

### Step 4: Update Your LMS Config
1. Open: `lms-system/public/firebase-config.js`
2. Find these lines:
```javascript
apiKey: "YOUR_API_KEY_HERE",
messagingSenderId: "YOUR_MESSAGING_SENDER_ID_HERE",
appId: "YOUR_APP_ID_HERE"
```
3. Replace with your actual values from Firebase Console

## 🔑 What You Need to Replace

| Field | Current Value | Replace With |
|-------|---------------|-------------|
| `apiKey` | `"YOUR_API_KEY_HERE"` | Your actual API key |
| `messagingSenderId` | `"YOUR_MESSAGING_SENDER_ID_HERE"` | Your actual sender ID |
| `appId` | `"YOUR_APP_ID_HERE"` | Your actual app ID |

The other fields are already correct:
- ✅ `authDomain: "admission-form-2025.firebaseapp.com"`
- ✅ `projectId: "admission-form-2025"`  
- ✅ `storageBucket: "admission-form-2025.firebasestorage.app"`

## 🚀 After Updating Config

Your LMS system will use your existing Firebase project! No need to create anything new.

## 🔐 Enable Authentication (If Not Already Done)

1. In Firebase Console, go to **Authentication**
2. Click **"Get started"** (if needed)
3. Go to **"Sign-in method"** tab
4. Enable **"Email/Password"** if not already enabled

## 💾 Setup Firestore Security Rules

1. Go to **Firestore Database** in Firebase Console
2. Click **"Rules"** tab
3. Replace all existing rules with the content from: `lms-system/firestore.rules`
4. Click **"Publish"**

---

## ✅ That's It!

You're now using your existing Firebase project with the new LMS system. No duplicate accounts or projects needed!

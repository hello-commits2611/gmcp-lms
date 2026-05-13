# 🧪 Local Testing Guide

## Testing Changes Before Deployment

**Always test your changes locally before pushing to GitHub!**

---

## 🚀 Starting Your Local Server

### Step 1: Open Terminal in Backend Folder

```bash
# Navigate to backend directory
cd "C:\Users\Kumar Uttchrist\Desktop\github repo admission backend\gmcp-lms-deploy\backend"
```

### Step 2: Make Sure You Have .env File

**Check if .env exists:**
```bash
Test-Path .env
```

**If it returns `False`, create .env file:**

Create a file named `.env` in the `backend` folder with these contents:

```env
# Development Environment Variables

NODE_ENV=development
PORT=3000

# JWT Secret (for development only)
JWT_SECRET=dev-secret-key-min-32-chars-long-for-testing

# Firebase Service Account (copy from your firebase-service-account.json)
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"admission-form-2025",...}

# Razorpay (use test keys)
RAZORPAY_KEY_ID=rzp_test_1DP5mmOlF5G5ag
RAZORPAY_KEY_SECRET=your_razorpay_test_secret
```

**Or copy from your main project:**
```bash
Copy-Item "C:\Users\Kumar Uttchrist\Desktop\github repo admission backend\gmcp-ecosystem\backend\.env" -Destination .env
```

### Step 3: Install Dependencies (First Time Only)

```bash
npm install
```

This downloads all required packages. Only needed once or when you add new packages.

### Step 4: Start the Server

**Option A: Normal Start**
```bash
npm start
```

**Option B: Development Mode (Auto-restart on changes)**
```bash
npm run dev
```

**Option C: Using nodemon directly**
```bash
npx nodemon server.js
```

### Step 5: Check Server is Running

You should see:
```
🚀 Server running on http://localhost:3000
🔥 Firebase initialized successfully - Project: admission-form-2025
✅ All systems ready!
```

---

## 🧪 Testing Your Changes

### 1. Test Backend API

**Open browser or use curl/Postman:**

**Check server health:**
```
http://localhost:3000/
```

**Test auth endpoint:**
```
http://localhost:3000/api/auth/check
```

**Test users endpoint (requires auth):**
```
http://localhost:3000/api/users
```

### 2. Test Frontend

**Open the frontend in browser:**

**Login page:**
```
C:\Users\Kumar Uttchrist\Desktop\github repo admission backend\gmcp-lms-deploy\lms-system\public\login.html
```

Just double-click the file or open in browser.

**OR use Live Server (VS Code extension):**
- Right-click on `login.html`
- Select "Open with Live Server"
- This will open at `http://localhost:5500` or similar

### 3. Test Login Flow

1. Open login page
2. Try logging in with test credentials:
   ```
   Email: admin@gmcpnalanda.com
   Password: admin123
   ```
   (or any user you have in Firestore)

3. Check browser console for errors (F12 → Console tab)

### 4. Test Your Specific Changes

**If you changed:**
- **Backend route** → Test the API endpoint directly
- **Frontend page** → Navigate to that page and test functionality
- **Database query** → Check Firestore console to see if data is saved
- **Authentication** → Try logging in/out

---

## 🔍 Checking for Errors

### Backend Errors

**Terminal will show:**
```
❌ Error: Cannot find module...
❌ SyntaxError: Unexpected token
❌ TypeError: Cannot read property...
```

**Fix the error and server will restart automatically (if using nodemon)**

### Frontend Errors

**Browser Console (F12):**
```
❌ Uncaught TypeError: Cannot read property...
❌ Failed to fetch
❌ 404 Not Found
```

**Check:**
- API endpoint URLs are correct
- Server is running
- CORS is enabled

---

## 🛠️ Common Testing Scenarios

### Testing New Feature

```bash
# 1. Make your code changes
# 2. Start server (if not running)
npm run dev

# 3. Test the feature in browser
# 4. Check console for errors
# 5. Test with different inputs
# 6. Verify data in Firestore console
```

### Testing Bug Fix

```bash
# 1. Reproduce the bug locally first
# 2. Fix the code
# 3. Test that bug is gone
# 4. Test that fix didn't break anything else
# 5. Test edge cases
```

### Testing Database Changes

```bash
# 1. Open Firestore console: https://console.firebase.google.com/
# 2. Navigate to your project: admission-form-2025
# 3. Go to Firestore Database
# 4. Run your code that modifies data
# 5. Check if data appears/updates correctly
# 6. Check backend logs for any errors
```

---

## 📝 Testing Checklist

Before pushing to GitHub:

- [ ] Server starts without errors
- [ ] No console errors in terminal
- [ ] Login works
- [ ] Your new feature/fix works
- [ ] Existing features still work (smoke test)
- [ ] No errors in browser console
- [ ] Data saves correctly to Firestore
- [ ] Code looks clean (no console.log left behind)

---

## 🚫 Common Issues

### Issue: Server won't start

**Error:** `Cannot find module 'express'`
**Fix:** Run `npm install`

**Error:** `Port 3000 is already in use`
**Fix:** 
```bash
# Kill process on port 3000
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process
```

### Issue: Changes not reflecting

**Frontend changes not showing:**
- Clear browser cache (Ctrl+Shift+R)
- Check if you're editing the right file
- Make sure file is saved

**Backend changes not reflecting:**
- Restart server
- Check if using nodemon (auto-restart)
- Clear require cache

### Issue: Firebase errors

**Error:** `Failed to initialize Firebase`
**Fix:** Check `.env` file has valid `FIREBASE_SERVICE_ACCOUNT`

**Error:** `Permission denied`
**Fix:** Check Firestore security rules

### Issue: CORS errors

**Error:** `CORS policy: No 'Access-Control-Allow-Origin'`
**Fix:** Server already has CORS enabled. Make sure server is running.

---

## 💡 Pro Tips

### 1. Use Development Tools

**VS Code Extensions:**
- Live Server (frontend preview)
- Thunder Client (API testing)
- Error Lens (shows errors inline)

**Browser Tools:**
- React DevTools
- Network tab (see API calls)
- Application tab (see localStorage, cookies)

### 2. Keep Server Running

Use `npm run dev` so server restarts automatically when you save files.

### 3. Test Data

Create test users in Firestore for testing:
```
test-student@gmcpnalanda.com
test-faculty@gmcpnalanda.com
test-admin@gmcpnalanda.com
```

### 4. Use Console Logs

Temporarily add logs to debug:
```javascript
console.log('Testing feature X:', data);
```

**Remember to remove before committing!**

### 5. Check Firestore Console

Always verify database changes:
https://console.firebase.google.com/project/admission-form-2025/firestore

---

## 🔄 Typical Development Session

```bash
# Morning: Start work
cd "C:\Users\Kumar Uttchrist\Desktop\github repo admission backend\gmcp-lms-deploy\backend"
npm run dev

# Make changes to code
# Save file (Ctrl+S)
# Server auto-restarts
# Test in browser
# Repeat

# Afternoon: Done with feature
# Stop server (Ctrl+C)
# Run final tests
# If all good → Push to GitHub (see next section)
```

---

## 🎯 Quick Commands Reference

```bash
# Navigate to backend
cd "C:\Users\Kumar Uttchrist\Desktop\github repo admission backend\gmcp-lms-deploy\backend"

# Install dependencies
npm install

# Start server (normal)
npm start

# Start server (development mode - auto-restart)
npm run dev

# Check if port is in use
Get-NetTCPConnection -LocalPort 3000

# Kill process on port 3000
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process

# Check Node version
node --version

# Check npm version
npm --version
```

---

## 📚 Next Steps

After testing locally:
1. All tests pass → Push to GitHub
2. GitHub push → Render auto-deploys
3. Test on production URL
4. Monitor for errors

**See DEVELOPMENT-WORKFLOW.md for the complete push/deploy process!**

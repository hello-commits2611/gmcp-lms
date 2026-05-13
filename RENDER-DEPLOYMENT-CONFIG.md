# 🚀 Render Deployment Configuration

**Date:** February 24, 2026  
**Service:** GMCP LMS  
**Target Domain:** lms.gmcpnalanda.com

---

## 📋 Render Settings (Copy These Values)

### Basic Configuration

| Field | Value |
|-------|-------|
| **Name** | `gmcp-lms` |
| **Language** | `Node` |
| **Branch** | `main` |
| **Region** | `Oregon (US West)` |
| **Root Directory** | `backend` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance Type** | `Starter ($7/month)` or `Free` |

---

## 🔐 Environment Variables (5 Required)

### 1. NODE_ENV
```
NAME: NODE_ENV
VALUE: production
```

### 2. JWT_SECRET
```
NAME: JWT_SECRET
VALUE: [GENERATE NEW - See instructions below]
```

**How to generate:**
1. Visit: https://www.grc.com/passwords.htm
2. Copy the "63 random alphanumeric characters"
3. Paste as the value

**Example format (generate your own!):**
```
tR7vX2pK9mN4qW8zL3cY6fH1jB5sD0gA4kM7wE9xR2uI5oT8nQ3vZ6hC1yF4lP
```

### 3. FIREBASE_SERVICE_ACCOUNT
```
NAME: FIREBASE_SERVICE_ACCOUNT
VALUE: [SEE BELOW - Already copied to your clipboard!]
```

**✅ The Firebase JSON is ALREADY in your clipboard!**

Just paste it (Ctrl+V) into the VALUE field in Render.

**The JSON looks like this (shortened for display):**
```json
{"type":"service_account","project_id":"admission-form-2025","private_key_id":"19998af44edb3902...","private_key":"-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgk...","client_email":"firebase-adminsdk-fbsvc@admission-form-2025.iam.gserviceaccount.com",...}
```

### 4. RAZORPAY_KEY_ID
```
NAME: RAZORPAY_KEY_ID
VALUE: rzp_test_1DP5mmOlF5G5ag
```

### 5. RAZORPAY_KEY_SECRET
```
NAME: RAZORPAY_KEY_SECRET
VALUE: [Your Razorpay secret key]
```

**How to get it:**
1. Log in to Razorpay Dashboard: https://dashboard.razorpay.com/
2. Go to Settings → API Keys
3. Copy the "Key Secret"

---

## ✅ Step-by-Step Deployment

### Step 1: Fill Basic Settings
In the Render deployment form:

1. **Name:** Type `gmcp-lms`
2. **Language:** Keep `Node` (already selected)
3. **Branch:** Keep `main` (already selected)
4. **Region:** Keep `Oregon (US West)`
5. **Root Directory:** Type `backend` ⚠️ IMPORTANT!
6. **Build Command:** Change to `npm install`
7. **Start Command:** Change to `npm start`

### Step 2: Choose Instance Type
- **For testing:** Select `Free`
- **For production:** Select `Starter` ($7/month) ✅ Recommended

### Step 3: Add Environment Variables

Click **"Add Environment Variable"** 5 times and fill in:

#### Variable 1:
```
NAME: NODE_ENV
VALUE: production
```

#### Variable 2:
```
NAME: JWT_SECRET
VALUE: [Go to https://www.grc.com/passwords.htm and copy 63 chars]
```

#### Variable 3:
```
NAME: FIREBASE_SERVICE_ACCOUNT
VALUE: [Press Ctrl+V to paste - it's already in your clipboard!]
```

#### Variable 4:
```
NAME: RAZORPAY_KEY_ID
VALUE: rzp_test_1DP5mmOlF5G5ag
```

#### Variable 5:
```
NAME: RAZORPAY_KEY_SECRET
VALUE: [Get from Razorpay dashboard]
```

### Step 4: Create Web Service

1. Click **"Create Web Service"** at the bottom
2. Wait 3-5 minutes for deployment
3. Watch the build logs for any errors

---

## 🌐 After Deployment - Add Custom Domain

Once your service is deployed successfully:

### Step 1: Get Your Render URL
Render will give you a URL like:
```
https://gmcp-lms.onrender.com
```

Test this URL first to make sure everything works!

### Step 2: Add Custom Domain in Render

1. In your Render dashboard, go to your `gmcp-lms` service
2. Click on **"Settings"** tab
3. Scroll to **"Custom Domains"** section
4. Click **"Add Custom Domain"**
5. Enter: `lms.gmcpnalanda.com`
6. Click **"Save"**

Render will show you DNS instructions like:
```
Type: CNAME
Name: lms
Value: gmcp-lms.onrender.com
```

### Step 3: Update DNS Settings

Go to your domain registrar (where you manage gmcpnalanda.com) and add:

```
Type: CNAME
Host/Name: lms
Target/Value: gmcp-lms.onrender.com
TTL: 3600 (or Auto)
```

### Step 4: Wait for Verification

1. DNS propagation takes 5-60 minutes
2. Go back to Render and click **"Verify"**
3. Once verified, Render will issue SSL certificate automatically
4. Your LMS will be live at: `https://lms.gmcpnalanda.com`

---

## 🔍 Testing After Deployment

### 1. Test Render URL First
Visit: `https://gmcp-lms.onrender.com`

**You should see:**
- Your login page loads
- No console errors
- Can attempt login (test with your credentials)

### 2. Test API Endpoints
Try these URLs:
```
https://gmcp-lms.onrender.com/api/auth/check
https://gmcp-lms.onrender.com/api/users
```

Should return JSON responses (not errors)

### 3. Test Custom Domain
After DNS propagates, visit:
```
https://lms.gmcpnalanda.com
```

Should load the same content as the Render URL

---

## ⚠️ Troubleshooting

### Build Fails

**Check these:**
- ✅ Root Directory is set to `backend`
- ✅ Build Command is `npm install` (not yarn)
- ✅ Start Command is `npm start`
- ✅ All 5 environment variables are set

### Deployment Succeeds But App Crashes

**Check:**
- ✅ Firebase JSON is valid (no syntax errors)
- ✅ Firebase JSON is ONE LINE (no line breaks)
- ✅ JWT_SECRET is set (63+ characters)
- ✅ All environment variables have correct names (case-sensitive!)

### Custom Domain Not Working

**Check:**
- ✅ CNAME record added correctly in DNS
- ✅ Record name is `lms` (not `lms.gmcpnalanda.com`)
- ✅ Record value is `gmcp-lms.onrender.com`
- ✅ Wait up to 1 hour for DNS propagation

---

## 📊 Expected Results

### After Successful Deployment:

**Render URL:**
```
✅ https://gmcp-lms.onrender.com
```

**Custom Domain (after DNS):**
```
✅ https://lms.gmcpnalanda.com
```

**Your Two Sites:**
- `www.gmcpnalanda.com` → Admission Backend (existing)
- `lms.gmcpnalanda.com` → GMCP LMS (new)

---

## 💾 Important Files

**Firebase Credentials Location (Keep Secure!):**
```
C:\Users\Kumar Uttchrist\Desktop\github repo admission backend\gmcp-ecosystem\backend\config\firebase-service-account.json
```

**⚠️ NEVER commit this file to Git!**

**Deployment Folder:**
```
C:\Users\Kumar Uttchrist\Desktop\github repo admission backend\gmcp-lms-deploy
```

---

## 🎯 Quick Reference

### Commands for Future Updates

**Push code updates to GitHub:**
```bash
cd "C:\Users\Kumar Uttchrist\Desktop\github repo admission backend\gmcp-lms-deploy"
git add .
git commit -m "Update: description of changes"
git push origin main
```

**Render will automatically redeploy** when you push to GitHub!

---

## ✅ Deployment Checklist

Before clicking "Create Web Service":

- [ ] Name: `gmcp-lms`
- [ ] Root Directory: `backend`
- [ ] Build Command: `npm install`
- [ ] Start Command: `npm start`
- [ ] Instance: `Starter` or `Free`
- [ ] ENV 1: NODE_ENV = production
- [ ] ENV 2: JWT_SECRET = [63 chars generated]
- [ ] ENV 3: FIREBASE_SERVICE_ACCOUNT = [clipboard paste]
- [ ] ENV 4: RAZORPAY_KEY_ID = rzp_test_1DP5mmOlF5G5ag
- [ ] ENV 5: RAZORPAY_KEY_SECRET = [from dashboard]

---

**You're ready to deploy! 🚀**

**Click "Create Web Service" and watch it build!**

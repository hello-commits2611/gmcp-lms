# 🔐 Environment Variables Setup Guide

## ⚠️ CRITICAL: Never Commit .env to Git!

Your `.env` file contains **SECRET CREDENTIALS** and should **NEVER** be uploaded to GitHub or any public repository.

## How .env File Works

### ❌ What NOT to Do:
- **DO NOT** commit the `.env` file to Git
- **DO NOT** share your `.env` file publicly
- **DO NOT** use development secrets in production

### ✅ What TO Do:
1. Keep `.env` file only on your local machine
2. Use `.env.example` as a template (safe to commit)
3. Set environment variables directly on deployment platform
4. Generate new secrets for production

## 🔒 The .gitignore Protection

The `.gitignore` file in this folder is configured to **automatically exclude** sensitive files:

```
.env
.env.local
.env.production
*.env
backend/data/
*serviceAccount*.json
```

This means when you run `git add .`, these files will **NOT** be added to Git.

## 📋 Step-by-Step Setup

### For Local Development:

1. **Copy the template:**
   ```bash
   cp .env.example backend/.env
   ```

2. **Edit the file:**
   - Open `backend/.env` in a text editor
   - Replace placeholder values with your actual credentials

3. **Verify it's ignored:**
   ```bash
   git status
   ```
   You should **NOT** see `.env` in the list of files to be committed.

### For Production Deployment:

**DO NOT upload .env file!** Instead, set environment variables on your platform:

---

## 🌐 Setting Environment Variables on Deployment Platforms

### Render.com

1. Go to your service dashboard
2. Click **"Environment"** tab
3. Click **"Add Environment Variable"**
4. Add each variable:

   | Key | Value |
   |-----|-------|
   | `NODE_ENV` | `production` |
   | `JWT_SECRET` | (Generate from https://www.grc.com/passwords.htm) |
   | `FIREBASE_SERVICE_ACCOUNT` | (Copy entire JSON from your local .env) |
   | `RAZORPAY_KEY_ID` | `rzp_test_1DP5mmOlF5G5ag` |
   | `RAZORPAY_KEY_SECRET` | (Your secret) |

5. Click **"Save Changes"**

### Railway.app

1. Go to your project
2. Click **"Variables"** tab
3. Click **"New Variable"**
4. Add each variable (same as above)
5. Railway automatically redeploys

### Heroku

Use the Heroku CLI:

```bash
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET="your-generated-secret-here"
heroku config:set FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}'
heroku config:set RAZORPAY_KEY_ID=rzp_test_1DP5mmOlF5G5ag
heroku config:set RAZORPAY_KEY_SECRET=your-secret-here
```

Or use the Heroku Dashboard:
1. Go to your app
2. Settings tab
3. **"Reveal Config Vars"**
4. Add each variable

---

## 🔑 Required Environment Variables

### 1. JWT_SECRET (REQUIRED)

**Purpose:** Secures user sessions and authentication tokens

**Generate New Secret:**
1. Visit: https://www.grc.com/passwords.htm
2. Copy the **"63 random alpha-numeric characters"**
3. Use this as your JWT_SECRET

**Example:**
```
JWT_SECRET=TqJnG7vRfZ8xWp2mKhL4sY6bN9cX3aV5eU8wQ1tD7yH0oI2jF4gM6k
```

**Requirements:**
- Must be at least 32 characters
- Use different secrets for development and production
- Never reuse secrets across projects

---

### 2. NODE_ENV (REQUIRED)

**Purpose:** Tells the app whether it's running in development or production

**Values:**
- Development: `NODE_ENV=development`
- Production: `NODE_ENV=production`

**For Deployment:** Always use `production`

---

### 3. FIREBASE_SERVICE_ACCOUNT (REQUIRED)

**Purpose:** Connects your app to Firebase for authentication and database

**Where to Get:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `admission-form-2025`
3. Click ⚙️ (Settings) → **Project Settings**
4. Go to **"Service Accounts"** tab
5. Click **"Generate new private key"**
6. Download the JSON file

**How to Use:**

**Option A: Copy entire JSON as one line (Recommended for deployment platforms)**

The JSON should be on ONE LINE with escaped quotes:

```
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"admission-form-2025","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"..."}
```

**Option B: Keep your existing value from current .env**

If your app is already working locally, copy the entire `FIREBASE_SERVICE_ACCOUNT` value from your current `.env` file.

---

### 4. RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET (REQUIRED)

**Purpose:** Enables payment processing

**Where to Get:**
1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Sign in
3. Settings → **API Keys**
4. Copy both Key ID and Key Secret

**Example:**
```
RAZORPAY_KEY_ID=rzp_test_1DP5mmOlF5G5ag
RAZORPAY_KEY_SECRET=your_actual_secret_key_here
```

---

### 5. PORT (OPTIONAL)

**Purpose:** Specifies which port the server runs on

**Default:** 3000

**Note:** Most deployment platforms (Render, Railway, Heroku) set this automatically. You usually don't need to set this.

---

## ✅ Verification Checklist

Before deploying:

- [ ] `.env` file is NOT in your Git repository
- [ ] Run `git status` and confirm `.env` is not listed
- [ ] `.gitignore` file exists and includes `.env`
- [ ] `.env.example` is in the repository (this is safe)
- [ ] All required environment variables are set on deployment platform
- [ ] Generated NEW JWT_SECRET for production (don't use dev secret!)
- [ ] NODE_ENV is set to `production` on deployment platform
- [ ] Firebase credentials are valid and working

---

## 🧪 Testing Environment Variables

### Test Locally:

```bash
cd backend
npm start
```

If environment variables are correct, you'll see:
```
✅ JWT secret is properly configured (64 characters)
Firebase initialized successfully
Server running on port 3000
```

### Test on Deployment Platform:

1. Check deployment logs for errors
2. Visit the health check endpoint: `https://your-app.com/api/health`
3. Should return: `{"status":"ok","timestamp":"..."}`

---

## 🚨 Troubleshooting

### "JWT_SECRET must be at least 32 characters"

**Solution:** Generate a longer secret from https://www.grc.com/passwords.htm

### "Firebase initialization failed"

**Solutions:**
- Verify the JSON is properly formatted (one line, escaped quotes)
- Check that you copied the ENTIRE JSON
- Ensure the service account has proper permissions

### ".env file is showing in git status"

**Solution:**
```bash
# Remove from Git tracking
git rm --cached backend/.env

# Verify .gitignore includes .env
cat .gitignore | grep .env
```

### "Environment variable not found on deployment"

**Solutions:**
- Double-check variable names (they're case-sensitive)
- Ensure no extra spaces in variable names
- Verify you clicked "Save" after adding variables
- Restart/redeploy the service

---

## 📝 Quick Reference

### Copy These Values to Your Deployment Platform:

**From your current working .env file:**
1. `JWT_SECRET` - ⚠️ Generate NEW one for production!
2. `FIREBASE_SERVICE_ACCOUNT` - Copy the entire JSON
3. `RAZORPAY_KEY_ID` - Copy from Razorpay dashboard
4. `RAZORPAY_KEY_SECRET` - Copy from Razorpay dashboard

**Set manually:**
1. `NODE_ENV` = `production`

---

## 🎯 Summary

1. **NEVER commit `.env` to Git** - it's automatically ignored
2. **Use `.env.example`** as a template (safe to commit)
3. **Set environment variables** directly on deployment platform
4. **Generate new JWT_SECRET** for production
5. **Verify** with `git status` before pushing

Your secrets are safe! 🔐

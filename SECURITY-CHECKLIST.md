# Security Checklist for Render Deployment

## ✅ Pre-Push Security Audit Completed

### Files Removed from Git (Sensitive Data)
- ✅ `config/firebase-service-account.json` - Contained Firebase private keys
- ✅ `config/firebase-single-line.txt` - Contained Firebase credentials
- ✅ `.env` - Protected by .gitignore (never committed)

### Security Measures Implemented
- ✅ Updated `.gitignore` to prevent future credential commits
- ✅ All secrets use environment variables (`process.env.*`)
- ✅ No hardcoded passwords, keys, or tokens in code
- ✅ `.env.example` contains only placeholder values

### Environment Variables Required on Render

**CRITICAL: Set these in Render Dashboard before deploying:**

```env
# Required
NODE_ENV=production
PORT=3000

# JWT Secret (Generate a strong 32+ character random string)
JWT_SECRET=<generate-using-https://www.grc.com/passwords.htm>

# Firebase Credentials (Copy from your Firebase Console)
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"admission-form-2025",...}

# Payment Gateway (if using)
RAZORPAY_KEY_ID=rzp_live_xxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxx
```

### How to Set Environment Variables on Render

1. Go to https://dashboard.render.com
2. Select your service → Environment tab
3. Add each variable as KEY=VALUE
4. Click "Save Changes"
5. Service will auto-deploy with new variables

### Firebase Service Account Setup

1. Go to Firebase Console: https://console.firebase.google.com
2. Select your project: `admission-form-2025`
3. Click ⚙️ Settings → Project Settings
4. Go to "Service accounts" tab
5. Click "Generate new private key"
6. Copy the entire JSON content
7. Paste as `FIREBASE_SERVICE_ACCOUNT` environment variable in Render
8. **IMPORTANT**: Make it a single-line JSON (remove newlines from private_key)

### Post-Deployment Verification

After pushing to GitHub and deploying on Render:

- [ ] Check Render logs for successful Firebase initialization
- [ ] Test login at your-app.onrender.com
- [ ] Verify biometric endpoints are working
- [ ] Test admin portal access
- [ ] Check that no secrets are visible in public repos

### Emergency: If Credentials Were Exposed

If you accidentally pushed credentials to GitHub:

1. **Immediately rotate all exposed credentials:**
   - Generate new Firebase service account
   - Regenerate JWT_SECRET
   - Rotate Razorpay keys
2. **Remove from git history:**
   ```bash
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch config/firebase-service-account.json" \
     --prune-empty --tag-name-filter cat -- --all
   git push origin --force --all
   ```
3. **Update environment variables** on Render with new credentials

### Security Best Practices

- ✅ Never commit `.env` files
- ✅ Never commit files with `secret`, `key`, `password`, or `credential` in filename
- ✅ Always use environment variables for sensitive data
- ✅ Keep `.gitignore` updated
- ✅ Regularly rotate secrets and keys
- ✅ Use strong, unique passwords/secrets (32+ characters)
- ✅ Enable 2FA on all service accounts (Firebase, Render, GitHub)

---

## Repository is SAFE to Push ✅

All sensitive files have been removed. You can now safely push to GitHub.

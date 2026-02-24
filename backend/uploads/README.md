# Uploads Directory

This directory stores user-uploaded files during runtime.

## ⚠️ Important Security Notes

**DO NOT commit uploaded files to Git!**

This folder is ignored by Git (see `.gitignore`) for security and privacy reasons.

## Subdirectories

The application will automatically create these folders when users upload files:

- `profiles/` - User profile pictures
- `notices/` - Notice PDFs and documents
- `supporting-documents/` - Application supporting documents

## On Deployment

When you deploy to production:

1. **The uploads folder will be empty** (this is correct!)
2. **Files will be created at runtime** when users upload content
3. **Files are stored temporarily** on the server filesystem

## ⚠️ Production Recommendation

For production deployments, consider using cloud storage instead of filesystem:

- **Firebase Storage** (recommended for your Firestore setup)
- **AWS S3**
- **Cloudinary**
- **Google Cloud Storage**

This ensures:
- Files persist across deployments
- Better scalability
- Automatic backups
- CDN delivery for faster loading

## Current Setup

Currently, files are stored in the local filesystem. This works for development but has limitations in production (files may be lost on redeployment).

---

**Never commit user files to Git for privacy and security!**

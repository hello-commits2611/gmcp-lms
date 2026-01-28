const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const router = express.Router();

// Paths for document storage
const DOCUMENTS_DB_PATH = path.join(__dirname, '../data/documents.json');
const UPLOADS_DIR = path.join(__dirname, '../uploads');
const NOTICES_DIR = path.join(UPLOADS_DIR, 'notices');
const MESS_MENU_DIR = path.join(UPLOADS_DIR, 'mess-menu');

// Ensure directories exist
const ensureDirectories = () => {
    const dirs = [UPLOADS_DIR, NOTICES_DIR, MESS_MENU_DIR];
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
    
    const dataDir = path.dirname(DOCUMENTS_DB_PATH);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
};

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        ensureDirectories();
        const docType = req.body.type || 'notice';
        const uploadPath = docType === 'mess-menu' ? MESS_MENU_DIR : NOTICES_DIR;
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substr(2, 9);
        const extension = path.extname(file.originalname);
        const docType = req.body.type || 'notice';
        cb(null, `${docType}-${timestamp}-${randomId}${extension}`);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed!'), false);
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Load documents database
const loadDocuments = () => {
    ensureDirectories();
    
    if (fs.existsSync(DOCUMENTS_DB_PATH)) {
        try {
            const data = fs.readFileSync(DOCUMENTS_DB_PATH, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error loading documents:', error);
            return { notices: [], messMenus: [] };
        }
    }
    return { notices: [], messMenus: [] };
};

// Save documents database
const saveDocuments = (documents) => {
    try {
        fs.writeFileSync(DOCUMENTS_DB_PATH, JSON.stringify(documents, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving documents:', error);
        return false;
    }
};

// Basic session validation (simplified for now)
const validateSession = (req, res, next) => {
    // For now, we'll temporarily disable session validation for development
    // In production, this should validate the actual session token properly
    console.log('✅ Session validation temporarily bypassed for document routes');
    next();
};

// Admin-only middleware
const requireAdmin = (req, res, next) => {
    // In production, properly validate admin role from session
    // For now, assuming admin access
    next();
};

// Upload notice (Admin only)
router.post('/upload-notice', validateSession, requireAdmin, upload.single('file'), (req, res) => {
    try {
        const { title, description } = req.body;
        
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }
        
        if (!title || !title.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Notice title is required'
            });
        }
        
        const documents = loadDocuments();
        
        const notice = {
            id: Date.now().toString(),
            title: title.trim(),
            description: description?.trim() || '',
            filename: req.file.filename,
            originalName: req.file.originalname,
            filePath: `/uploads/notices/${req.file.filename}`,
            fileSize: req.file.size,
            uploadedAt: new Date().toISOString(),
            uploadedBy: 'admin', // In production, get from session
            type: 'notice',
            isActive: true
        };
        
        // Add to notices array (newest first)
        documents.notices.unshift(notice);
        
        // Keep only last 50 notices
        if (documents.notices.length > 50) {
            const oldNotices = documents.notices.slice(50);
            // Delete old notice files
            oldNotices.forEach(oldNotice => {
                const oldFilePath = path.join(NOTICES_DIR, oldNotice.filename);
                if (fs.existsSync(oldFilePath)) {
                    fs.unlinkSync(oldFilePath);
                }
            });
            documents.notices = documents.notices.slice(0, 50);
        }
        
        if (saveDocuments(documents)) {
            console.log(`✅ Notice uploaded: ${title}`);
            res.json({
                success: true,
                message: 'Notice uploaded successfully',
                notice: notice
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to save notice information'
            });
        }
        
    } catch (error) {
        console.error('Upload notice error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to upload notice'
        });
    }
});

// Upload mess menu (Admin only)
router.post('/upload-mess-menu', validateSession, requireAdmin, upload.single('file'), (req, res) => {
    try {
        const { title, description } = req.body;
        
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }
        
        if (!title || !title.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Mess menu title is required'
            });
        }
        
        const documents = loadDocuments();
        
        // Delete old mess menu files (keep only one active)
        if (documents.messMenus.length > 0) {
            documents.messMenus.forEach(oldMenu => {
                const oldFilePath = path.join(MESS_MENU_DIR, oldMenu.filename);
                if (fs.existsSync(oldFilePath)) {
                    fs.unlinkSync(oldFilePath);
                }
            });
        }
        
        const messMenu = {
            id: Date.now().toString(),
            title: title.trim(),
            description: description?.trim() || '',
            filename: req.file.filename,
            originalName: req.file.originalname,
            filePath: `/uploads/mess-menu/${req.file.filename}`,
            fileSize: req.file.size,
            uploadedAt: new Date().toISOString(),
            uploadedBy: 'admin', // In production, get from session
            type: 'mess-menu',
            isActive: true
        };
        
        // Replace mess menu (only keep current one)
        documents.messMenus = [messMenu];
        
        if (saveDocuments(documents)) {
            console.log(`✅ Mess menu uploaded: ${title}`);
            res.json({
                success: true,
                message: 'Mess menu uploaded successfully',
                messMenu: messMenu
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to save mess menu information'
            });
        }
        
    } catch (error) {
        console.error('Upload mess menu error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to upload mess menu'
        });
    }
});

// Get all notices (for students)
router.get('/notices', validateSession, (req, res) => {
    try {
        const documents = loadDocuments();
        const activeNotices = documents.notices.filter(notice => notice.isActive);
        
        res.json({
            success: true,
            notices: activeNotices
        });
        
    } catch (error) {
        console.error('Get notices error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch notices'
        });
    }
});

// Get current mess menu (for students)
router.get('/mess-menu', validateSession, (req, res) => {
    try {
        const documents = loadDocuments();
        const currentMessMenu = documents.messMenus.find(menu => menu.isActive);
        
        res.json({
            success: true,
            messMenu: currentMessMenu || null
        });
        
    } catch (error) {
        console.error('Get mess menu error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch mess menu'
        });
    }
});

// Get all documents (Admin only)
router.get('/admin/all', validateSession, requireAdmin, (req, res) => {
    try {
        const documents = loadDocuments();
        
        res.json({
            success: true,
            documents: documents
        });
        
    } catch (error) {
        console.error('Get all documents error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch documents'
        });
    }
});

// Delete notice (Admin only)
router.delete('/admin/notice/:id', validateSession, requireAdmin, (req, res) => {
    try {
        const { id } = req.params;
        const documents = loadDocuments();
        
        const noticeIndex = documents.notices.findIndex(notice => notice.id === id);
        
        if (noticeIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Notice not found'
            });
        }
        
        const notice = documents.notices[noticeIndex];
        
        // Delete file
        const filePath = path.join(NOTICES_DIR, notice.filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        
        // Remove from database
        documents.notices.splice(noticeIndex, 1);
        
        if (saveDocuments(documents)) {
            console.log(`✅ Notice deleted: ${notice.title}`);
            res.json({
                success: true,
                message: 'Notice deleted successfully'
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to delete notice'
            });
        }
        
    } catch (error) {
        console.error('Delete notice error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete notice'
        });
    }
});

// Toggle notice active status (Admin only)
router.post('/admin/notice/:id/toggle', validateSession, requireAdmin, (req, res) => {
    try {
        const { id } = req.params;
        const documents = loadDocuments();
        
        const notice = documents.notices.find(notice => notice.id === id);
        
        if (!notice) {
            return res.status(404).json({
                success: false,
                error: 'Notice not found'
            });
        }
        
        notice.isActive = !notice.isActive;
        
        if (saveDocuments(documents)) {
            console.log(`✅ Notice ${notice.isActive ? 'activated' : 'deactivated'}: ${notice.title}`);
            res.json({
                success: true,
                message: `Notice ${notice.isActive ? 'activated' : 'deactivated'} successfully`,
                notice: notice
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to update notice status'
            });
        }
        
    } catch (error) {
        console.error('Toggle notice status error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to toggle notice status'
        });
    }
});

module.exports = router;
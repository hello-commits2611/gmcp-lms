const express = require('express');
const router = express.Router();
const { getFirestore, getAdmin } = require('../config/firebase-config');
const { sessionManager } = require('./auth');

// Middleware to validate session
const validateSession = (req, res, next) => {
  const sessionToken = req.headers['authorization']?.replace('Bearer ', '') || 
                      req.cookies?.sessionToken || 
                      req.body.sessionToken;
  
  if (!sessionToken) {
    return res.status(401).json({
      success: false,
      error: 'No session token provided'
    });
  }

  const validation = sessionManager.validateSession(sessionToken);
  if (!validation.valid) {
    return res.status(401).json({
      success: false,
      error: validation.error || 'Invalid session'
    });
  }

  req.session = validation.session;
  req.user = validation.userData;
  next();
};

// GET /api/feedback-links - Get all feedback links (Public for students)
router.get('/', validateSession, async (req, res) => {
  try {
    const firestore = getFirestore();
    if (!firestore) {
      return res.status(500).json({
        success: false,
        error: 'Database not available'
      });
    }

    const snapshot = await firestore.collection('feedback_links')
      .orderBy('order', 'asc')
      .get();

    const links = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      links.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date()
      });
    });

    res.json({
      success: true,
      links,
      count: links.length
    });

  } catch (error) {
    console.error('Error fetching feedback links:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch feedback links'
    });
  }
});

// POST /api/feedback-links - Add new feedback link (Admin only)
router.post('/', validateSession, async (req, res) => {
  try {
    // Only admins can add feedback links
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admins can add feedback links'
      });
    }

    const { title, url, description, order } = req.body;

    // Validation
    if (!title || !url) {
      return res.status(400).json({
        success: false,
        error: 'Title and URL are required'
      });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (e) {
      return res.status(400).json({
        success: false,
        error: 'Invalid URL format'
      });
    }

    const firestore = getFirestore();
    if (!firestore) {
      return res.status(500).json({
        success: false,
        error: 'Database not available'
      });
    }

    // Create feedback link document
    const linkRef = firestore.collection('feedback_links').doc();
    const linkData = {
      id: linkRef.id,
      title: title.trim(),
      url: url.trim(),
      description: description ? description.trim() : '',
      order: order || 0,
      isActive: true,
      createdAt: getAdmin().firestore.FieldValue.serverTimestamp(),
      updatedAt: getAdmin().firestore.FieldValue.serverTimestamp(),
      createdBy: req.user.email
    };

    await linkRef.set(linkData);

    console.log(`✅ Feedback link created: ${linkRef.id} by ${req.user.email}`);

    res.json({
      success: true,
      message: 'Feedback link added successfully',
      link: linkData
    });

  } catch (error) {
    console.error('Error creating feedback link:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create feedback link'
    });
  }
});

// PATCH /api/feedback-links/:id - Update feedback link (Admin only)
router.patch('/:id', validateSession, async (req, res) => {
  try {
    // Only admins can update feedback links
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admins can update feedback links'
      });
    }

    const { id } = req.params;
    const { title, url, description, order, isActive } = req.body;

    // Validate URL if provided
    if (url) {
      try {
        new URL(url);
      } catch (e) {
        return res.status(400).json({
          success: false,
          error: 'Invalid URL format'
        });
      }
    }

    const firestore = getFirestore();
    if (!firestore) {
      return res.status(500).json({
        success: false,
        error: 'Database not available'
      });
    }

    const linkRef = firestore.collection('feedback_links').doc(id);
    const linkDoc = await linkRef.get();

    if (!linkDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Feedback link not found'
      });
    }

    // Prepare update data
    const updateData = {
      updatedAt: getAdmin().firestore.FieldValue.serverTimestamp()
    };

    if (title) updateData.title = title.trim();
    if (url) updateData.url = url.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (order !== undefined) updateData.order = order;
    if (isActive !== undefined) updateData.isActive = isActive;

    await linkRef.update(updateData);

    console.log(`✅ Feedback link updated: ${id} by ${req.user.email}`);

    res.json({
      success: true,
      message: 'Feedback link updated successfully',
      link: {
        id,
        ...linkDoc.data(),
        ...updateData
      }
    });

  } catch (error) {
    console.error('Error updating feedback link:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update feedback link'
    });
  }
});

// DELETE /api/feedback-links/:id - Delete feedback link (Admin only)
router.delete('/:id', validateSession, async (req, res) => {
  try {
    // Only admins can delete feedback links
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admins can delete feedback links'
      });
    }

    const { id } = req.params;

    const firestore = getFirestore();
    if (!firestore) {
      return res.status(500).json({
        success: false,
        error: 'Database not available'
      });
    }

    const linkRef = firestore.collection('feedback_links').doc(id);
    const linkDoc = await linkRef.get();

    if (!linkDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Feedback link not found'
      });
    }

    const linkData = linkDoc.data();

    // Delete the link
    await linkRef.delete();

    console.log(`🗑️ Feedback link deleted: ${id} by ${req.user.email}`);

    res.json({
      success: true,
      message: 'Feedback link deleted successfully',
      deletedLink: {
        id,
        title: linkData.title
      }
    });

  } catch (error) {
    console.error('Error deleting feedback link:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete feedback link'
    });
  }
});

module.exports = router;

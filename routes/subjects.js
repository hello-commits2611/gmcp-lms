const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const db = admin.firestore();

// GET /api/attendance/subjects - List subjects with optional filters
router.get('/', async (req, res) => {
  try {
    const { semester, branch, status, type } = req.query;
    
    let query = db.collection('subjects');
    
    // Apply filters
    if (semester) {
      query = query.where('semester', '==', parseInt(semester));
    }
    if (branch) {
      query = query.where('branch', '==', branch);
    }
    if (status) {
      query = query.where('status', '==', status);
    }
    if (type) {
      query = query.where('type', '==', type);
    }
    
    // Get all matching documents
    const snapshot = await query.get();
    const subjects = [];
    
    snapshot.forEach(doc => {
      subjects.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Always sort in-memory to avoid Firestore composite index requirements
    subjects.sort((a, b) => {
      if (a.semester !== b.semester) {
        return a.semester - b.semester;
      }
      return (a.code || '').localeCompare(b.code || '');
    });
    
    res.json({
      success: true,
      subjects,
      count: subjects.length
    });
    
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subjects',
      error: error.message
    });
  }
});

// GET /api/attendance/subjects/:id - Get single subject
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const doc = await db.collection('subjects').doc(id).get();
    
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found'
      });
    }
    
    res.json({
      success: true,
      subject: {
        id: doc.id,
        ...doc.data()
      }
    });
    
  } catch (error) {
    console.error('Error fetching subject:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subject',
      error: error.message
    });
  }
});

// POST /api/attendance/subjects - Create new subject
router.post('/', async (req, res) => {
  try {
    const { code, name, semester, branch, credits, type } = req.body;
    
    // Validation
    if (!code || !name || !semester || !branch || !credits || !type) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: code, name, semester, branch, credits, type'
      });
    }
    
    // Validate type
    const validTypes = ['theory', 'practical', 'lab'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid type. Must be one of: theory, practical, lab'
      });
    }
    
    // Check if subject code already exists
    const existingSubject = await db.collection('subjects')
      .where('code', '==', code)
      .limit(1)
      .get();
    
    if (!existingSubject.empty) {
      return res.status(409).json({
        success: false,
        message: 'Subject code already exists'
      });
    }
    
    // Create subject
    const subjectData = {
      code: code.toUpperCase(),
      name,
      semester: parseInt(semester),
      branch: branch.toUpperCase(),
      credits: parseFloat(credits),
      type,
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await db.collection('subjects').add(subjectData);
    
    res.status(201).json({
      success: true,
      message: 'Subject created successfully',
      subject: {
        id: docRef.id,
        ...subjectData,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    
  } catch (error) {
    console.error('Error creating subject:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create subject',
      error: error.message
    });
  }
});

// PUT /api/attendance/subjects/:id - Update subject
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, semester, branch, credits, type, status } = req.body;
    
    // Check if subject exists
    const subjectDoc = await db.collection('subjects').doc(id).get();
    
    if (!subjectDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found'
      });
    }
    
    // Build update object
    const updateData = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    if (code) {
      // Check if new code conflicts with another subject
      const existingSubject = await db.collection('subjects')
        .where('code', '==', code.toUpperCase())
        .limit(1)
        .get();
      
      if (!existingSubject.empty && existingSubject.docs[0].id !== id) {
        return res.status(409).json({
          success: false,
          message: 'Subject code already exists'
        });
      }
      updateData.code = code.toUpperCase();
    }
    
    if (name) updateData.name = name;
    if (semester) updateData.semester = parseInt(semester);
    if (branch) updateData.branch = branch.toUpperCase();
    if (credits) updateData.credits = parseFloat(credits);
    
    if (type) {
      const validTypes = ['theory', 'practical', 'lab'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid type. Must be one of: theory, practical, lab'
        });
      }
      updateData.type = type;
    }
    
    if (status) {
      const validStatuses = ['active', 'inactive'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status. Must be one of: active, inactive'
        });
      }
      updateData.status = status;
    }
    
    // Update subject
    await db.collection('subjects').doc(id).update(updateData);
    
    // Fetch updated subject
    const updatedDoc = await db.collection('subjects').doc(id).get();
    
    res.json({
      success: true,
      message: 'Subject updated successfully',
      subject: {
        id: updatedDoc.id,
        ...updatedDoc.data()
      }
    });
    
  } catch (error) {
    console.error('Error updating subject:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update subject',
      error: error.message
    });
  }
});

// DELETE /api/attendance/subjects/:id - Delete single subject
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { softDelete } = req.query;
    
    // Check if subject exists
    const subjectDoc = await db.collection('subjects').doc(id).get();
    
    if (!subjectDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found'
      });
    }
    
    // Check if subject is used in lecture sessions
    const lectureCheck = await db.collection('lecture_sessions')
      .where('subjectId', '==', id)
      .limit(1)
      .get();
    
    if (!lectureCheck.empty) {
      return res.status(409).json({
        success: false,
        message: 'Cannot delete subject: it is used in lecture sessions',
        usedInLectures: true
      });
    }
    
    // Soft delete or hard delete
    if (softDelete === 'true') {
      await db.collection('subjects').doc(id).update({
        status: 'inactive',
        deletedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      res.json({
        success: true,
        message: 'Subject marked as inactive',
        softDeleted: true
      });
    } else {
      await db.collection('subjects').doc(id).delete();
      
      res.json({
        success: true,
        message: 'Subject deleted successfully'
      });
    }
    
  } catch (error) {
    console.error('Error deleting subject:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete subject',
      error: error.message
    });
  }
});

// DELETE /api/attendance/subjects/bulk - Delete multiple subjects
router.delete('/bulk/delete', async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request: ids array required'
      });
    }
    
    const results = {
      deleted: [],
      failed: [],
      usedInLectures: []
    };
    
    // Process each subject
    for (const id of ids) {
      try {
        // Check if subject exists
        const subjectDoc = await db.collection('subjects').doc(id).get();
        
        if (!subjectDoc.exists) {
          results.failed.push({
            id,
            reason: 'Subject not found'
          });
          continue;
        }
        
        // Check if subject is used in lecture sessions
        const lectureCheck = await db.collection('lecture_sessions')
          .where('subjectId', '==', id)
          .limit(1)
          .get();
        
        if (!lectureCheck.empty) {
          results.usedInLectures.push({
            id,
            code: subjectDoc.data().code,
            name: subjectDoc.data().name
          });
          continue;
        }
        
        // Delete subject
        await db.collection('subjects').doc(id).delete();
        results.deleted.push({
          id,
          code: subjectDoc.data().code,
          name: subjectDoc.data().name
        });
        
      } catch (error) {
        results.failed.push({
          id,
          reason: error.message
        });
      }
    }
    
    res.json({
      success: true,
      message: `Deleted ${results.deleted.length} subject(s)`,
      results
    });
    
  } catch (error) {
    console.error('Error in bulk delete:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete subjects',
      error: error.message
    });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const FirestoreDAO = require('../utils/firestore-dao');
const admin = require('firebase-admin');

const periodsConfigDAO = new FirestoreDAO('periods_config');

/**
 * GET /api/attendance/config/periods/:year
 * Get period configuration for a specific academic year
 */
router.get('/config/periods/:year', async (req, res) => {
  try {
    const { year } = req.params;
    
    const configs = await periodsConfigDAO.query([
      { field: 'academicYear', operator: '==', value: year }
    ], 1);
    
    if (configs.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'No period configuration found for this academic year' 
      });
    }
    
    res.json({
      success: true,
      config: configs[0]
    });
  } catch (error) {
    console.error('Error fetching period config:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

/**
 * GET /api/attendance/config/periods
 * Get all period configurations
 */
router.get('/config/periods', async (req, res) => {
  try {
    const configs = await periodsConfigDAO.findAll({}, 100, 'academicYear', 'desc');
    
    res.json({
      success: true,
      configs: configs
    });
  } catch (error) {
    console.error('Error fetching period configs:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

/**
 * POST /api/attendance/config/periods
 * Create or update period configuration
 */
router.post('/config/periods', async (req, res) => {
  try {
    const { academicYear, periods } = req.body;
    
    // Validate
    if (!academicYear || !periods || !Array.isArray(periods)) {
      return res.status(400).json({
        success: false,
        error: 'Academic year and periods array are required'
      });
    }
    
    if (periods.length !== 6) {
      return res.status(400).json({
        success: false,
        error: 'Exactly 6 periods are required'
      });
    }
    
    // Validate each period
    for (let i = 0; i < periods.length; i++) {
      const period = periods[i];
      if (!period.startTime || !period.endTime) {
        return res.status(400).json({
          success: false,
          error: `Period ${i + 1} missing start or end time`
        });
      }
    }
    
    // Check if config exists
    const existing = await periodsConfigDAO.query([
      { field: 'academicYear', operator: '==', value: academicYear }
    ], 1);
    
    let result;
    if (existing.length > 0) {
      // Update existing
      result = await periodsConfigDAO.update(existing[0].id, {
        periods: periods,
        updatedBy: req.user?.email || 'system'
      });
    } else {
      // Create new
      result = await periodsConfigDAO.create({
        academicYear: academicYear,
        periods: periods,
        createdBy: req.user?.email || 'system',
        updatedBy: req.user?.email || 'system'
      });
    }
    
    res.json({
      success: true,
      message: existing.length > 0 ? 'Configuration updated' : 'Configuration created',
      config: result
    });
  } catch (error) {
    console.error('Error saving period config:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

/**
 * DELETE /api/attendance/config/periods/:year
 * Delete period configuration for a specific academic year
 */
router.delete('/config/periods/:year', async (req, res) => {
  try {
    const { year } = req.params;
    
    const configs = await periodsConfigDAO.query([
      { field: 'academicYear', operator: '==', value: year }
    ], 1);
    
    if (configs.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Configuration not found'
      });
    }
    
    await periodsConfigDAO.delete(configs[0].id);
    
    res.json({
      success: true,
      message: 'Configuration deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting period config:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

module.exports = router;

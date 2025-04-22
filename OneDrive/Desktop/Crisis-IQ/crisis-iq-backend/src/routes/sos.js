const express = require('express');
const router = express.Router();
const SOS = require('../models/SOS');
const { validateCoordinates, validateObjectId } = require('../utils/validators');
const { ValidationError, NotFoundError } = require('../utils/errors');
const multer = require('multer');
const path = require('path');

// Configure multer for media file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Choose destination based on file type
    const dest = file.mimetype.startsWith('video/') ? 'uploads/video/' : 'uploads/audio/';
    cb(null, dest);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'sos-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept both audio and video files
  if (file.mimetype.startsWith('audio/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type! Please upload an audio or video file.'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Handle multiple file uploads
const mediaUpload = upload.fields([
  { name: 'voice', maxCount: 1 },
  { name: 'video', maxCount: 1 }
]);

/**
 * @route GET /api/sos/recent
 * @desc Get recent SOS requests with pagination
 * @access Public
 */
router.get('/recent', async (req, res) => {
  try {
    const { limit = 10, page = 1 } = req.query;
    const skip = (page - 1) * parseInt(limit);

    const recentSOS = await SOS.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('userId', 'name')
      .populate('assignedTo', 'name')
      .select('-__v');

    const total = await SOS.countDocuments();

    res.json({
      success: true,
      data: recentSOS,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching recent SOS requests:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching recent SOS requests'
    });
  }
});

// Get nearby SOS requests
router.get('/nearby/:radius', async (req, res) => {
  try {
    const { longitude, latitude } = req.query;
    const radius = parseInt(req.params.radius);

    if (!longitude || !latitude) {
      return res.status(400).json({
        success: false,
        error: 'Longitude and latitude are required'
      });
    }

    const sosRequests = await SOS.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: radius
        }
      }
    }).populate('userId', 'name email')
      .populate('assignedTo', 'name email');

    res.json({
      success: true,
      count: sosRequests.length,
      data: sosRequests
    });
  } catch (error) {
    console.error('Error fetching nearby SOS requests:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
});

// Get all SOS requests with optional filtering
router.get('/', async (req, res) => {
  try {
    const { status, priority, type } = req.query;
    const query = {};

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (type) query.type = type;

    const sosRequests = await SOS.find(query)
      .populate('userId', 'name email')
      .populate('assignedTo', 'name email')
      .sort('-createdAt');

    res.json({
      success: true,
      count: sosRequests.length,
      data: sosRequests
    });
  } catch (error) {
    console.error('Error fetching SOS requests:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
});

// Get a single SOS request by ID
router.get('/:id', async (req, res) => {
  try {
    if (!validateObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid SOS ID'
      });
    }

    const sosRequest = await SOS.findById(req.params.id)
      .populate('userId', 'name email')
      .populate('assignedTo', 'name email');

    if (!sosRequest) {
      return res.status(404).json({
        success: false,
        error: 'SOS request not found'
      });
    }

    res.json({
      success: true,
      data: sosRequest
    });
  } catch (error) {
    console.error('Error fetching SOS request:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
});

// Create a new SOS request (with optional voice and video recordings)
router.post('/', mediaUpload, async (req, res) => {
  try {
    const { longitude, latitude, type, description, priority } = req.body;

    // Validate coordinates
    if (!longitude || !latitude) {
      return res.status(400).json({
        success: false,
        error: 'Longitude and latitude are required'
      });
    }

    // Convert string coordinates to numbers
    const lng = parseFloat(longitude);
    const lat = parseFloat(latitude);

    if (isNaN(lng) || isNaN(lat)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid coordinates format'
      });
    }

    const sosData = {
      type,
      description,
      priority,
      userId: req.user?._id,
      location: {
        type: 'Point',
        coordinates: [lng, lat]
      }
    };

    // Handle voice recording
    if (req.files?.voice?.[0]) {
      sosData.voice = {
        recordingUrl: `/uploads/audio/${req.files.voice[0].filename}`,
        uploadedAt: new Date()
      };
    }

    // Handle video recording
    if (req.files?.video?.[0]) {
      sosData.video = {
        recordingUrl: `/uploads/video/${req.files.video[0].filename}`,
        uploadedAt: new Date()
      };
    }

    const sos = new SOS(sosData);
    await sos.save();

    res.status(201).json({
      success: true,
      data: sos
    });
  } catch (error) {
    console.error('Error creating SOS request:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Update SOS request status
router.patch('/:id/status', async (req, res) => {
  try {
    if (!validateObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid SOS ID'
      });
    }

    const { status, note } = req.body;
    const sosRequest = await SOS.findById(req.params.id);

    if (!sosRequest) {
      return res.status(404).json({
        success: false,
        error: 'SOS request not found'
      });
    }

    sosRequest.status = status;
    if (note) {
      sosRequest.statusUpdates.push({
        status,
        note,
        updatedBy: req.user?._id
      });
    }
    await sosRequest.save();

    res.json({
      success: true,
      data: sosRequest
    });
  } catch (error) {
    console.error('Error updating SOS status:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Assign SOS request to a responder
router.patch('/:id/assign', async (req, res, next) => {
  try {
    const { responderId } = req.body;
    const sosRequest = await SOS.findById(req.params.id);

    if (!sosRequest) {
      throw new NotFoundError('SOS request not found');
    }

    sosRequest.assignedTo = responderId;
    await sosRequest.save();

    res.json({
      success: true,
      data: sosRequest
    });
  } catch (error) {
    next(error);
  }
});

// Get SOS statistics
router.get('/stats/overview', async (req, res, next) => {
  try {
    const stats = await SOS.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          inProgress: {
            $sum: { $cond: [{ $eq: ['$status', 'inProgress'] }, 1, 0] }
          },
          resolved: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
          },
          cancelled: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          },
          avgResponseTime: {
            $avg: {
              $subtract: [
                { $arrayElemAt: ['$statusUpdates.timestamp', 1] },
                '$createdAt'
              ]
            }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: stats[0] || {
        total: 0,
        pending: 0,
        inProgress: 0,
        resolved: 0,
        cancelled: 0,
        avgResponseTime: 0
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router; 
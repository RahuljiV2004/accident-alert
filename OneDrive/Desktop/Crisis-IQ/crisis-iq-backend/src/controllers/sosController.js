const SOS = require('../models/SOS');
const { validateCoordinates } = require('../utils/validators');
const { NotFoundError, ValidationError } = require('../utils/errors');

// Create a new SOS request
exports.createSOS = async (req, res) => {
  try {
    const {
      type,
      priority,
      coordinates,
      description,
      peopleCount,
      medicalInfo,
      voice,
    } = req.body;

    if (!validateCoordinates(coordinates)) {
      throw new ValidationError('Invalid coordinates');
    }

    const sos = new SOS({
      userId: req.user._id, // Assuming user is attached by auth middleware
      type,
      priority,
      location: {
        type: 'Point',
        coordinates,
      },
      description,
      peopleCount,
      medicalInfo,
      voice,
    });

    await sos.save();

    // TODO: Notify nearby responders and emergency services
    
    res.status(201).json({
      success: true,
      data: sos,
    });
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      error: error.message,
    });
  }
};

// Get all SOS requests with filtering and pagination
exports.getAllSOS = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      type,
      priority,
      coordinates,
      radius, // in meters
    } = req.query;

    let query = {};

    // Apply filters
    if (status) query.status = status;
    if (type) query.type = type;
    if (priority) query.priority = priority;

    // Apply geospatial query if coordinates and radius provided
    if (coordinates && radius) {
      const [longitude, latitude] = coordinates.split(',').map(Number);
      query.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
          $maxDistance: parseInt(radius),
        },
      };
    }

    const sosRequests = await SOS.find(query)
      .populate('userId', 'name email')
      .populate('assignedTo', 'name email')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort('-createdAt');

    const total = await SOS.countDocuments(query);

    res.json({
      success: true,
      data: sosRequests,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      error: error.message,
    });
  }
};

// Get a single SOS request by ID
exports.getSOSById = async (req, res) => {
  try {
    const sos = await SOS.findById(req.params.id)
      .populate('userId', 'name email')
      .populate('assignedTo', 'name email');

    if (!sos) {
      throw new NotFoundError('SOS request not found');
    }

    res.json({
      success: true,
      data: sos,
    });
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      error: error.message,
    });
  }
};

// Update SOS request status
exports.updateSOSStatus = async (req, res) => {
  try {
    const { status, note } = req.body;
    const sos = await SOS.findById(req.params.id);

    if (!sos) {
      throw new NotFoundError('SOS request not found');
    }

    await sos.updateStatus(status, note, req.user._id);

    // TODO: Send notifications based on status change

    res.json({
      success: true,
      data: sos,
    });
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      error: error.message,
    });
  }
};

// Assign SOS request to a responder
exports.assignSOS = async (req, res) => {
  try {
    const { responderId } = req.body;
    const sos = await SOS.findById(req.params.id);

    if (!sos) {
      throw new NotFoundError('SOS request not found');
    }

    await sos.assign(responderId);

    // TODO: Send notification to assigned responder

    res.json({
      success: true,
      data: sos,
    });
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      error: error.message,
    });
  }
};

// Get nearby SOS requests
exports.getNearbySOSRequests = async (req, res) => {
  try {
    const { coordinates, maxDistance = 5000 } = req.query; // maxDistance in meters
    const [longitude, latitude] = coordinates.split(',').map(Number);

    if (!validateCoordinates([longitude, latitude])) {
      throw new ValidationError('Invalid coordinates');
    }

    const sosRequests = await SOS.findNearby([longitude, latitude], maxDistance)
      .populate('userId', 'name email')
      .populate('assignedTo', 'name email');

    res.json({
      success: true,
      data: sosRequests,
    });
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      error: error.message,
    });
  }
};

// Get SOS statistics
exports.getSOSStatistics = async (req, res) => {
  try {
    const stats = await SOS.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
          },
          inProgress: {
            $sum: { $cond: [{ $eq: ['$status', 'inProgress'] }, 1, 0] },
          },
          resolved: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] },
          },
          cancelled: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] },
          },
          avgResponseTime: {
            $avg: {
              $subtract: [
                { $arrayElemAt: ['$statusUpdates.timestamp', 1] },
                '$createdAt',
              ],
            },
          },
        },
      },
    ]);

    res.json({
      success: true,
      data: stats[0] || {
        total: 0,
        pending: 0,
        inProgress: 0,
        resolved: 0,
        cancelled: 0,
        avgResponseTime: 0,
      },
    });
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      error: error.message,
    });
  }
}; 
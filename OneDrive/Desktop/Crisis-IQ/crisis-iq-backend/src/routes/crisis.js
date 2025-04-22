const express = require('express');
const router = express.Router();
const Crisis = require('../models/Crisis');
const { validateCoordinates } = require('../utils/validators');
const { ValidationError, NotFoundError } = require('../utils/errors');

// Get all crises with optional filtering
router.get('/', async (req, res, next) => {
  try {
    const { type, severity, status } = req.query;
    const query = {};

    if (type) query.type = type;
    if (severity) query.severity = severity;
    if (status) query.status = status;

    const crises = await Crisis.find(query)
      .populate('reportedBy', 'name email')
      .sort('-createdAt');

    res.json({
      success: true,
      count: crises.length,
      data: crises
    });
  } catch (error) {
    next(error);
  }
});

// Get a single crisis by ID
router.get('/:id', async (req, res, next) => {
  try {
    const crisis = await Crisis.findById(req.params.id)
      .populate('reportedBy', 'name email');

    if (!crisis) {
      throw new NotFoundError('Crisis not found');
    }

    res.json({
      success: true,
      data: crisis
    });
  } catch (error) {
    next(error);
  }
});

// Create a new crisis
router.post('/', async (req, res, next) => {
  try {
    const { type, severity, location, description, affectedArea } = req.body;

    if (!validateCoordinates(location.coordinates)) {
      throw new ValidationError('Invalid coordinates');
    }

    const crisis = await Crisis.create({
      type,
      severity,
      location,
      description,
      affectedArea,
      reportedBy: req.user._id // Assuming user is attached by auth middleware
    });

    res.status(201).json({
      success: true,
      data: crisis
    });
  } catch (error) {
    next(error);
  }
});

// Update a crisis
router.put('/:id', async (req, res, next) => {
  try {
    const { type, severity, location, description, status, affectedArea } = req.body;

    if (location && !validateCoordinates(location.coordinates)) {
      throw new ValidationError('Invalid coordinates');
    }

    const crisis = await Crisis.findByIdAndUpdate(
      req.params.id,
      { type, severity, location, description, status, affectedArea },
      { new: true, runValidators: true }
    );

    if (!crisis) {
      throw new NotFoundError('Crisis not found');
    }

    res.json({
      success: true,
      data: crisis
    });
  } catch (error) {
    next(error);
  }
});

// Delete a crisis
router.delete('/:id', async (req, res, next) => {
  try {
    const crisis = await Crisis.findByIdAndDelete(req.params.id);

    if (!crisis) {
      throw new NotFoundError('Crisis not found');
    }

    res.json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
});

// Get nearby crises
router.get('/nearby/:radius', async (req, res, next) => {
  try {
    const { longitude, latitude } = req.query;
    const radius = parseInt(req.params.radius);

    if (!validateCoordinates([parseFloat(longitude), parseFloat(latitude)])) {
      throw new ValidationError('Invalid coordinates');
    }

    const crises = await Crisis.findNearby(
      [parseFloat(longitude), parseFloat(latitude)],
      radius
    );

    res.json({
      success: true,
      count: crises.length,
      data: crises
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router; 
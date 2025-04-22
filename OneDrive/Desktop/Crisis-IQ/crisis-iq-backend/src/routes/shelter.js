const express = require('express');
const router = express.Router();
const Shelter = require('../models/Shelter');
const { validateCoordinates } = require('../utils/validators');
const { ValidationError, NotFoundError } = require('../utils/errors');

// Get all shelters with optional filtering
router.get('/', async (req, res, next) => {
  try {
    const { status, type, hasMedical } = req.query;
    const query = {};

    if (status) query.status = status;
    if (type) query.type = type;
    if (hasMedical) query.hasMedical = hasMedical === 'true';

    const shelters = await Shelter.find(query)
      .populate('manager', 'name email')
      .sort('-createdAt');

    res.json({
      success: true,
      count: shelters.length,
      data: shelters
    });
  } catch (error) {
    next(error);
  }
});

// Get a single shelter by ID
router.get('/:id', async (req, res, next) => {
  try {
    const shelter = await Shelter.findById(req.params.id)
      .populate('manager', 'name email');

    if (!shelter) {
      throw new NotFoundError('Shelter not found');
    }

    res.json({
      success: true,
      data: shelter
    });
  } catch (error) {
    next(error);
  }
});

// Create a new shelter
router.post('/', async (req, res, next) => {
  try {
    const {
      name,
      type,
      location,
      capacity,
      currentOccupancy,
      hasMedical,
      facilities,
      contactInfo
    } = req.body;

    if (!validateCoordinates(location.coordinates)) {
      throw new ValidationError('Invalid coordinates');
    }

    const shelter = await Shelter.create({
      name,
      type,
      location,
      capacity,
      currentOccupancy,
      hasMedical,
      facilities,
      contactInfo,
      manager: req.user._id // Assuming user is attached by auth middleware
    });

    res.status(201).json({
      success: true,
      data: shelter
    });
  } catch (error) {
    next(error);
  }
});

// Update a shelter
router.put('/:id', async (req, res, next) => {
  try {
    const {
      name,
      type,
      location,
      capacity,
      currentOccupancy,
      hasMedical,
      facilities,
      contactInfo,
      status
    } = req.body;

    if (location && !validateCoordinates(location.coordinates)) {
      throw new ValidationError('Invalid coordinates');
    }

    const shelter = await Shelter.findByIdAndUpdate(
      req.params.id,
      {
        name,
        type,
        location,
        capacity,
        currentOccupancy,
        hasMedical,
        facilities,
        contactInfo,
        status
      },
      { new: true, runValidators: true }
    );

    if (!shelter) {
      throw new NotFoundError('Shelter not found');
    }

    res.json({
      success: true,
      data: shelter
    });
  } catch (error) {
    next(error);
  }
});

// Update shelter occupancy
router.patch('/:id/occupancy', async (req, res, next) => {
  try {
    const { currentOccupancy } = req.body;
    const shelter = await Shelter.findById(req.params.id);

    if (!shelter) {
      throw new NotFoundError('Shelter not found');
    }

    shelter.currentOccupancy = currentOccupancy;
    await shelter.save();

    res.json({
      success: true,
      data: shelter
    });
  } catch (error) {
    next(error);
  }
});

// Get nearby shelters
router.get('/nearby/:radius', async (req, res, next) => {
  try {
    const { longitude, latitude } = req.query;
    const radius = parseInt(req.params.radius);

    if (!validateCoordinates([parseFloat(longitude), parseFloat(latitude)])) {
      throw new ValidationError('Invalid coordinates');
    }

    const shelters = await Shelter.findNearby(
      [parseFloat(longitude), parseFloat(latitude)],
      radius
    );

    res.json({
      success: true,
      count: shelters.length,
      data: shelters
    });
  } catch (error) {
    next(error);
  }
});

// Get shelter statistics
router.get('/stats/overview', async (req, res, next) => {
  try {
    const stats = await Shelter.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          totalCapacity: { $sum: '$capacity' },
          totalOccupancy: { $sum: '$currentOccupancy' },
          availableSpaces: {
            $sum: { $subtract: ['$capacity', '$currentOccupancy'] }
          },
          withMedical: {
            $sum: { $cond: ['$hasMedical', 1, 0] }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: stats[0] || {
        total: 0,
        totalCapacity: 0,
        totalOccupancy: 0,
        availableSpaces: 0,
        withMedical: 0
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router; 
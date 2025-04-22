const express = require('express');
const router = express.Router();
const Team = require('../models/Team');
const auth = require('../middleware/auth');
const { validateObjectId } = require('../utils/validators');

// Get all teams
router.get('/', auth, async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};
    
    if (status) {
      query.status = status;
    }

    const teams = await Team.find(query)
      .populate('members', 'name email')
      .populate('currentAssignment', 'type priority status')
      .sort('-createdAt');

    res.json({
      success: true,
      data: teams
    });
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
});

// Get a single team
router.get('/:id', auth, async (req, res) => {
  try {
    if (!validateObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid team ID'
      });
    }

    const team = await Team.findById(req.params.id)
      .populate('members', 'name email')
      .populate('currentAssignment', 'type priority status');

    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Team not found'
      });
    }

    res.json({
      success: true,
      data: team
    });
  } catch (error) {
    console.error('Error fetching team:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
});

// Create a new team
router.post('/', auth, async (req, res) => {
  try {
    const { name, members, vehicle, location } = req.body;

    const team = new Team({
      name,
      members,
      vehicle,
      location: {
        type: 'Point',
        coordinates: location
      }
    });

    await team.save();

    res.status(201).json({
      success: true,
      data: team
    });
  } catch (error) {
    console.error('Error creating team:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Update team status
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!validateObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid team ID'
      });
    }

    const team = await Team.findById(req.params.id);
    
    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Team not found'
      });
    }

    team.status = status;
    await team.save();

    res.json({
      success: true,
      data: team
    });
  } catch (error) {
    console.error('Error updating team status:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Update team location
router.patch('/:id/location', auth, async (req, res) => {
  try {
    const { coordinates } = req.body;
    
    if (!validateObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid team ID'
      });
    }

    const team = await Team.findById(req.params.id);
    
    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Team not found'
      });
    }

    team.location.coordinates = coordinates;
    await team.save();

    res.json({
      success: true,
      data: team
    });
  } catch (error) {
    console.error('Error updating team location:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router; 
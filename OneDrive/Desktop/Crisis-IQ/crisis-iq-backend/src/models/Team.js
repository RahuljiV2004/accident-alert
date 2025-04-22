const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['available', 'busy', 'offline'],
    default: 'available'
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  vehicle: {
    type: String,
    trim: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  currentAssignment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SOS'
  }
}, {
  timestamps: true
});

// Index for geospatial queries
teamSchema.index({ location: '2dsphere' });

const Team = mongoose.model('Team', teamSchema);

module.exports = Team; 
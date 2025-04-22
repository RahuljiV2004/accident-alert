const mongoose = require('mongoose');

const sosSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Make it optional for now
  },
  type: {
    type: String,
    required: [true, 'SOS type is required'],
    enum: ['medical', 'rescue', 'fire', 'security', 'food', 'shelter', 'other'],
    default: 'other'
  },
  priority: {
    type: String,
    required: [true, 'Priority is required'],
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: [true, 'Coordinates are required'],
      validate: {
        validator: function(v) {
          return v.length === 2 && 
                 v[0] >= -180 && v[0] <= 180 && 
                 v[1] >= -90 && v[1] <= 90;
        },
        message: 'Invalid coordinates'
      }
    }
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [1000, 'Description cannot be more than 1000 characters']
  },
  status: {
    type: String,
    required: [true, 'Status is required'],
    enum: ['pending', 'inProgress', 'resolved', 'cancelled'],
    default: 'pending'
  },
  peopleCount: {
    type: Number,
    required: [true, 'People count is required'],
    min: [1, 'People count must be at least 1'],
    default: 1
  },
  medicalInfo: {
    hasInjuries: {
      type: Boolean,
      default: false
    },
    injuryDescription: String,
    requiresMedical: {
      type: Boolean,
      default: false
    },
    medicalConditions: [String]
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  statusUpdates: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'inProgress', 'resolved', 'cancelled']
    },
    note: String,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  voice: {
    recordingUrl: String,
    transcript: String,
    uploadedAt: Date
  },
  video: {
    recordingUrl: String,
    uploadedAt: Date
  }
}, {
  timestamps: true
});

// Create a 2dsphere index for geospatial queries
sosSchema.index({ location: '2dsphere' });

// Add methods for common operations
sosSchema.methods.updateStatus = async function(status, note, updatedBy) {
  this.status = status;
  this.statusUpdates.push({
    status,
    note,
    updatedBy
  });
  return this.save();
};

sosSchema.methods.assign = async function(responderId) {
  this.assignedTo = responderId;
  return this.save();
};

// Static method to find nearby SOS requests
sosSchema.statics.findNearby = function(coordinates, maxDistance) {
  return this.find({
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates
        },
        $maxDistance: maxDistance
      }
    }
  }).populate('userId', 'name email')
    .populate('assignedTo', 'name email');
};

sosSchema.statics.findPendingByPriority = function(priority) {
  return this.find({
    status: 'pending',
    priority
  }).sort({ createdAt: 1 });
};

const SOS = mongoose.model('SOS', sosSchema);

module.exports = SOS; 
const mongoose = require('mongoose');

const crisisSchema = new mongoose.Schema({
  type: {
    type: String,
    required: [true, 'Crisis type is required'],
    enum: ['natural', 'medical', 'fire', 'security', 'other'],
    default: 'other'
  },
  severity: {
    type: String,
    required: [true, 'Crisis severity is required'],
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
    enum: ['active', 'resolved', 'archived'],
    default: 'active'
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Reporter is required']
  },
  affectedArea: {
    radius: {
      type: Number,
      required: [true, 'Affected area radius is required'],
      min: [0, 'Radius cannot be negative']
    },
    unit: {
      type: String,
      enum: ['meters', 'kilometers'],
      default: 'meters'
    }
  },
  media: [{
    type: {
      type: String,
      enum: ['image', 'video']
    },
    url: String,
    caption: String
  }],
  updates: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    content: String,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }]
}, {
  timestamps: true
});

// Create a 2dsphere index for geospatial queries
crisisSchema.index({ location: '2dsphere' });

// Add instance methods
crisisSchema.methods.isActive = function() {
  return this.status === 'active';
};

crisisSchema.methods.resolve = function() {
  this.status = 'resolved';
  return this.save();
};

// Add static methods
crisisSchema.statics.findNearby = function(coordinates, maxDistance) {
  return this.find({
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: coordinates
        },
        $maxDistance: maxDistance
      }
    },
    status: 'active'
  });
};

const Crisis = mongoose.model('Crisis', crisisSchema);

module.exports = Crisis; 
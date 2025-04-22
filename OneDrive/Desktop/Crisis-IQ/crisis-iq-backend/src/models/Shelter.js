const mongoose = require('mongoose');

const shelterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Shelter name is required'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  type: {
    type: String,
    required: [true, 'Shelter type is required'],
    enum: ['emergency', 'temporary', 'permanent', 'medical', 'other'],
    default: 'temporary'
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
  capacity: {
    type: Number,
    required: [true, 'Capacity is required'],
    min: [1, 'Capacity must be at least 1']
  },
  currentOccupancy: {
    type: Number,
    required: [true, 'Current occupancy is required'],
    min: [0, 'Current occupancy cannot be negative'],
    validate: {
      validator: function(v) {
        return v <= this.capacity;
      },
      message: 'Current occupancy cannot exceed capacity'
    }
  },
  hasMedical: {
    type: Boolean,
    default: false
  },
  facilities: [{
    type: String,
    enum: ['beds', 'food', 'water', 'electricity', 'internet', 'medical', 'other']
  }],
  contactInfo: {
    phone: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
    },
    address: {
      type: String,
      trim: true
    }
  },
  status: {
    type: String,
    enum: ['active', 'full', 'closed', 'maintenance'],
    default: 'active'
  },
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Shelter manager is required']
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot be more than 1000 characters']
  }
}, {
  timestamps: true
});

// Create a 2dsphere index for geospatial queries
shelterSchema.index({ location: '2dsphere' });

// Add instance methods
shelterSchema.methods.isAvailable = function() {
  return this.status === 'active' && this.currentOccupancy < this.capacity;
};

shelterSchema.methods.getAvailableSpaces = function() {
  return this.capacity - this.currentOccupancy;
};

// Add static methods
shelterSchema.statics.findNearby = function(coordinates, maxDistance) {
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

shelterSchema.statics.findAvailable = function() {
  return this.find({
    status: 'active',
    currentOccupancy: { $lt: mongoose.model('Shelter').schema.path('capacity') }
  });
};

const Shelter = mongoose.model('Shelter', shelterSchema);

module.exports = Shelter; 
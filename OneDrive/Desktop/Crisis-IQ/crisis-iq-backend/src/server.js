const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const crisisRoutes = require('./routes/crisis');
const sosRoutes = require('./routes/sos');
const shelterRoutes = require('./routes/shelter');
const userRoutes = require('./routes/user');
const { errorHandler } = require('./middleware/errorHandler');
const { setupSocketHandlers } = require('./utils/socket');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000'||'http://localhost:3001',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000'||'http://localhost:3001',
  credentials: true,
}));
app.use(helmet());
app.use(morgan('dev'));

// Routes
app.use('/api/crisis', crisisRoutes);
app.use('/api/sos', sosRoutes);
app.use('/api/shelter', shelterRoutes);
app.use('/api/users', userRoutes);

// Socket.IO setup
setupSocketHandlers(io);

// Error handling
app.use(errorHandler);

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crisis-iq')
  .then(() => {
    console.log('Connected to MongoDB');
    const PORT = process.env.PORT || 5000;
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }); 
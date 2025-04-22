const setupSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Join crisis updates room
    socket.on('joinCrisisRoom', (crisisId) => {
      socket.join(`crisis:${crisisId}`);
    });

    // Leave crisis updates room
    socket.on('leaveCrisisRoom', (crisisId) => {
      socket.leave(`crisis:${crisisId}`);
    });

    // Handle new crisis report
    socket.on('newCrisis', (crisis) => {
      io.emit('crisisUpdate', crisis);
    });

    // Handle SOS request
    socket.on('newSOS', (sos) => {
      io.emit('sosRequest', sos);
    });

    // Handle SOS status update
    socket.on('updateSOSStatus', (update) => {
      io.emit('sosStatusUpdate', update);
    });

    // Handle shelter capacity update
    socket.on('updateShelterCapacity', (update) => {
      io.emit('shelterCapacityUpdate', update);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
};

module.exports = {
  setupSocketHandlers,
}; 
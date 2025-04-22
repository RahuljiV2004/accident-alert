import { Server, Socket } from 'socket.io';

interface CrisisUpdate {
  id: string;
  type: string;
  severity: string;
  location: {
    latitude: number;
    longitude: number;
  };
  description: string;
}

interface SOSRequest {
  id: string;
  userId: string;
  type: string;
  location: {
    latitude: number;
    longitude: number;
  };
  description: string;
  status: 'pending' | 'inProgress' | 'resolved';
}

export const setupSocketHandlers = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log('Client connected:', socket.id);

    // Join crisis updates room
    socket.on('joinCrisisRoom', (crisisId: string) => {
      socket.join(`crisis:${crisisId}`);
    });

    // Leave crisis updates room
    socket.on('leaveCrisisRoom', (crisisId: string) => {
      socket.leave(`crisis:${crisisId}`);
    });

    // Handle new crisis report
    socket.on('newCrisis', (crisis: CrisisUpdate) => {
      io.emit('crisisUpdate', crisis);
    });

    // Handle SOS request
    socket.on('newSOS', (sos: SOSRequest) => {
      io.emit('sosRequest', sos);
    });

    // Handle SOS status update
    socket.on('updateSOSStatus', (update: { id: string; status: SOSRequest['status'] }) => {
      io.emit('sosStatusUpdate', update);
    });

    // Handle shelter capacity update
    socket.on('updateShelterCapacity', (update: { id: string; currentCapacity: number }) => {
      io.emit('shelterCapacityUpdate', update);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
}; 
import { io } from 'socket.io-client';

let socket = null;

export const initSocket = (token) => {
  if (!socket && token) {
    socket = io('http://localhost:5000', {
      transports: ['websocket'],
      autoConnect: true,
      auth: {
        token
      }
    });

    socket.on('connect', () => {
      console.log('✅ Connected to server');
    });

    socket.on('disconnect', () => {
      console.log('❌ Disconnected from server');
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error.message);
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error.message);
    });
  }
  return socket;
};

export const getSocket = () => {
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

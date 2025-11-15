const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const Room = require('./models/Room');
const Message = require('./models/Message');
const User = require('./models/User');
const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/rooms');

const app = express();
const server = http.createServer(app);

// Optimized Socket.io for Vercel
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['polling'],
  allowUpgrades: false,
  pingTimeout: 30000,
  pingInterval: 10000,
  upgradeTimeout: 10000,
  maxHttpBufferSize: 1e6,
  connectTimeout: 20000
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);

// MongoDB Connection with Vercel optimization
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chatapp';

const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 60000,
      maxPoolSize: 10,
      minPoolSize: 2,
    });
    console.log('✅ MongoDB Connected');
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err);
    // Retry connection after 5 seconds
    setTimeout(connectDB, 5000);
  }
};

connectDB();

// Store online users per room
const onlineUsers = {};

// Messages API
app.get('/api/messages/:room', async (req, res) => {
  try {
    const messages = await Message.find({ room: req.params.room })
      .sort({ timestamp: 1 })
      .limit(100);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Socket.io Authentication Middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return next(new Error('User not found'));
    }

    socket.userId = user._id;
    socket.username = user.username;
    
    // Update user online status
    user.isOnline = true;
    await user.save();
    
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
});

// Socket.io Events
io.on('connection', (socket) => {
  console.log('🔌 New client connected:', socket.id, socket.username);

  // Join Room
  socket.on('joinRoom', async ({ room }) => {
    try {
      const roomDoc = await Room.findOne({ name: room });
      
      if (!roomDoc) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      // Check if user is a member
      const isMember = roomDoc.members.some(m => m.userId.toString() === socket.userId.toString());
      
      if (!isMember) {
        // Check if it's a public room and approval not required
        if (!roomDoc.isPrivate && !roomDoc.settings.requireApproval) {
          // Auto-add to members
          roomDoc.members.push({
            userId: socket.userId,
            username: socket.username,
            role: 'member'
          });
          await roomDoc.save();
        } else {
          socket.emit('error', { message: 'Welcome' });
          return;
        }
      }

      // Check if banned
      if (roomDoc.bannedUsers.includes(socket.userId)) {
        socket.emit('error', { message: 'You are banned from this room' });
        return;
      }

      socket.join(room);
      socket.room = room;

      // Track online users
      if (!onlineUsers[room]) {
        onlineUsers[room] = [];
      }
      if (!onlineUsers[room].find(u => u.username === socket.username)) {
        onlineUsers[room].push({ 
          username: socket.username, 
          socketId: socket.id,
          userId: socket.userId 
        });
      }

      // Broadcast online users to room
      io.to(room).emit('onlineUsers', onlineUsers[room].map(u => u.username));

      // Send join message
      const joinMessage = {
        username: 'System',
        message: `${socket.username} joined the room`,
        timestamp: new Date(),
        room
      };
      io.to(room).emit('message', joinMessage);

      console.log(`👤 ${socket.username} joined room: ${room}`);
    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  // Chat Message
  socket.on('chatMessage', async ({ message, room }) => {
    try {
      // Verify user is a member of the room
      const roomDoc = await Room.findOne({ name: room });
      
      if (!roomDoc) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      const isMember = roomDoc.members.some(m => m.userId.toString() === socket.userId.toString());
      
      if (!isMember) {
        socket.emit('error', { message: 'You are not authorized to send messages in this room' });
        return;
      }

      // Check if banned
      if (roomDoc.bannedUsers.includes(socket.userId)) {
        socket.emit('error', { message: 'You are banned from this room' });
        return;
      }

      // Save to database
      const newMessage = new Message({ 
        username: socket.username, 
        message, 
        room 
      });
      await newMessage.save();

      // Broadcast to room
      io.to(room).emit('message', {
        username: socket.username,
        message,
        timestamp: newMessage.timestamp,
        room
      });

      console.log(`💬 ${socket.username} in ${room}: ${message}`);
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Typing Indicator
  socket.on('typing', ({ room, isTyping }) => {
    socket.to(room).emit('userTyping', { username: socket.username, isTyping });
  });

  // Join request approved
  socket.on('joinRequestApproved', ({ roomId, roomName, userId, username }) => {
    io.emit('joinRequestApproved', { roomId, roomName, userId, username });
  });

  // Join request rejected
  socket.on('joinRequestRejected', ({ roomId, userId, username }) => {
    io.emit('joinRequestRejected', { roomId, userId, username });
  });

  // Disconnect
  socket.on('disconnect', async () => {
    const { username, room } = socket;
    
    // Update user offline status
    try {
      await User.findByIdAndUpdate(socket.userId, {
        isOnline: false,
        lastSeen: new Date()
      });
    } catch (error) {
      console.error('Error updating user status:', error);
    }
    
    if (room && onlineUsers[room]) {
      onlineUsers[room] = onlineUsers[room].filter(u => u.socketId !== socket.id);
      
      // Broadcast updated online users
      io.to(room).emit('onlineUsers', onlineUsers[room].map(u => u.username));

      // Send leave message
      if (username) {
        const leaveMessage = {
          username: 'System',
          message: `${username} left the room`,
          timestamp: new Date(),
          room
        };
        io.to(room).emit('message', leaveMessage);
      }
    }

    console.log('🔌 Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

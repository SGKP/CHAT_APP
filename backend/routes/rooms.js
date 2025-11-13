const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Get all rooms for user
router.get('/', auth, async (req, res) => {
  try {
    const rooms = await Room.find({
      $or: [
        { 'members.userId': req.userId },
        { isPrivate: false }
      ]
    }).populate('admin', 'username avatar')
      .sort({ createdAt: -1 });
    
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create room
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, isPrivate } = req.body;
    
    const room = new Room({
      name,
      description,
      isPrivate: isPrivate || false,
      admin: req.userId,
      createdBy: req.user.username,
      members: [{
        userId: req.userId,
        username: req.user.username,
        role: 'admin'
      }]
    });

    await room.save();
    await room.populate('admin', 'username avatar');
    
    res.status(201).json(room);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Join room (for public rooms or with invite code)
router.post('/:roomId/join', auth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { inviteCode } = req.body;
    
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Check if already a member
    if (room.members.some(m => m.userId.toString() === req.userId.toString())) {
      return res.status(400).json({ error: 'Already a member' });
    }

    // Check if banned
    if (room.bannedUsers.includes(req.userId)) {
      return res.status(403).json({ error: 'You are banned from this room' });
    }

    // Check if private room with invite code
    if (room.isPrivate) {
      if (!inviteCode || inviteCode !== room.inviteCode) {
        return res.status(403).json({ error: 'Invalid invite code' });
      }
    }

    // If room requires approval, add to pending requests
    if (room.settings.requireApproval && !inviteCode) {
      const alreadyRequested = room.pendingRequests.some(
        r => r.userId.toString() === req.userId.toString()
      );
      
      if (alreadyRequested) {
        return res.status(400).json({ error: 'Join request already pending' });
      }

      room.pendingRequests.push({
        userId: req.userId,
        username: req.user.username
      });
      await room.save();
      
      return res.json({ 
        message: 'Join request sent, awaiting admin approval',
        requiresApproval: true,
        roomId: room._id
      });
    }

    // Direct join
    room.members.push({
      userId: req.userId,
      username: req.user.username,
      role: 'member'
    });
    await room.save();

    res.json({ message: 'Joined room successfully', room });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get pending requests for a room (admin/moderator only)
router.get('/:roomId/pending', auth, async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const room = await Room.findById(roomId)
      .populate('pendingRequests.userId', 'username avatar email');
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Check if user is admin or moderator
    const member = room.members.find(m => m.userId.toString() === req.userId.toString());
    if (!member || !['admin', 'moderator'].includes(member.role)) {
      return res.status(403).json({ error: 'Only admins/moderators can view pending requests' });
    }

    res.json(room.pendingRequests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Approve join request (admin only)
router.post('/:roomId/approve/:userId', auth, async (req, res) => {
  try {
    const { roomId, userId } = req.params;
    
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Check if user is admin or moderator
    const member = room.members.find(m => m.userId.toString() === req.userId.toString());
    if (!member || !['admin', 'moderator'].includes(member.role)) {
      return res.status(403).json({ error: 'Only admins/moderators can approve requests' });
    }

    // Find pending request
    const requestIndex = room.pendingRequests.findIndex(
      r => r.userId.toString() === userId
    );
    
    if (requestIndex === -1) {
      return res.status(404).json({ error: 'No pending request found' });
    }

    const request = room.pendingRequests[requestIndex];
    
    // Add to members
    room.members.push({
      userId: request.userId,
      username: request.username,
      role: 'member'
    });

    // Remove from pending
    room.pendingRequests.splice(requestIndex, 1);
    await room.save();

    res.json({ message: 'User approved and added to room', username: request.username });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reject join request (admin only)
router.post('/:roomId/reject/:userId', auth, async (req, res) => {
  try {
    const { roomId, userId } = req.params;
    
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Check if user is admin or moderator
    const member = room.members.find(m => m.userId.toString() === req.userId.toString());
    if (!member || !['admin', 'moderator'].includes(member.role)) {
      return res.status(403).json({ error: 'Only admins/moderators can reject requests' });
    }

    // Find and get username before removing
    const request = room.pendingRequests.find(r => r.userId.toString() === userId);
    const username = request ? request.username : 'User';

    // Remove from pending requests
    room.pendingRequests = room.pendingRequests.filter(
      r => r.userId.toString() !== userId
    );
    await room.save();

    res.json({ message: 'Join request rejected', username });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove member (admin only)
router.delete('/:roomId/members/:userId', auth, async (req, res) => {
  try {
    const { roomId, userId } = req.params;
    
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Check if user is admin OR user is leaving themselves
    const isAdmin = room.admin.toString() === req.userId.toString();
    const isSelf = userId === req.userId.toString();

    if (!isAdmin && !isSelf) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Can't remove admin (unless they're leaving)
    if (userId === room.admin.toString() && !isSelf) {
      return res.status(400).json({ error: 'Cannot remove admin. Transfer admin rights first.' });
    }

    // If admin is leaving, need to transfer admin or delete room
    if (isSelf && isAdmin) {
      if (room.members.length === 1) {
        // Last member, delete room
        await Room.findByIdAndDelete(roomId);
        return res.json({ message: 'Room deleted as last member left' });
      } else {
        return res.status(400).json({ error: 'Transfer admin rights before leaving' });
      }
    }

    // Remove member
    room.members = room.members.filter(m => m.userId.toString() !== userId);
    await room.save();

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Ban user (admin only)
router.post('/:roomId/ban/:userId', auth, async (req, res) => {
  try {
    const { roomId, userId } = req.params;
    
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Check if user is admin
    if (room.admin.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Only admin can ban users' });
    }

    // Remove from members if present
    room.members = room.members.filter(m => m.userId.toString() !== userId);
    
    // Add to banned list
    if (!room.bannedUsers.includes(userId)) {
      room.bannedUsers.push(userId);
    }
    
    await room.save();

    res.json({ message: 'User banned successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get room details
router.get('/:roomId', auth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId)
      .populate('admin', 'username avatar')
      .populate('members.userId', 'username avatar isOnline lastSeen')
      .populate('pendingRequests.userId', 'username avatar');
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json(room);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update room details (admin only)
router.patch('/:roomId', auth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { name, description } = req.body;
    
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Check if user is admin
    if (room.admin.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Only admin can update room details' });
    }

    if (name) room.name = name;
    if (description !== undefined) room.description = description;

    await room.save();
    await room.populate('admin', 'username avatar');

    res.json({ message: 'Room updated successfully', room });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Transfer admin rights (admin only)
router.patch('/:roomId/transfer-admin', auth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { newAdminId } = req.body;
    
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Check if user is current admin
    if (room.admin.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Only admin can transfer admin rights' });
    }

    // Check if new admin is a member
    const newAdminMember = room.members.find(m => m.userId.toString() === newAdminId);
    if (!newAdminMember) {
      return res.status(400).json({ error: 'New admin must be a member of the room' });
    }

    // Update admin
    room.admin = newAdminId;
    
    // Update roles
    room.members = room.members.map(member => {
      if (member.userId.toString() === newAdminId) {
        return { ...member.toObject(), role: 'admin' };
      } else if (member.userId.toString() === req.userId.toString()) {
        return { ...member.toObject(), role: 'member' };
      }
      return member;
    });

    await room.save();
    await room.populate('admin', 'username avatar');

    res.json({ message: 'Admin rights transferred successfully', room });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

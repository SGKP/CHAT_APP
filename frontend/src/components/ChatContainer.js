import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../socket';
import Sidebar from './Sidebar';
import ChatRoom from './ChatRoom';
import OnlineUsers from './OnlineUsers';
import JoinRequestsPanel from './JoinRequestsPanel';
import BrowseRoomsModal from './BrowseRoomsModal';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function ChatContainer({ user, onLogout }) {
  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [currentRoomData, setCurrentRoomData] = useState(null);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showBrowseRooms, setShowBrowseRooms] = useState(false);
  const [showJoinRequests, setShowJoinRequests] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const { token } = useAuth();
  const socket = getSocket();

  useEffect(() => {
    if (token) {
      loadRooms();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (currentRoom) {
      loadCurrentRoomData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRoom]);

  useEffect(() => {
    // Listen for join request notifications
    if (socket) {
      socket.on('newJoinRequest', (data) => {
        if (currentRoomData && data.roomId === currentRoomData._id) {
          loadCurrentRoomData();
        }
      });

      socket.on('joinRequestApproved', () => {
        loadRooms();
      });
    }

    return () => {
      if (socket) {
        socket.off('newJoinRequest');
        socket.off('joinRequestApproved');
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, currentRoomData]);

  const loadRooms = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/rooms`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRooms(response.data);
      
      // Auto-join first room if no room selected
      if (!currentRoom && response.data.length > 0) {
        setCurrentRoom(response.data[0].name);
      }
    } catch (error) {
      console.error('Error loading rooms:', error);
    }
  };

  const loadCurrentRoomData = async () => {
    try {
      const room = rooms.find(r => r.name === currentRoom);
      if (room) {
        const response = await axios.get(`${API_URL}/api/rooms/${room._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCurrentRoomData(response.data);
        
        // Check if user is admin and count pending requests
        const isAdmin = response.data.admin._id === user.id;
        if (isAdmin) {
          setPendingRequestsCount(response.data.pendingRequests?.length || 0);
        } else {
          setPendingRequestsCount(0);
        }
      }
    } catch (error) {
      console.error('Error loading room data:', error);
    }
  };

  const handleCreateRoom = async (roomData) => {
    try {
      const response = await axios.post(
        `${API_URL}/api/rooms`,
        roomData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setRooms([response.data, ...rooms]);
      setCurrentRoom(response.data.name);
      setShowCreateRoom(false);
    } catch (error) {
      console.error('Error creating room:', error);
      alert('Failed to create room. Room name might already exist.');
    }
  };

  return (
    <motion.div
      className="chat-container"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Sidebar
        user={user}
        rooms={rooms}
        currentRoom={currentRoom}
        onRoomSelect={setCurrentRoom}
        onCreateRoom={() => setShowCreateRoom(true)}
        onBrowseRooms={() => setShowBrowseRooms(true)}
        onLogout={onLogout}
      />
      
      <ChatRoom
        user={user}
        room={currentRoom}
        roomData={currentRoomData}
        onShowJoinRequests={() => setShowJoinRequests(true)}
        pendingRequestsCount={pendingRequestsCount}
        onRoomUpdated={() => {
          loadRooms();
          loadCurrentRoomData();
        }}
        onRoomLeft={() => {
          loadRooms();
          setCurrentRoom(null);
        }}
      />
      
      <OnlineUsers room={currentRoom} />
      
      {showCreateRoom && (
        <CreateRoomModal
          onClose={() => setShowCreateRoom(false)}
          onCreate={handleCreateRoom}
        />
      )}

      {showBrowseRooms && (
        <BrowseRoomsModal
          onClose={() => setShowBrowseRooms(false)}
          token={token}
          userId={user.id}
          onRoomJoined={() => {
            loadRooms();
            setShowBrowseRooms(false);
          }}
        />
      )}

      {showJoinRequests && currentRoomData && (
        <JoinRequestsPanel
          room={currentRoomData}
          onClose={() => {
            setShowJoinRequests(false);
            loadCurrentRoomData();
          }}
        />
      )}
    </motion.div>
  );
}

function CreateRoomModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [roomImage, setRoomImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert('Image size should be less than 5MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        setRoomImage(reader.result); // base64 string
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      onCreate({ 
        name: name.trim(), 
        description: description.trim(),
        isPrivate,
        roomImage
      });
    }
  };

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="modal"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2>Create New Room</h2>
        <form className="modal-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Room name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            required
          />
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          
          <div style={{ marginTop: '15px', textAlign: 'left' }}>
            <label style={{ 
              display: 'block',
              color: 'var(--dark)',
              fontWeight: '600',
              fontSize: '0.95rem',
              marginBottom: '8px'
            }}>
              📷 Room Image (Optional)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              {imagePreview && (
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: '2px solid var(--primary)'
                }}>
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              )}
              <label style={{
                padding: '10px 20px',
                backgroundColor: 'var(--primary)',
                color: 'white',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '500',
                transition: 'all 0.3s ease'
              }}>
                {imagePreview ? 'Change Image' : 'Upload Image'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </div>
          
          <div style={{ textAlign: 'left', marginTop: '15px', marginBottom: '10px' }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              cursor: 'pointer',
              padding: '12px',
              backgroundColor: isPrivate ? 'rgba(74, 158, 255, 0.1)' : 'transparent',
              borderRadius: '8px',
              border: isPrivate ? '2px solid var(--primary)' : '2px solid transparent',
              transition: 'all 0.3s ease'
            }}>
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              />
              <div>
                <div style={{ color: 'var(--dark)', fontWeight: '600', fontSize: '1rem' }}>
                  {isPrivate ? '🔒 Private Room' : '🌍 Public Room'}
                </div>
                <div style={{ color: 'var(--gray)', fontSize: '0.85rem', marginTop: '4px' }}>
                  {isPrivate 
                    ? 'Users need to send join request (admin approval required)' 
                    : 'Anyone can join directly without approval'}
                </div>
              </div>
            </label>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create Room
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

export default ChatContainer;

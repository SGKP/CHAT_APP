import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function BrowseRoomsModal({ onClose, token, userId, onRoomJoined }) {
  const [allRooms, setAllRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAllRooms = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/rooms/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAllRooms(response.data);
    } catch (error) {
      console.error('Error loading rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (room) => {
    try {
      // Check if already a member
      const isMember = room.members.some(m => m.userId === userId);
      
      if (isMember) {
        alert('You are already a member of this room!');
        return;
      }

      // Check if pending request exists
      const hasPendingRequest = room.pendingRequests?.some(r => r.userId === userId);
      
      if (hasPendingRequest) {
        alert('Your join request is pending approval!');
        return;
      }

      // Send join request
      await axios.post(
        `${API_URL}/api/rooms/${room._id}/join`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (room.settings?.requireApproval) {
        alert('✅ Join request sent! Wait for admin approval.');
      } else {
        alert('✅ You joined the room!');
        onRoomJoined();
      }
      
      loadAllRooms(); // Refresh the list
    } catch (error) {
      console.error('Error joining room:', error);
      alert(error.response?.data?.error || 'Failed to join room');
    }
  };

  const getRoomStatus = (room) => {
    const isMember = room.members.some(m => m.userId === userId);
    const hasPendingRequest = room.pendingRequests?.some(r => r.userId === userId);
    const isAdmin = room.admin._id === userId;

    if (isAdmin) return { text: '👑 You are Admin', color: 'var(--primary)', disabled: true };
    if (isMember) return { text: '✅ Joined', color: 'var(--secondary)', disabled: true };
    if (hasPendingRequest) return { text: '⏳ Pending', color: 'var(--gray)', disabled: true };
    return { text: '📤 Send Request', color: 'var(--primary)', disabled: false };
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
        style={{ maxWidth: '600px', maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
      >
        <h2 style={{ marginBottom: '20px' }}>🔍 Browse All Rooms</h2>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gray)' }}>
            Loading rooms...
          </div>
        ) : allRooms.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gray)' }}>
            No rooms available. Create one!
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', marginBottom: '20px' }}>
            {allRooms.map((room) => {
              const status = getRoomStatus(room);
              return (
                <motion.div
                  key={room._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    padding: '15px',
                    marginBottom: '10px',
                    border: '2px solid var(--light)',
                    borderRadius: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'white',
                    transition: 'all 0.3s ease'
                  }}
                  whileHover={{ borderColor: 'var(--primary)', transform: 'translateX(5px)' }}
                >
                  {/* Room Avatar */}
                  {room.avatar && (
                    <div style={{
                      width: '50px',
                      height: '50px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      marginRight: '15px',
                      border: '2px solid var(--primary)'
                    }}>
                      <img 
                        src={room.avatar} 
                        alt={room.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    </div>
                  )}
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                      <h3 style={{ margin: 0, color: 'var(--dark)', fontSize: '1.1rem' }}>
                        #{room.name}
                      </h3>
                      {room.isPrivate && (
                        <span style={{ 
                          background: 'var(--danger)', 
                          color: 'white', 
                          padding: '2px 8px', 
                          borderRadius: '8px', 
                          fontSize: '0.7rem',
                          fontWeight: '600'
                        }}>
                          🔒 PRIVATE
                        </span>
                      )}
                      {room.settings?.requireApproval && (
                        <span style={{ 
                          background: 'var(--secondary)', 
                          color: 'white', 
                          padding: '2px 8px', 
                          borderRadius: '8px', 
                          fontSize: '0.7rem',
                          fontWeight: '600'
                        }}>
                          ✋ APPROVAL REQUIRED
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '5px 0 0', color: 'var(--gray)', fontSize: '0.85rem' }}>
                      {room.description || 'No description'}
                    </p>
                    <p style={{ margin: '5px 0 0', color: 'var(--gray)', fontSize: '0.8rem' }}>
                      👥 {room.members.length} members • Admin: {room.admin.username}
                    </p>
                  </div>
                  
                  <motion.button
                    className="btn"
                    onClick={() => !status.disabled && handleJoinRoom(room)}
                    disabled={status.disabled}
                    whileHover={!status.disabled ? { scale: 1.05 } : {}}
                    whileTap={!status.disabled ? { scale: 0.95 } : {}}
                    style={{
                      padding: '10px 20px',
                      background: status.color,
                      color: 'white',
                      fontSize: '0.85rem',
                      opacity: status.disabled ? 0.6 : 1,
                      cursor: status.disabled ? 'not-allowed' : 'pointer',
                      whiteSpace: 'nowrap',
                      marginLeft: '15px'
                    }}
                  >
                    {status.text}
                  </motion.button>
                </motion.div>
              );
            })}
          </div>
        )}

        <motion.button
          className="btn btn-secondary"
          onClick={onClose}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          style={{ width: '100%' }}
        >
          Close
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

export default BrowseRoomsModal;

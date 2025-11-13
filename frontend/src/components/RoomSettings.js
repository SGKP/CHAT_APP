import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_URL = 'http://localhost:5000/api';

function RoomSettings({ room, onClose, onRoomUpdated, onRoomLeft }) {
  const [roomData, setRoomData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const { token, user } = useAuth();

  useEffect(() => {
    loadRoomData();
  }, [room]);

  const loadRoomData = async () => {
    try {
      const response = await axios.get(`${API_URL}/rooms/${room._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRoomData(response.data);
      setEditedName(response.data.name);
      setEditedDescription(response.data.description || '');
    } catch (error) {
      console.error('Error loading room:', error);
      alert('Failed to load room data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveChanges = async () => {
    try {
      await axios.patch(
        `${API_URL}/rooms/${room._id}`,
        {
          name: editedName,
          description: editedDescription
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert('✅ Room updated successfully!');
      setIsEditing(false);
      loadRoomData();
      onRoomUpdated();
    } catch (error) {
      console.error('Error updating room:', error);
      alert(error.response?.data?.error || 'Failed to update room');
    }
  };

  const handleRemoveMember = async (memberId, memberUsername) => {
    if (!window.confirm(`Remove ${memberUsername} from the room?`)) return;

    try {
      await axios.delete(
        `${API_URL}/rooms/${room._id}/members/${memberId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert(`✅ ${memberUsername} has been removed`);
      loadRoomData();
    } catch (error) {
      console.error('Error removing member:', error);
      alert(error.response?.data?.error || 'Failed to remove member');
    }
  };

  const handleLeaveRoom = async () => {
    if (!window.confirm('Are you sure you want to leave this room?')) return;

    try {
      await axios.delete(
        `${API_URL}/rooms/${room._id}/members/${user.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert('✅ You left the room');
      onRoomLeft();
      onClose();
    } catch (error) {
      console.error('Error leaving room:', error);
      alert(error.response?.data?.error || 'Failed to leave room');
    }
  };

  const handleMakeAdmin = async (memberId, memberUsername) => {
    if (!window.confirm(`Make ${memberUsername} the admin?`)) return;

    try {
      await axios.patch(
        `${API_URL}/rooms/${room._id}/transfer-admin`,
        { newAdminId: memberId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert(`✅ ${memberUsername} is now the admin`);
      loadRoomData();
    } catch (error) {
      console.error('Error transferring admin:', error);
      alert(error.response?.data?.error || 'Failed to transfer admin rights');
    }
  };

  if (loading) {
    return (
      <motion.div
        className="modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <p style={{ textAlign: 'center', color: 'var(--gray)' }}>Loading...</p>
        </div>
      </motion.div>
    );
  }

  if (!roomData) return null;

  const isAdmin = roomData.admin._id === user.id;

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
        style={{ 
          maxWidth: '600px', 
          maxHeight: '85vh', 
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ marginBottom: '10px', color: 'var(--dark)', fontSize: '1.5rem' }}>
            {isEditing ? '✏️ Edit Room' : '⚙️ Room Settings'}
          </h2>
        </div>

        {/* Scrollable Content */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px' }}>
          
          {/* Room Avatar */}
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <div style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea, #4facfe)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              fontSize: '3rem',
              fontWeight: '700',
              color: 'white',
              boxShadow: '0 8px 24px rgba(74, 158, 255, 0.4)',
              border: '4px solid rgba(74, 158, 255, 0.3)'
            }}>
              {roomData.name.charAt(0).toUpperCase()}
            </div>
            {isAdmin && (
              <p style={{ 
                marginTop: '10px', 
                color: 'var(--gray)', 
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}>
                📷 Click to change photo (Coming soon)
              </p>
            )}
          </div>

          {/* Room Info */}
          {isEditing ? (
            <div style={{ marginBottom: '25px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                color: 'var(--dark)',
                fontWeight: '600',
                fontSize: '0.9rem'
              }}>
                Room Name
              </label>
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '2px solid rgba(74, 158, 255, 0.3)',
                  background: 'white',
                  color: 'var(--dark)',
                  fontSize: '1rem',
                  marginBottom: '15px'
                }}
              />

              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                color: 'var(--dark)',
                fontWeight: '600',
                fontSize: '0.9rem'
              }}>
                Description
              </label>
              <textarea
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                rows={4}
                placeholder="Add a room description..."
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '2px solid rgba(74, 158, 255, 0.3)',
                  background: 'white',
                  color: 'var(--dark)',
                  fontSize: '1rem',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
            </div>
          ) : (
            <div style={{ marginBottom: '25px' }}>
              <div style={{ 
                padding: '15px',
                background: 'rgba(74, 158, 255, 0.1)',
                borderRadius: '12px',
                marginBottom: '10px',
                border: '1px solid rgba(74, 158, 255, 0.2)'
              }}>
                <div style={{ 
                  color: 'var(--gray)', 
                  fontSize: '0.85rem',
                  marginBottom: '5px',
                  fontWeight: '600'
                }}>
                  Room Name
                </div>
                <div style={{ 
                  color: 'var(--dark)', 
                  fontSize: '1.3rem',
                  fontWeight: '700'
                }}>
                  #{roomData.name}
                </div>
              </div>

              <div style={{ 
                padding: '15px',
                background: 'rgba(74, 158, 255, 0.1)',
                borderRadius: '12px',
                marginBottom: '10px',
                border: '1px solid rgba(74, 158, 255, 0.2)'
              }}>
                <div style={{ 
                  color: 'var(--gray)', 
                  fontSize: '0.85rem',
                  marginBottom: '5px',
                  fontWeight: '600'
                }}>
                  Description
                </div>
                <div style={{ color: 'var(--dark)', fontSize: '1rem' }}>
                  {roomData.description || 'No description'}
                </div>
              </div>

              <div style={{ 
                padding: '15px',
                background: 'rgba(74, 158, 255, 0.1)',
                borderRadius: '12px',
                border: '1px solid rgba(74, 158, 255, 0.2)'
              }}>
                <div style={{ 
                  color: 'var(--gray)', 
                  fontSize: '0.85rem',
                  marginBottom: '5px',
                  fontWeight: '600'
                }}>
                  Admin
                </div>
                <div style={{ 
                  color: 'var(--accent-blue)', 
                  fontWeight: '700',
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  👑 {roomData.admin.username}
                </div>
              </div>
            </div>
          )}

          {/* Members List */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ 
              color: 'var(--dark)', 
              marginBottom: '15px',
              fontSize: '1.2rem',
              fontWeight: '700'
            }}>
              👥 Members ({roomData.members.length})
            </h3>

            {roomData.members.map((member) => (
              <motion.div
                key={member.userId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  padding: '12px 15px',
                  background: 'rgba(74, 158, 255, 0.08)',
                  borderRadius: '10px',
                  marginBottom: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  border: '1px solid rgba(74, 158, 255, 0.15)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #667eea, #4facfe)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: '700'
                  }}>
                    {member.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ 
                      color: 'var(--dark)', 
                      fontWeight: '700',
                      fontSize: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      {member.username}
                      {member.userId === roomData.admin._id && (
                        <span style={{ 
                          fontSize: '0.75rem',
                          background: 'var(--accent-blue)',
                          color: 'white',
                          padding: '2px 8px',
                          borderRadius: '8px',
                          fontWeight: '600'
                        }}>
                          Admin
                        </span>
                      )}
                      {member.userId === user.id && (
                        <span style={{ color: 'var(--gray)', fontSize: '0.85rem', fontWeight: '500' }}>
                          (You)
                        </span>
                      )}
                    </div>
                    <div style={{ color: 'var(--gray)', fontSize: '0.8rem', textTransform: 'capitalize' }}>
                      {member.role}
                    </div>
                  </div>
                </div>

                {/* Actions for admin */}
                {isAdmin && member.userId !== user.id && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {member.userId !== roomData.admin._id && (
                      <>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleMakeAdmin(member.userId, member.username)}
                          style={{
                            padding: '6px 12px',
                            background: 'var(--accent-blue)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: '600'
                          }}
                        >
                          Make Admin
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleRemoveMember(member.userId, member.username)}
                          style={{
                            padding: '6px 12px',
                            background: 'var(--danger)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: '600'
                          }}
                        >
                          Remove
                        </motion.button>
                      </>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ 
          marginTop: '20px', 
          paddingTop: '20px',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap'
        }}>
          {isEditing ? (
            <>
              <motion.button
                className="btn btn-primary"
                onClick={handleSaveChanges}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{ flex: 1 }}
              >
                💾 Save Changes
              </motion.button>
              <motion.button
                className="btn btn-secondary"
                onClick={() => {
                  setIsEditing(false);
                  setEditedName(roomData.name);
                  setEditedDescription(roomData.description || '');
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Cancel
              </motion.button>
            </>
          ) : (
            <>
              {isAdmin && (
                <motion.button
                  className="btn"
                  onClick={() => setIsEditing(true)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    flex: 1,
                    background: 'var(--accent-blue)',
                    color: 'white'
                  }}
                >
                  ✏️ Edit Room
                </motion.button>
              )}
              
              {!isAdmin && (
                <motion.button
                  className="btn"
                  onClick={handleLeaveRoom}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    flex: 1,
                    background: 'var(--danger)',
                    color: 'white'
                  }}
                >
                  🚪 Leave Room
                </motion.button>
              )}

              <motion.button
                className="btn btn-secondary"
                onClick={onClose}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Close
              </motion.button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default RoomSettings;

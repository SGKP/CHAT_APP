import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../socket';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function JoinRequestsPanel({ room, onClose }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();
  const socket = getSocket();

  useEffect(() => {
    if (room && room._id) {
      loadRequests();
    }

    // Listen for new join requests via socket
    if (socket) {
      socket.on('newJoinRequest', (data) => {
        if (data.roomId === room._id) {
          loadRequests();
        }
      });

      socket.on('joinRequestProcessed', () => {
        loadRequests();
      });
    }

    return () => {
      if (socket) {
        socket.off('newJoinRequest');
        socket.off('joinRequestProcessed');
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, socket]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_URL}/rooms/${room._id}/pending`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRequests(response.data);
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId, username) => {
    try {
      await axios.post(
        `${API_URL}/rooms/${room._id}/approve/${userId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Notify via socket
      if (socket) {
        socket.emit('joinRequestApproved', {
          roomId: room._id,
          roomName: room.name,
          userId,
          username
        });
      }

      setRequests(requests.filter(r => r.userId._id !== userId));
    } catch (error) {
      console.error('Error approving request:', error);
      alert('Failed to approve request');
    }
  };

  const handleReject = async (userId, username) => {
    try {
      await axios.post(
        `${API_URL}/rooms/${room._id}/reject/${userId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Notify via socket
      if (socket) {
        socket.emit('joinRequestRejected', {
          roomId: room._id,
          userId,
          username
        });
      }

      setRequests(requests.filter(r => r.userId._id !== userId));
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Failed to reject request');
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
        className="modal join-requests-modal"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '600px' }}
      >
        <h2>📬 Join Requests for #{room.name}</h2>
        
        {loading ? (
          <p style={{ textAlign: 'center', padding: '20px', color: 'var(--gray)' }}>
            Loading...
          </p>
        ) : requests.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--gray)' }}>
            No pending join requests
          </p>
        ) : (
          <div className="requests-list">
            <AnimatePresence>
              {requests.map((request) => (
                <motion.div
                  key={request.userId._id}
                  className="request-item"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '15px',
                    background: 'var(--light)',
                    borderRadius: '12px',
                    marginBottom: '10px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div 
                      className="user-avatar" 
                      style={{ 
                        width: '45px', 
                        height: '45px',
                        background: 'var(--primary)'
                      }}
                    >
                      {request.userId.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', color: 'var(--dark)' }}>
                        {request.userId.username}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--gray)' }}>
                        {request.userId.email}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray)', marginTop: '4px' }}>
                        Requested: {new Date(request.requestedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <motion.button
                      className="btn"
                      onClick={() => handleApprove(request.userId._id, request.userId.username)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      style={{
                        padding: '8px 16px',
                        background: 'var(--secondary)',
                        color: 'white',
                        fontSize: '0.9rem'
                      }}
                    >
                      ✓ Approve
                    </motion.button>
                    <motion.button
                      className="btn"
                      onClick={() => handleReject(request.userId._id, request.userId.username)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      style={{
                        padding: '8px 16px',
                        background: 'var(--danger)',
                        color: 'white',
                        fontSize: '0.9rem'
                      }}
                    >
                      ✗ Reject
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <motion.button
            className="btn btn-secondary"
            onClick={onClose}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Close
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default JoinRequestsPanel;

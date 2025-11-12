import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSocket } from '../socket';

function OnlineUsers({ room }) {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const socket = getSocket();

  useEffect(() => {
    if (!socket || !room) return;

    socket.on('onlineUsers', (users) => {
      setOnlineUsers(users);
    });

    return () => {
      socket.off('onlineUsers');
    };
  }, [socket, room]);

  if (!room) {
    return null;
  }

  return (
    <div className="online-users-panel">
      <div className="online-users-header">
        <h3>Online Users</h3>
        <p className="online-count">{onlineUsers.length} online</p>
      </div>

      <div className="online-users-list">
        <AnimatePresence>
          {onlineUsers.map((user, index) => (
            <motion.div
              key={user}
              className="online-user"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <div className="user-avatar" style={{ width: '35px', height: '35px' }}>
                {user.charAt(0).toUpperCase()}
              </div>
              <span className="online-user-name">{user}</span>
              <div className="online-status"></div>
            </motion.div>
          ))}
        </AnimatePresence>

        {onlineUsers.length === 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ 
              textAlign: 'center', 
              color: 'var(--gray)', 
              marginTop: '20px',
              fontSize: '0.9rem'
            }}
          >
            No users online
          </motion.p>
        )}
      </div>
    </div>
  );
}

export default OnlineUsers;

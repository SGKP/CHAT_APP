import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import gsap from 'gsap';

function Sidebar({ user, rooms, currentRoom, onRoomSelect, onCreateRoom, onLogout, onBrowseRooms }) {
  const roomsRef = useRef([]);

  useEffect(() => {
    // Animate room items on load
    gsap.fromTo(
      roomsRef.current,
      { x: -20, opacity: 0 },
      {
        x: 0,
        opacity: 1,
        duration: 0.3,
        stagger: 0.05,
        ease: 'power2.out'
      }
    );
  }, [rooms]);

  const getUserInitial = (name) => {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  };

  const getRoomInitial = (name) => {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  };

  if (!user) {
    return null;
  }

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>Rooms</h2>
        <div className="user-info">
          <div className="user-avatar">{getUserInitial(user.username)}</div>
          <span>{user.username}</span>
        </div>
      </div>

      <div className="rooms-section">
        <div className="section-title">Your Rooms</div>
        <ul className="room-list">
          {rooms.map((room, index) => (
            <motion.li
              key={room._id}
              ref={(el) => (roomsRef.current[index] = el)}
              className={`room-item ${currentRoom === room.name ? 'active' : ''}`}
              onClick={() => onRoomSelect(room.name)}
              whileHover={{ x: 5 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="room-icon">{getRoomInitial(room.name)}</div>
              <div className="room-details">
                <div className="room-name">{room.name}</div>
              </div>
            </motion.li>
          ))}
        </ul>
      </div>

      <motion.button
        className="create-room-btn"
        onClick={onCreateRoom}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        + Create Room
      </motion.button>

      <motion.button
        className="browse-rooms-btn"
        onClick={onBrowseRooms}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        style={{
          margin: '10px 15px',
          padding: '12px',
          background: 'var(--secondary)',
          color: 'var(--white)',
          border: 'none',
          borderRadius: '10px',
          cursor: 'pointer',
          fontWeight: '600',
          transition: 'all 0.3s ease'
        }}
      >
        🔍 Browse All Rooms
      </motion.button>

      <motion.button
        className="logout-btn"
        onClick={onLogout}
        whileHover={{ scale: 1.02, backgroundColor: 'var(--danger)' }}
        whileTap={{ scale: 0.98 }}
        style={{
          margin: '10px 15px 15px',
          padding: '12px',
          background: 'var(--dark-light)',
          color: 'var(--white)',
          border: 'none',
          borderRadius: '10px',
          cursor: 'pointer',
          fontWeight: '600',
          transition: 'all 0.3s ease'
        }}
      >
        🚪 Logout
      </motion.button>
    </div>
  );
}

export default Sidebar;

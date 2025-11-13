import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { getSocket } from '../socket';
import { useAuth } from '../context/AuthContext';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';
import RoomSettings from './RoomSettings';
import gsap from 'gsap';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function ChatRoom({ user, room, roomData, onShowJoinRequests, pendingRequestsCount, onRoomUpdated, onRoomLeft }) {
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [showRoomSettings, setShowRoomSettings] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const socket = getSocket();
  const { token } = useAuth();

  useEffect(() => {
    if (!room || !socket || !user) return;

    // Load chat history
    loadMessages();

    // Join room
    socket.emit('joinRoom', { room });

    // Listen for messages
    socket.on('message', (message) => {
      setMessages((prev) => [...prev, message]);
      scrollToBottom();
    });

    // Listen for typing
    socket.on('userTyping', ({ username: typingUser, isTyping }) => {
      if (isTyping) {
        setTypingUsers((prev) => 
          prev.includes(typingUser) ? prev : [...prev, typingUser]
        );
      } else {
        setTypingUsers((prev) => prev.filter((u) => u !== typingUser));
      }
    });

    // Listen for errors
    socket.on('error', (error) => {
      alert(error.message || 'An error occurred');
      console.error('Socket error:', error);
    });

    return () => {
      socket.off('message');
      socket.off('userTyping');
      socket.off('error');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, user, socket]);

  const loadMessages = async () => {
    try {
      const response = await axios.get(`${API_URL}/messages/${room}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setMessages(response.data);
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = (message) => {
    if (socket && room && user) {
      socket.emit('chatMessage', { message, room });
    }
  };

  const handleTyping = (isTyping) => {
    if (socket && room && user) {
      socket.emit('typing', { room, isTyping });
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getUserInitial = (name) => {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  };

  if (!user) {
    return null;
  }

  if (!room) {
    return (
      <div className="chat-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center', color: 'var(--gray)' }}
        >
          <h2>Welcome to Chat App! 👋</h2>
          <p>Select a room to start chatting</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="chat-main">
      <motion.div
        className="chat-header"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div 
          className="chat-header-info" 
          onClick={() => setShowRoomSettings(true)}
          style={{ 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '15px'
          }}
        >
          {/* Room Avatar */}
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea, #4facfe)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              fontWeight: '700',
              color: 'white',
              boxShadow: '0 4px 15px rgba(74, 158, 255, 0.4)',
              border: '3px solid rgba(74, 158, 255, 0.3)',
              flexShrink: 0
            }}
          >
            {room.charAt(0).toUpperCase()}
          </motion.div>

          <div>
            <h3 style={{ 
              margin: 0, 
              marginBottom: '4px',
              color: 'var(--white)',
              fontSize: '1.3rem',
              fontWeight: '700'
            }}>
              #{room}
            </h3>
            <p style={{ 
              margin: 0, 
              fontSize: '0.85rem',
              color: 'var(--gray)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>{messages.length} messages</span>
              <span style={{ opacity: 0.5 }}>•</span>
              <span style={{ 
                fontSize: '0.8rem',
                opacity: 0.8,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                ⚙️ Click for settings
              </span>
            </p>
          </div>
        </div>

        {roomData && roomData.admin._id === user.id && pendingRequestsCount > 0 && (
          <motion.button
            className="btn"
            onClick={onShowJoinRequests}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
              position: 'relative',
              padding: '10px 20px',
              background: 'var(--secondary)',
              color: 'white',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>📬 Join Requests</span>
            <motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              style={{
                background: 'var(--danger)',
                color: 'white',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 'bold'
              }}
            >
              {pendingRequestsCount}
            </motion.span>
          </motion.button>
        )}
      </motion.div>

      <div className="messages-container" ref={messagesContainerRef}>
        <AnimatePresence>
          {messages.map((msg, index) => (
            <Message
              key={index}
              message={msg}
              isOwn={msg.username === user.username}
              getUserInitial={getUserInitial}
              formatTime={formatTime}
            />
          ))}
        </AnimatePresence>
        
        {typingUsers.length > 0 && (
          <TypingIndicator users={typingUsers} />
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <MessageInput
        onSendMessage={handleSendMessage}
        onTyping={handleTyping}
      />

      {showRoomSettings && roomData && (
        <RoomSettings
          room={roomData}
          onClose={() => setShowRoomSettings(false)}
          onRoomUpdated={() => {
            setShowRoomSettings(false);
            if (onRoomUpdated) onRoomUpdated();
          }}
          onRoomLeft={() => {
            setShowRoomSettings(false);
            if (onRoomLeft) onRoomLeft();
          }}
        />
      )}
    </div>
  );
}

function Message({ message, isOwn, getUserInitial, formatTime }) {
  const messageRef = useRef(null);

  useEffect(() => {
    if (messageRef.current) {
      gsap.fromTo(
        messageRef.current,
        { opacity: 0, y: 20, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: 'power2.out' }
      );
    }
  }, []);

  const isSystem = message.username === 'System';

  if (isSystem) {
    return (
      <motion.div
        ref={messageRef}
        className="message system"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        <div className="message-text">{message.message}</div>
      </motion.div>
    );
  }

  return (
    <motion.div
      ref={messageRef}
      className="message"
      initial={{ opacity: 0, x: isOwn ? 20 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="message-avatar">
        {getUserInitial(message.username)}
      </div>
      <div className="message-content">
        <div className="message-header">
          <span className="message-username">{message.username}</span>
          <span className="message-time">{formatTime(message.timestamp)}</span>
        </div>
        <div className="message-text">{message.message}</div>
      </div>
    </motion.div>
  );
}

export default ChatRoom;

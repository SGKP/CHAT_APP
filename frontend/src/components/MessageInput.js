import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

function MessageInput({ onSendMessage, onTyping }) {
  const [message, setMessage] = useState('');
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  const handleChange = (e) => {
    setMessage(e.target.value);

    // Typing indicator logic
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      onTyping(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      onTyping(false);
    }, 1000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const trimmedMessage = message.trim();
    if (trimmedMessage) {
      onSendMessage(trimmedMessage);
      setMessage('');
      
      // Stop typing indicator
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      isTypingRef.current = false;
      onTyping(false);
    }
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="message-input-container">
      <form className="message-input-wrapper" onSubmit={handleSubmit}>
        <input
          type="text"
          className="message-input"
          placeholder="Type a message..."
          value={message}
          onChange={handleChange}
          autoComplete="off"
        />
        <motion.button
          type="submit"
          className="send-btn"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          disabled={!message.trim()}
        >
          ➤
        </motion.button>
      </form>
    </div>
  );
}

export default MessageInput;

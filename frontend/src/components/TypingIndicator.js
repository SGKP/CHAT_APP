import React from 'react';
import { motion } from 'framer-motion';

function TypingIndicator({ users }) {
  if (users.length === 0) return null;

  const displayText = users.length === 1
    ? `${users[0]} is typing`
    : users.length === 2
    ? `${users[0]} and ${users[1]} are typing`
    : `${users.length} people are typing`;

  return (
    <motion.div
      className="typing-indicator"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.2 }}
    >
      <span>{displayText}</span>
      <div className="typing-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </motion.div>
  );
}

export default TypingIndicator;

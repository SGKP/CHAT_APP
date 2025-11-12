import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import ChatContainer from './components/ChatContainer';
import AnimatedBackground from './components/AnimatedBackground';
import { initSocket, disconnectSocket } from './socket';

function AppContent() {
  const { user, token, isAuthenticated, loading, logout } = useAuth();

  useEffect(() => {
    if (isAuthenticated && token) {
      initSocket(token);
    }
    
    return () => {
      disconnectSocket();
    };
  }, [isAuthenticated, token]);

  if (loading) {
    return (
      <div className="app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ color: 'white', fontSize: '1.2rem' }}
        >
          Loading...
        </motion.div>
      </div>
    );
  }

  return (
    <div className="app">
      <AnimatedBackground />
      <AnimatePresence mode="wait">
        {!isAuthenticated ? (
          <motion.div
            key="login"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
          >
            <Login />
          </motion.div>
        ) : (
          <motion.div
            key="chat"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
          >
            <ChatContainer user={user} onLogout={logout} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import { useAuth } from '../context/AuthContext';

function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const titleRef = useRef(null);
  const formRef = useRef(null);
  const { login, register } = useAuth();

  useEffect(() => {
    // GSAP animations on mount
    gsap.fromTo(
      titleRef.current,
      { y: -50, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }
    );

    gsap.fromTo(
      formRef.current,
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, delay: 0.2, ease: 'power3.out' }
    );
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // Login
        if (!formData.email || !formData.password) {
          setError('Please fill in all fields');
          setLoading(false);
          return;
        }
        await login(formData.email, formData.password);
      } else {
        // Register
        if (!formData.username || !formData.email || !formData.password) {
          setError('Please fill in all fields');
          setLoading(false);
          return;
        }
        if (formData.password.length < 6) {
          setError('Password must be at least 6 characters');
          setLoading(false);
          return;
        }
        await register(formData.username, formData.email, formData.password);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Something went wrong');
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  return (
    <div className="login-container">
      <div ref={titleRef}>
        <h1>💬 Chat App</h1>
        <p>{isLogin ? 'Welcome back! Sign in to continue' : 'Create an account to get started'}</p>
      </div>
      
      <form className="login-form" onSubmit={handleSubmit} ref={formRef}>
        {!isLogin && (
          <div className="input-group">
            <input
              type="text"
              name="username"
              placeholder="Username"
              value={formData.username}
              onChange={handleChange}
              autoFocus
            />
          </div>
        )}

        <div className="input-group">
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            autoFocus={isLogin}
          />
        </div>

        <div className="input-group">
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
          />
        </div>
        
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ color: 'var(--danger)', fontSize: '0.9rem', textAlign: 'left' }}
          >
            {error}
          </motion.p>
        )}
        
        <motion.button
          type="submit"
          className="btn btn-primary"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          disabled={loading}
        >
          {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Sign Up'}
        </motion.button>

        <motion.p
          style={{ textAlign: 'center', marginTop: '20px', cursor: 'pointer' }}
          onClick={() => {
            setIsLogin(!isLogin);
            setError('');
            setFormData({ username: '', email: '', password: '' });
          }}
          whileHover={{ scale: 1.05 }}
        >
          <strong style={{ color: 'var(--primary)' }}>
            {isLogin ? 'Sign Up' : 'Sign In'}
          </strong>
        </motion.p>
      </form>
    </div>
  );
}

export default Login;

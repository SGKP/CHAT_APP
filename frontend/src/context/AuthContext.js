import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data.user);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const login = async (email, password) => {
    const response = await axios.post('http://localhost:5000/api/auth/login', {
      email,
      password
    });
    
    const { token: newToken, user: newUser } = response.data;
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    
    return response.data;
  };

  const register = async (username, email, password) => {
    const response = await axios.post('http://localhost:5000/api/auth/register', {
      username,
      email,
      password
    });
    
    const { token: newToken, user: newUser } = response.data;
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    
    return response.data;
  };

  const logout = async () => {
    try {
      if (token) {
        await axios.post(
          'http://localhost:5000/api/auth/logout',
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem('token');
    }
  };

  const value = {
    user,
    token,
    login,
    register,
    logout,
    loading,
    isAuthenticated: !!token && !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

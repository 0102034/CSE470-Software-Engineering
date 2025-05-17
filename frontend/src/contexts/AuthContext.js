import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    const userInfo = localStorage.getItem('userInfo');
    const adminToken = localStorage.getItem('adminToken');
    const adminInfo = localStorage.getItem('adminInfo');

    if (token && userInfo) {
      setUser({ ...JSON.parse(userInfo), isAdmin: false });
    } else if (adminToken && adminInfo) {
      setUser({ ...JSON.parse(adminInfo), isAdmin: true });
    }

    setLoading(false);
  }, []);

  const login = (userData, isAdmin = false) => {
    if (isAdmin) {
      localStorage.setItem('adminToken', userData.token);
      localStorage.setItem('adminInfo', JSON.stringify(userData.user));
    } else {
      localStorage.setItem('token', userData.token);
      localStorage.setItem('userInfo', JSON.stringify(userData.user));
    }
    setUser({ ...userData.user, isAdmin });
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userInfo');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminInfo');
    setUser(null);
  };

  const value = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.isAdmin || false
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;

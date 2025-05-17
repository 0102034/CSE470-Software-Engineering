const getToken = () => {
  return localStorage.getItem('token');
};

const setToken = (token) => {
  localStorage.setItem('token', token);
};

const removeToken = () => {
  localStorage.removeItem('token');
};

const isAuthenticated = () => {
  const token = getToken();
  return !!token;
};

const isAdmin = () => {
  const adminData = localStorage.getItem('adminData');
  return !!adminData;
};

export {
  getToken,
  setToken,
  removeToken,
  isAuthenticated,
  isAdmin
};

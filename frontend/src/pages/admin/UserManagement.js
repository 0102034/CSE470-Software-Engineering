// UserManagement.js
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Snackbar,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import axios from 'axios';

const UserManagement = ({ filterType }) => {
  // State for users
  const [pendingUsers, setPendingUsers] = useState([]);
  const [verifiedUsers, setVerifiedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  
  // State for user details dialog
  const [userDetailsOpen, setUserDetailsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  
  // State for edit dialog
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [editUserData, setEditUserData] = useState(null);
  
  // State for delete confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState(null);
  
  // State for snackbar notifications
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  // Fetch users
  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Get admin token from localStorage
      const adminToken = localStorage.getItem('adminToken');
      
      // Make API request with proper authorization header
      const response = await axios.get('http://localhost:5000/admin/users', {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      
      // Separate users by verification status
      const pending = [];
      const verified = [];
      
      if (response.data && Array.isArray(response.data)) {
        response.data.forEach(user => {
          if (user.verification_status === 'pending') {
            pending.push(user);
          } else if (user.verification_status === 'approved') {
            verified.push(user);
          }
        });
      } else if (response.data && response.data.users && Array.isArray(response.data.users)) {
        response.data.users.forEach(user => {
          if (user.verification_status === 'pending') {
            pending.push(user);
          } else if (user.verification_status === 'approved') {
            verified.push(user);
          }
        });
      }
      
      setPendingUsers(pending);
      setVerifiedUsers(verified);
    } catch (error) {
      console.error('Error fetching users:', error);
      setSnackbar({
        open: true,
        message: 'Failed to fetch users: ' + (error.response?.data?.message || error.message),
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  // Handle view user details
  const handleViewUser = (user) => {
    setSelectedUser(user);
    setUserDetailsOpen(true);
  };

  // Handle close user details
  const handleCloseUserDetails = () => {
    setUserDetailsOpen(false);
    setSelectedUser(null);
  };

  // Handle edit user
  const handleEditUser = (user) => {
    setEditUserData(user);
    setEditUserOpen(true);
  };

  // Handle close edit dialog
  const handleEditUserClose = () => {
    setEditUserOpen(false);
    setEditUserData(null);
  };

  // Handle save edited user
  const handleEditUserSave = async () => {
    try {
      await axios.put(`/api/admin/users/${editUserData.id}`, editUserData);
      
      // Update local state
      if (editUserData.verification_status === 'pending') {
        setPendingUsers(prevUsers => 
          prevUsers.map(user => user.id === editUserData.id ? editUserData : user)
        );
      } else {
        setVerifiedUsers(prevUsers => 
          prevUsers.map(user => user.id === editUserData.id ? editUserData : user)
        );
      }
      
      setSnackbar({
        open: true,
        message: 'User updated successfully',
        severity: 'success'
      });
      
      handleEditUserClose();
    } catch (error) {
      console.error('Error updating user:', error);
      setSnackbar({
        open: true,
        message: 'Failed to update user',
        severity: 'error'
      });
    }
  };

  // Handle delete user
  const handleDeleteUser = (userId) => {
    setDeleteUserId(userId);
    setDeleteConfirmOpen(true);
  };

  // Handle close delete confirmation
  const handleDeleteUserClose = () => {
    setDeleteConfirmOpen(false);
    setDeleteUserId(null);
  };

  // Handle confirm delete
  const handleDeleteUserConfirm = async () => {
    if (!deleteUserId) return;
    
    try {
      await axios.delete(`http://localhost:5000/admin/users/${deleteUserId}`);
      
      // Update local state - remove from both arrays to be safe
      setPendingUsers(prevUsers => prevUsers.filter(user => user.id !== deleteUserId));
      setVerifiedUsers(prevUsers => prevUsers.filter(user => user.id !== deleteUserId));
      
      setSnackbar({
        open: true,
        message: 'User deleted successfully',
        severity: 'success'
      });
      
      handleDeleteUserClose();
    } catch (error) {
      console.error('Error deleting user:', error);
      setSnackbar({
        open: true,
        message: 'Failed to delete user',
        severity: 'error'
      });
    }
  };

  // Handle approve user
  const handleApproveUser = async (userId) => {
    setActionLoading(userId);
    try {
      await axios.put(`http://localhost:5000/admin/users/${userId}/verify`, {});
      
      // Move user from pending to verified
      const approvedUser = pendingUsers.find(user => user.id === userId);
      if (approvedUser) {
        const updatedUser = { ...approvedUser, verification_status: 'verified' };
        
        setPendingUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
        setVerifiedUsers(prevUsers => [updatedUser, ...prevUsers]);
      }
      
      setSnackbar({
        open: true,
        message: 'User approved successfully',
        severity: 'success'
      });
    } catch (err) {
      console.error('Error approving user:', err);
      setSnackbar({
        open: true, 
        message: `Failed to approve user: ${err.response?.data?.error || err.message}`,
        severity: 'error'
      });
    } finally {
      setActionLoading('');
    }
  };

  // Handle reject user
  const handleRejectUser = async (userId) => {
    setActionLoading(userId);
    try {
      await axios.put(`http://localhost:5000/admin/users/${userId}/reject`, {});
      
      // Remove user from pending
      setPendingUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
      
      setSnackbar({
        open: true,
        message: 'User rejected successfully',
        severity: 'success'
      });
    } catch (err) {
      console.error('Error rejecting user:', err);
      setSnackbar({
        open: true, 
        message: `Failed to reject user: ${err.response?.data?.error || err.message}`,
        severity: 'error'
      });
    } finally {
      setActionLoading('');
    }
  };

  // Handle snackbar close
  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Render pending users table
  const renderPendingUsersTable = () => {
    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Student ID</TableCell>
              <TableCell>Department</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pendingUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.student_id}</TableCell>
                <TableCell>{user.department}</TableCell>
                <TableCell>
                  <IconButton onClick={() => handleViewUser(user)}>
                    <VisibilityIcon />
                  </IconButton>
                  <IconButton 
                    onClick={() => handleApproveUser(user.id)}
                    disabled={actionLoading === user.id}
                    color="success"
                  >
                    {actionLoading === user.id ? <CircularProgress size={24} /> : <CheckCircleIcon />}
                  </IconButton>
                  <IconButton 
                    onClick={() => handleRejectUser(user.id)}
                    disabled={actionLoading === user.id}
                    color="error"
                  >
                    {actionLoading === user.id ? <CircularProgress size={24} /> : <CancelIcon />}
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  // Render verified users table
  const renderVerifiedUsersTable = () => {
    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Student ID</TableCell>
              <TableCell>Department</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {verifiedUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.student_id}</TableCell>
                <TableCell>{user.department}</TableCell>
                <TableCell>
                  <IconButton onClick={() => handleViewUser(user)}>
                    <VisibilityIcon />
                  </IconButton>
                  <IconButton onClick={() => handleEditUser(user)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDeleteUser(user.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        {filterType === 'pending' ? 'Pending Users' : 
         filterType === 'verified' ? 'Verified Users' : 'User Management'}
      </Typography>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box>
          {/* Show only the relevant section based on filterType */}
          {(!filterType || filterType === 'pending') && (
            <Paper sx={{ p: 3, mb: 3, borderRadius: '12px' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Pending Verification ({pendingUsers.length})</Typography>
                <Button 
                  variant="outlined" 
                  color="primary" 
                  onClick={() => fetchUsers()}
                >
                  Refresh
                </Button>
              </Box>
              {pendingUsers.length > 0 ? renderPendingUsersTable() : (
                <Typography variant="body1">No pending verification requests.</Typography>
              )}
            </Paper>
          )}
          
          {/* Show verified users section only if filterType is not 'pending' */}
          {(!filterType || filterType === 'verified') && (
            <Paper sx={{ p: 3, borderRadius: '12px' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Verified Users ({verifiedUsers.length})</Typography>
                <Button 
                  variant="outlined" 
                  color="primary" 
                  onClick={() => fetchUsers()}
                >
                  Refresh
                </Button>
              </Box>
              {verifiedUsers.length > 0 ? renderVerifiedUsersTable() : (
                <Typography variant="body1">No verified users found.</Typography>
              )}
            </Paper>
          )}
        </Box>
      )}
      
      {/* User Details Dialog */}
      <Dialog open={userDetailsOpen} onClose={handleCloseUserDetails} maxWidth="md">
        <DialogTitle>User Details</DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Box>
              <Typography variant="h6">{selectedUser.name}</Typography>
              <Typography variant="subtitle1" gutterBottom>
                <strong>Email:</strong> {selectedUser.email}
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                <strong>Student ID:</strong> {selectedUser.student_id}
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                <strong>Department:</strong> {selectedUser.department}
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                <strong>Semester:</strong> {selectedUser.semester}
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                <strong>Status:</strong> {selectedUser.verification_status}
              </Typography>
              {selectedUser.id_card_photo && (
                <Box mt={2}>
                  <Typography variant="subtitle1" gutterBottom>
                    <strong>ID Card:</strong>
                  </Typography>
                  <img 
                    src={selectedUser.id_card_photo} 
                    alt="ID Card" 
                    style={{ maxWidth: '100%', height: 'auto' }} 
                  />
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseUserDetails} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Edit User Dialog */}
      <Dialog open={editUserOpen} onClose={handleEditUserClose} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          {editUserData && (
            <Box sx={{ pt: 2 }}>
              <TextField
                label="Name"
                value={editUserData?.name || ''}
                onChange={e => setEditUserData({ ...editUserData, name: e.target.value })}
                fullWidth
                sx={{ mb: 2 }}
              />
              <TextField
                label="Email"
                value={editUserData?.email || ''}
                onChange={e => setEditUserData({ ...editUserData, email: e.target.value })}
                fullWidth
                sx={{ mb: 2 }}
              />
              <TextField
                label="Student ID"
                value={editUserData?.student_id || ''}
                onChange={e => setEditUserData({ ...editUserData, student_id: e.target.value })}
                fullWidth
                sx={{ mb: 2 }}
              />
              <TextField
                label="Department"
                value={editUserData?.department || ''}
                onChange={e => setEditUserData({ ...editUserData, department: e.target.value })}
                fullWidth
                sx={{ mb: 2 }}
              />
              <TextField
                label="Semester"
                value={editUserData?.semester || ''}
                onChange={e => setEditUserData({ ...editUserData, semester: e.target.value })}
                fullWidth
                sx={{ mb: 2 }}
              />
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Verification Status</InputLabel>
                <Select
                  value={editUserData?.verification_status || 'pending'}
                  label="Verification Status"
                  onChange={e => setEditUserData({ ...editUserData, verification_status: e.target.value })}
                >
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="verified">Verified</MenuItem>
                  <MenuItem value="rejected">Rejected</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditUserClose} color="primary">
            Cancel
          </Button>
          <Button onClick={handleEditUserSave} color="primary" variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={handleDeleteUserClose}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this user? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteUserClose} color="primary">
            Cancel
          </Button>
          <Button onClick={handleDeleteUserConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar for notifications */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UserManagement;

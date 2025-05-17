import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Paper, 
  Divider,
  List, 
  ListItem, 
  ListItemText, 
  ListItemAvatar, 
  ListItemIcon,
  Avatar, 
  Button, 
  Card, 
  CardContent,
  CardActions,
  Chip,
  CircularProgress,
  Alert,
  Drawer,
  Toolbar,
  IconButton,
  AppBar,
  CssBaseline,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import GroupIcon from '@mui/icons-material/Group';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import PeopleIcon from '@mui/icons-material/People';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import StoreIcon from '@mui/icons-material/Store';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import DashboardIcon from '@mui/icons-material/Dashboard';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsIcon from '@mui/icons-material/Notifications';
import CloseIcon from '@mui/icons-material/Close';
import EmailIcon from '@mui/icons-material/Email';
import BadgeIcon from '@mui/icons-material/Badge';
import SchoolIcon from '@mui/icons-material/School';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';
import { setupAdminAuth, adminApiRequest } from '../utils/adminAuth';
import '../AppBackgrounds.css';
import MarketplaceItemDetailsDrawer from '../components/MarketplaceItemDetailsDrawer';
import RideShareList from '../components/RideShareList';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import HelpIcon from '@mui/icons-material/Help';
import AnnouncementForm from '../components/AnnouncementForm';
import ScrollingAnnouncement from '../components/ScrollingAnnouncement';

// Drawer width for the sidebar
const drawerWidth = 240;

// Helper: Exponential backoff for axios GET requests
async function axiosGetWithRetry(url, config = {}, retries = 4, delay = 500) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await axios.get(url, config);
    } catch (err) {
      const status = err.response?.status;
      if (status === 429 || (status >= 500 && status < 600)) {
        if (attempt === retries) throw err;
        // Exponential backoff
        await new Promise(res => setTimeout(res, delay * Math.pow(2, attempt)));
      } else {
        throw err;
      }
    }
  }
}

const AdminDashboard = () => {
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  
  // Function to handle announcement click with proper authentication
  const handleAnnouncementClick = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setSnackbar({
        open: true,
        message: 'You must be logged in to manage announcements',
        severity: 'error'
      });
      return;
    }
    
    // For admin dashboard, we assume the user is an admin if they can access this page
    // The backend will verify admin privileges when making API calls
    setShowAnnouncementForm(true);
  };

  const [editUserOpen, setEditUserOpen] = useState(false);
  const [editUserData, setEditUserData] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [refreshDebounce, setRefreshDebounce] = useState(false);
  
  // Lost & Found state
  const [lostFoundActionLoading, setLostFoundActionLoading] = useState('');
  // Cache timestamps
  const [lastFetched, setLastFetched] = useState({
    users: 0,
    pending: 0,
    stats: 0,
    marketplace: 0,
    rideshare: 0,
    lostfound: 0,
    announcements: 0
  });
  
  // State for announcements
  const [announcements, setAnnouncements] = useState([]);
  // Retry state for 429 errors
  const [retryInfo, setRetryInfo] = useState({ type: '', show: false });
  const CACHE_WINDOW = 30 * 1000; // 30 seconds

  // Handler to close edit drawer/modal
  const handleEditUser = (user) => {
    setEditUserData(user);
    setEditUserOpen(true);
  };

  // Handler to close edit drawer/modal
  const handleEditUserClose = () => {
    setEditUserOpen(false);
    setEditUserData(null);
  };

  // Handler to open delete confirmation dialog
  const handleDeleteVerifiedUser = (userId) => {
    // Find the user to delete
    const userToDelete = verifiedUsers.find(user => user._id === userId);
    if (userToDelete) {
      setUserToDelete(userToDelete);
    setDeleteConfirmOpen(true);
    }
  };

  // Handler to close delete confirmation dialog
  const handleDeleteUserClose = () => {
    setDeleteConfirmOpen(false);
    setUserToDelete(null);
  };

  // Handler to actually delete user
  const handleDeleteUserConfirm = async () => {
    if (!userToDelete) return;
    setActionLoading(true);
    try {
      const adminToken = localStorage.getItem('adminToken');
      axios.defaults.headers.common['Authorization'] = `Bearer ${adminToken}`;
      const response = await axios.delete(`/api/admin/delete-user/${userToDelete._id}`);
      
      // Set success message with snackbar
      setSnackbar({
        open: true,
        message: response.data.message || 'User deleted successfully',
        severity: 'success'
      });
      
      // Immediately update the verified users list
      setVerifiedUsers(prevUsers => prevUsers.filter(user => user._id !== userToDelete._id));
      
      // Update user counts in statistics
      setStats(prevStats => ({
        ...prevStats,
        users: {
          ...prevStats.users,
          total: prevStats.users.total - 1,
          verified: prevStats.users.verified - 1
        }
      }));
      
      setDeleteConfirmOpen(false);
      setUserToDelete(null);
    } catch (err) {
      // Set error message with snackbar
      setSnackbar({
        open: true,
        message: `Failed to delete user: ${err.response?.data?.error || err.message}`,
        severity: 'error'
      });
      // Still refresh data to ensure UI is in sync with backend
      await fetchDashboardData(false);
    } finally {
      setActionLoading(false);
    }
  };

  // Handler to save edited user
  const handleEditUserSave = async () => {
    if (!editUserData) return;
    setActionLoading(true);
    try {
      const adminToken = localStorage.getItem('adminToken');
      const adminInfo = localStorage.getItem('adminInfo');
      
      if (!adminToken || !adminInfo) {
        throw new Error('Admin authentication required');
      }
      
      // Set the authorization header
      axios.defaults.headers.common['Authorization'] = `Bearer ${adminToken}`;
      
      await axios.put(`/api/admin/edit-user/${editUserData._id}`, editUserData);
      
      // Set success message with snackbar
      setSnackbar({
        open: true,
        message: 'User updated successfully',
        severity: 'success'
      });
      
      setEditUserOpen(false);
      setEditUserData(null);
      // Immediately update the verified users list
      setVerifiedUsers(prevUsers => 
        prevUsers.map(user => 
          user._id === editUserData._id ? { ...user, ...editUserData } : user
        )
      );
      // Refresh all data to ensure consistency
      await fetchDashboardData();
    } catch (err) {
      // Set error message with snackbar
      setSnackbar({
        open: true,
        message: `Failed to edit user: ${err.response?.data?.error || err.message}`,
        severity: 'error'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const navigate = useNavigate();
  const [activeView, setActiveView] = useState('dashboard');
  // State for marketplace items
  const [marketplaceItems, setMarketplaceItems] = useState([]);
  const [marketplaceItemDetails, setMarketplaceItemDetails] = useState({ open: false, item: null });
  
  // State for ride share items
  const [rideShareItems, setRideShareItems] = useState([]);
  const [editRideShareOpen, setEditRideShareOpen] = useState(false);
  const [editRideShareData, setEditRideShareData] = useState(null);
  const [deleteRideShareConfirmOpen, setDeleteRideShareConfirmOpen] = useState(false);
  const [rideShareToDelete, setRideShareToDelete] = useState(null);
  
  // State for bus routes
  const [busRoutes, setBusRoutes] = useState([]);
  const [editBusRouteOpen, setEditBusRouteOpen] = useState(false);
  const [editBusRouteData, setEditBusRouteData] = useState(null);
  const [deleteBusRouteConfirmOpen, setDeleteBusRouteConfirmOpen] = useState(false);
  const [busRouteToDelete, setBusRouteToDelete] = useState(null);
  
  // State for Lost & Found management
  const [lostFoundItems, setLostFoundItems] = useState([]);
  const [editLostFoundOpen, setEditLostFoundOpen] = useState(false);
  const [editLostFoundData, setEditLostFoundData] = useState(null);
  const [deleteLostFoundOpen, setDeleteLostFoundOpen] = useState(false);
  const [lostFoundToDelete, setLostFoundToDelete] = useState(null);
  
  // Stats for dashboard
  const [stats, setStats] = useState({
    users: { total: 0, verified: 0, pending: 0 },
    marketplace: { total_items: 0 },
    rideshare: { total: 0, active: 0, booked: 0, available: 0 },
    bus_routes: { total: 0, active: 0 },
    lost_found: { total: 0, lost: 0, found: 0 },
    recent_activities: { items: [], rideshare: [], bus_routes: [], lost_found: [] }
  });
  
  // Safe access to stats to prevent undefined errors
  const safeStats = stats || {
    users: { total: 0, verified: 0, pending: 0 },
    marketplace: { total_items: 0 },
    rideshare: { total: 0, active: 0, booked: 0, available: 0 },
    bus_routes: { total: 0, active: 0 },
    lost_found: { total: 0, lost: 0, found: 0 },
    recent_activities: { items: [], rideshare: [], bus_routes: [], lost_found: [] }
  };
  
  // Fetch announcements data
  const fetchAnnouncements = async (force = false) => {
    try {
      // Check if we need to fetch (cache window)
      const now = Date.now();
      if (!force && now - lastFetched.announcements < CACHE_WINDOW) {
        return; // Use cached data
      }
      
      setLoading(true);
      const adminToken = localStorage.getItem('adminToken');
      axios.defaults.headers.common['Authorization'] = `Bearer ${adminToken}`;
      
      // Using the notificationService to fetch all announcements
      const response = await axios.get('/api/admin/announcements', {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      setAnnouncements(response.data || []);
      
      // Update last fetched timestamp
      setLastFetched(prev => ({ ...prev, announcements: now }));
    } catch (error) {
      console.error('Error fetching announcements:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.error || 'Failed to fetch announcements',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch lost & found data
  const fetchLostFoundData = async (force = false) => {
    try {
      // Check if we need to fetch (cache window)
      const now = Date.now();
      if (!force && now - lastFetched.lostfound < CACHE_WINDOW) {
        return; // Use cached data
      }
      
      setLoading(true);
      const adminToken = localStorage.getItem('adminToken');
      if (!adminToken) throw new Error('Admin authentication required');
      
      axios.defaults.headers.common['Authorization'] = `Bearer ${adminToken}`;
      
      // Fetch both lost items and found items separately to ensure we get all data
      const [lostResponse, foundResponse] = await Promise.all([
        axiosGetWithRetry('/api/admin/lost-items'),
        axiosGetWithRetry('/api/admin/found-items')
      ]);
      
      console.log('Lost items response:', lostResponse.data);
      console.log('Found items response:', foundResponse.data);
      
      // Combine and process the items
      const lostItems = (lostResponse.data?.items || []).map(item => ({
        ...item,
        type: 'lost',
        title: item.title || 'Untitled Lost Item',
        description: item.description || 'No description provided',
        category: item.category || 'Other',
        location: item.location || 'Unknown',
        status: item.status || 'active',
        formatted_date: item.date ? new Date(item.date).toLocaleDateString() : 'Unknown date',
        created_at_formatted: item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Unknown'
      }));
      
      const foundItems = (foundResponse.data?.items || []).map(item => ({
        ...item,
        type: 'found',
        title: item.title || 'Untitled Found Item',
        description: item.description || 'No description provided',
        category: item.category || 'Other',
        location: item.location || 'Unknown',
        status: item.status || 'active',
        formatted_date: item.date ? new Date(item.date).toLocaleDateString() : 'Unknown date',
        created_at_formatted: item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Unknown'
      }));
      
      // Combine all items
      const allItems = [...lostItems, ...foundItems];
      console.log('Combined lost & found items:', allItems);
      
      setLostFoundItems(allItems);
      
      // Calculate stats
      const lostFoundStats = {
        total: allItems.length,
        lost: lostItems.length,
        found: foundItems.length,
        resolved: allItems.filter(item => item.status === 'resolved').length
      };
      
      console.log('Lost & found stats:', lostFoundStats);
      
      // Update the stats in the state
      setStats(prev => ({
        ...prev,
        lostfound: lostFoundStats
      }));
      
      // Update last fetched timestamp
      setLastFetched(prev => ({ ...prev, lostfound: now }));
    } catch (error) {
      console.error('Error fetching lost & found data:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.error || 'Failed to fetch lost & found data',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Handlers for lost & found edit/delete
  const handleEditLostFound = (item) => {
    setEditLostFoundData(item);
    setEditLostFoundOpen(true);
  };
  
  const handleEditLostFoundClose = () => {
    setEditLostFoundOpen(false);
    setEditLostFoundData(null);
  };
  
  const handleDeleteLostFound = (item) => {
    setLostFoundToDelete(item);
    setDeleteLostFoundOpen(true);
  };
  
  const handleDeleteLostFoundClose = () => {
    setDeleteLostFoundOpen(false);
    setLostFoundToDelete(null);
  };
  
  const handleDeleteLostFoundConfirm = async () => {
    if (!lostFoundToDelete) return;
    
    setLostFoundActionLoading(lostFoundToDelete._id);
    try {
      const adminToken = localStorage.getItem('adminToken');
      if (!adminToken) throw new Error('Admin authentication required');
      
      axios.defaults.headers.common['Authorization'] = `Bearer ${adminToken}`;
      
      await axios.delete(`/api/admin/lost-found/${lostFoundToDelete._id}`);
      
      // Update UI immediately
      setLostFoundItems(prevItems => prevItems.filter(item => item._id !== lostFoundToDelete._id));
      
      // Update stats
      setStats(prevStats => {
        const updatedStats = { ...prevStats };
        if (updatedStats.lostfound) {
          updatedStats.lostfound.total = Math.max(0, (updatedStats.lostfound.total || 0) - 1);
          
          if (lostFoundToDelete.type === 'lost') {
            updatedStats.lostfound.lost = Math.max(0, (updatedStats.lostfound.lost || 0) - 1);
          } else if (lostFoundToDelete.type === 'found') {
            updatedStats.lostfound.found = Math.max(0, (updatedStats.lostfound.found || 0) - 1);
          }
          
          if (lostFoundToDelete.status === 'resolved') {
            updatedStats.lostfound.resolved = Math.max(0, (updatedStats.lostfound.resolved || 0) - 1);
          }
        }
        return updatedStats;
      });
      
      setSnackbar({
        open: true,
        message: `${lostFoundToDelete.type === 'lost' ? 'Lost' : 'Found'} item deleted successfully`,
        severity: 'success'
      });
      
      handleDeleteLostFoundClose();
    } catch (error) {
      console.error('Error deleting lost & found item:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.error || 'Failed to delete item',
        severity: 'error'
      });
    } finally {
      setLostFoundActionLoading('');
    }
  };
  
  const handleEditLostFoundSave = async () => {
    if (!editLostFoundData) return;
    
    setLostFoundActionLoading(editLostFoundData._id);
    try {
      const adminToken = localStorage.getItem('adminToken');
      if (!adminToken) throw new Error('Admin authentication required');
      
      axios.defaults.headers.common['Authorization'] = `Bearer ${adminToken}`;
      
      // Prepare data for update
      const updateData = {
        title: editLostFoundData.title,
        description: editLostFoundData.description,
        category: editLostFoundData.category,
        location: editLostFoundData.location,
        status: editLostFoundData.status
      };
      
      await axios.put(`/api/admin/lost-found/${editLostFoundData._id}`, updateData);
      
      // Update UI with the updated item
      setLostFoundItems(prevItems => 
        prevItems.map(item => 
          item._id === editLostFoundData._id ? 
            { 
              ...item, 
              ...updateData,
              // Add formatted fields for display
              formatted_date: item.date ? new Date(item.date).toLocaleDateString() : 'Unknown date',
              created_at_formatted: item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Unknown'
            } : item
        )
      );
      
      setSnackbar({
        open: true,
        message: `${editLostFoundData.type === 'lost' ? 'Lost' : 'Found'} item updated successfully`,
        severity: 'success'
      });
      
      handleEditLostFoundClose();
    } catch (error) {
      console.error('Error updating lost & found item:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.error || 'Failed to update item',
        severity: 'error'
      });
    } finally {
      setLostFoundActionLoading('');
    }
  };
  
  // Fetch ride share and bus routes data
  const fetchRideShareData = async (force = false) => {
    const now = Date.now();
    
    // Check if we should fetch new data based on cache window
    if (!force && lastFetched.rideshare && now - lastFetched.rideshare < CACHE_WINDOW) return;
    if (refreshDebounce) return;
    
    setRefreshDebounce(true);
    try {
      setLoading(true);
      
      // Set up admin authentication
      setupAdminAuth();
      const timestamp = new Date().getTime();
      
      // Use Promise.all to fetch both ride shares and bus routes in parallel
      const [rideShareResponse, busRoutesResponse] = await Promise.all([
        adminApiRequest(`/api/admin/rides?_=${timestamp}`),
        adminApiRequest(`/api/admin/bus-routes?_=${timestamp}`)
      ]);
      
      // Process the ride share data to include user information
      const ridesWithUserInfo = await Promise.all((rideShareResponse.data || []).map(async (ride) => {
        try {
          // Get user details for each ride
          const userResponse = await axios.get(`/api/admin/user/${ride.user_id}`);
          return {
            ...ride,
            user: userResponse.data,
            // Add additional fields for ride share management
            creator_name: userResponse.data?.name || 'Unknown',
            creator_email: userResponse.data?.email || 'No email',
            // Format booking status for display
            booking_status: ride.is_booked ? 'Booked' : 'Available',
            // Format timestamps for display
            formatted_date: new Date(ride.created_at).toLocaleDateString(),
            formatted_time: new Date(ride.created_at).toLocaleTimeString()
          };
        } catch (error) {
          console.error(`Error fetching user info for ride ${ride._id}:`, error);
          return ride;
        }
      }));
      
      // Process bus routes data
      const busRoutes = busRoutesResponse.data || [];
      
      // Set state with the fetched data
      setRideShareItems(ridesWithUserInfo);
      setBusRoutes(busRoutes);
      setLastFetched(prev => ({ ...prev, rideshare: Date.now() }));
      
      // Update stats with the new ride share and bus routes data
      const rideShareStats = {
        total: ridesWithUserInfo.length || 0,
        active: ridesWithUserInfo.filter(ride => ride.status === 'available').length || 0,
        completed: ridesWithUserInfo.filter(ride => ride.status === 'completed').length || 0,
        cancelled: ridesWithUserInfo.filter(ride => ride.status === 'cancelled').length || 0
      };
      
      console.log('Ride share stats:', rideShareStats);
      
      setStats(prev => ({
        ...prev,
        rideshare: rideShareStats,
        bus_routes: {
          total: busRoutes.length || 0,
          active: busRoutes.filter(route => route.status === 'active').length || 0
        },
        recent_activities: {
          ...prev.recent_activities,
          rideshare: ridesWithUserInfo.slice(0, 5) || [],
          bus_routes: busRoutes.slice(0, 5) || []
        }
      }));
    } catch (err) {
      console.error('Error fetching ride share posts:', err);
      let errorMsg = err.response?.data?.error || err.message;
      if (err.response?.status === 429) {
        errorMsg = 'Too many requests. Please wait a moment and try again.';
        setRetryInfo({ type: 'rideshare', show: true });
        setTimeout(() => {
          setRetryInfo({ type: '', show: false });
          fetchRideShareData(true);
        }, 10000);
      }
      setSnackbar({
        open: true,
        message: errorMsg,
        severity: err.response?.status === 429 ? 'warning' : 'error',
        action: err.response?.status === 429 ? (
          <Button color="inherit" size="small" onClick={() => fetchRideShareData(true)}>
            Retry
          </Button>
        ) : undefined
      });
      setRideShareItems([]);
    } finally {
      setLoading(false);
      setRefreshDebounce(false);
    }
  };

  // Handlers for ride share edit/delete
  const handleEditRideShare = (item) => {
    setEditRideShareData(item);
    setEditRideShareOpen(true);
  };
  
  const handleEditRideShareClose = () => {
    setEditRideShareOpen(false);
    setEditRideShareData(null);
  };
  
  const handleDeleteRideShare = (item) => {
    setRideShareToDelete(item);
    setDeleteRideShareConfirmOpen(true);
  };
  
  const handleDeleteRideShareClose = () => {
    setDeleteRideShareConfirmOpen(false);
    setRideShareToDelete(null);
  };
  
  const handleDeleteRideShareConfirm = async () => {
    if (!rideShareToDelete) return;
    setActionLoading(true);
    try {
      const adminToken = localStorage.getItem('adminToken');
      axios.defaults.headers.common['Authorization'] = `Bearer ${adminToken}`;
      // Use the correct API endpoint for deleting ride shares
      const response = await axios.delete(`/api/admin/rides/${rideShareToDelete._id}`);
      
      setSnackbar({
        open: true,
        message: response.data.message || 'Ride share post deleted successfully',
        severity: 'success'
      });
      
      // Update the UI immediately
      setRideShareItems(prev => prev.filter(item => item._id !== rideShareToDelete._id));
      
      // Update stats
      setStats(prev => {
        const isActive = rideShareToDelete.status === 'active';
        return {
          ...prev,
          rideshare: {
            ...prev.rideshare,
            total_posts: (prev.rideshare?.total_posts || 0) - 1,
            active: isActive ? (prev.rideshare?.active || 0) - 1 : (prev.rideshare?.active || 0),
            inactive: !isActive ? (prev.rideshare?.inactive || 0) - 1 : (prev.rideshare?.inactive || 0)
          },
          recent_activities: {
            ...prev.recent_activities,
            rideshare: prev.recent_activities.rideshare?.filter(item => item._id !== rideShareToDelete._id) || []
          }
        };
      });
      
      setDeleteRideShareConfirmOpen(false);
      setRideShareToDelete(null);
      
      // Refresh data to ensure consistency
      await fetchRideShareData(true);
    } catch (err) {
      console.error('Error deleting ride share:', err);
      setSnackbar({
        open: true,
        message: err.response?.data?.error || err.message,
        severity: 'error'
      });
    } finally {
      setActionLoading(false);
    }
  };
  
  // Handler for saving edited ride share
  const handleEditRideShareSave = async () => {
    if (!editRideShareData) return;
    setActionLoading(true);
    try {
      const adminToken = localStorage.getItem('adminToken');
      axios.defaults.headers.common['Authorization'] = `Bearer ${adminToken}`;
      
      // Use the correct API endpoint for updating ride shares
      const response = await axios.put(`/api/admin/rides/${editRideShareData._id}`, editRideShareData);
      
      setSnackbar({
        open: true,
        message: 'Ride share post updated successfully',
        severity: 'success'
      });
      
      // Update the UI immediately
      setRideShareItems(prevItems =>
        prevItems.map(item =>
          item._id === editRideShareData._id ? { ...item, ...editRideShareData } : item
        )
      );
      
      // Update recent activities if needed
      setStats(prev => ({
        ...prev,
        recent_activities: {
          ...prev.recent_activities,
          rideshare: prev.recent_activities.rideshare?.map(item =>
            item._id === editRideShareData._id ? { ...item, ...editRideShareData } : item
          ) || []
        }
      }));
      
      setEditRideShareOpen(false);
      setEditRideShareData(null);
      
      // Refresh data to ensure consistency
      await fetchRideShareData(true);
    } catch (err) {
      console.error('Error updating ride share:', err);
      setSnackbar({
        open: true,
        message: `Failed to update ride share: ${err.response?.data?.error || err.message}`,
        severity: 'error'
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Call fetchRideShareData when needed (e.g., on mount or when switching views)
  useEffect(() => {
    if (activeView === 'rideshare') fetchRideShareData();
    if (activeView === 'marketplace') fetchMarketplaceData();
    // Add similar logic for users, pending, and stats if needed
  }, [activeView]);



  useEffect(() => {
    // Set initial data fetching
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (activeView === 'rideshare') fetchRideShareData();
    if (activeView === 'marketplace') fetchMarketplaceData();
    if (activeView === 'lostfound') fetchLostFoundData();
    // Add similar logic for users, pending, and stats if needed
  }, [activeView]);

  // Data fetchers (stub implementations)
  const fetchMarketplaceData = async (force = false) => {
    const now = Date.now();
    if (!force && now - lastFetched.marketplace < CACHE_WINDOW) return;
    if (refreshDebounce) return;
    setRefreshDebounce(true);
    try {
      setLoading(true);
      const adminToken = localStorage.getItem('adminToken');
      const adminInfoStr = localStorage.getItem('adminInfo');
      
      if (!adminToken || !adminInfoStr) {
        throw new Error('Admin authentication required');
      }
      
      // Set the authorization header
      axios.defaults.headers.common['Authorization'] = `Bearer ${adminToken}`;
      
      // Add timestamp to requests to prevent caching
      const timestamp = new Date().getTime();
      const response = await axiosGetWithRetry(`/api/marketplace/items?_=${timestamp}`);
      setMarketplaceItems(response.data || []);
      setLastFetched(prev => ({ ...prev, marketplace: Date.now() }));
      
      // Update stats with the new marketplace data
      setStats(prev => ({
        ...prev,
        marketplace: {
          total_items: response.data?.length || 0
        },
        recent_activities: {
          ...prev.recent_activities,
          items: response.data?.slice(0, 5) || [] // Show only 5 most recent items
        }
      }));
    } catch (err) {
      console.error('Error fetching marketplace items:', err);
      let errorMsg = err.response?.data?.error || err.message;
      if (err.response?.status === 429) {
        errorMsg = 'Too many requests. Please wait a moment and try again.';
        setRetryInfo({ type: 'marketplace', show: true });
        setTimeout(() => {
          setRetryInfo({ type: '', show: false });
          fetchMarketplaceData(true);
        }, 10000); // auto-retry after 10s
      }
      setSnackbar({
        open: true,
        message: errorMsg,
        severity: err.response?.status === 429 ? 'warning' : 'error',
        action: err.response?.status === 429 ? (
          <Button color="inherit" size="small" onClick={() => fetchMarketplaceData(true)}>
            Retry
          </Button>
        ) : undefined
      });
      setMarketplaceItems([]);
    } finally {
      setLoading(false);
      setRefreshDebounce(false);
    }
  };

  // Handlers for Marketplace
  const handleViewMarketplaceItem = (item) => {
    setMarketplaceItemDetails({ open: true, item });
  };
  const handleCloseMarketplaceItemDetails = () => {
    setMarketplaceItemDetails({ open: false, item: null });
  };

  // Handlers for editing and deleting marketplace items

  // Marketplace Edit and Delete handlers
  const [editMarketplaceOpen, setEditMarketplaceOpen] = useState(false);
  const [editMarketplaceData, setEditMarketplaceData] = useState(null);
  const [deleteMarketplaceOpen, setDeleteMarketplaceOpen] = useState(false);
  const [marketplaceToDelete, setMarketplaceToDelete] = useState(null);
  const [marketplaceActionLoading, setMarketplaceActionLoading] = useState(''); // item id for which action is loading

  const handleEditMarketplaceItem = (item) => {
    // Prevent editing sold items
    if (item.sold) {
      setSnackbar({
        open: true,
        message: 'Sold items cannot be edited, but they can be deleted',
        severity: 'warning'
      });
      return;
    }
    setEditMarketplaceData(item);
    setEditMarketplaceOpen(true);
  };
  const handleEditMarketplaceClose = () => {
    setEditMarketplaceOpen(false);
    setEditMarketplaceData(null);
  };
  const handleEditMarketplaceSave = async () => {
    if (!editMarketplaceData) return;
    setMarketplaceActionLoading(editMarketplaceData._id);
    try {
      const adminToken = localStorage.getItem('adminToken');
      const adminInfoStr = localStorage.getItem('adminInfo');
      
      if (!adminToken || !adminInfoStr) {
        throw new Error('Admin authentication required');
      }
      
      // Set the authorization header
      axios.defaults.headers.common['Authorization'] = `Bearer ${adminToken}`;
      
      // Use the admin-specific endpoint for marketplace item editing
      // This endpoint bypasses regular user verification and allows admins to edit unsold items
      await axios.put(`/api/admin/marketplace/items/${editMarketplaceData._id}`, editMarketplaceData);
      setEditMarketplaceOpen(false);
      setEditMarketplaceData(null);
      
      // Immediately update the UI
      setMarketplaceItems(prevItems =>
        prevItems.map(item =>
          item._id === editMarketplaceData._id ? { ...item, ...editMarketplaceData } : item
        )
      );
      
      // Update recent activities if needed
      setStats(prev => ({
        ...prev,
        recent_activities: {
          ...prev.recent_activities,
          items: prev.recent_activities.items.map(item =>
            item._id === editMarketplaceData._id ? { ...item, ...editMarketplaceData } : item
          )
        }
      }));
      
      // Refresh all data to ensure consistency
      await fetchMarketplaceData();
      await fetchDashboardData();
    } catch (err) {
      console.error('Error editing marketplace item:', err);
      setSnackbar({
        open: true,
        message: `Failed to edit item: ${err.response?.data?.error || err.message}`,
        severity: 'error'
      });
    } finally {
      setMarketplaceActionLoading('');
    }
  };
  const handleDeleteMarketplaceItem = (item) => {
    setMarketplaceToDelete(item);
    setDeleteMarketplaceOpen(true);
  };
  const handleDeleteMarketplaceClose = () => {
    setDeleteMarketplaceOpen(false);
    setMarketplaceToDelete(null);
  };
  const handleDeleteMarketplaceConfirm = async () => {
    if (!marketplaceToDelete) return;
    setMarketplaceActionLoading(marketplaceToDelete._id);
    try {
      const adminToken = localStorage.getItem('adminToken');
      const adminInfoStr = localStorage.getItem('adminInfo');
      
      if (!adminToken || !adminInfoStr) {
        throw new Error('Admin authentication required');
      }
      
      // Set the authorization header
      axios.defaults.headers.common['Authorization'] = `Bearer ${adminToken}`;
      
      // Use the admin-specific endpoint for marketplace item deletion
      // This endpoint bypasses regular user verification and allows admins to delete any item
      await axios.delete(`/api/admin/marketplace/items/${marketplaceToDelete._id}`);
      setDeleteMarketplaceOpen(false);
      setMarketplaceToDelete(null);
      
      // Immediately update the UI
      setMarketplaceItems(prevItems => prevItems.filter(item => item._id !== marketplaceToDelete._id));
      
      // Update stats
      setStats(prev => ({
        ...prev,
        marketplace: {
          ...prev.marketplace,
          total_items: (prev.marketplace?.total_items || 0) - 1
        },
        recent_activities: {
          ...prev.recent_activities,
          items: prev.recent_activities.items.filter(item => item._id !== marketplaceToDelete._id)
        }
      }));
      
      // Refresh all data to ensure consistency
      await fetchMarketplaceData();
      await fetchDashboardData();
    } catch (err) {
      console.error('Error deleting marketplace item:', err);
      setSnackbar({
        open: true,
        message: `Failed to delete item: ${err.response?.data?.error || err.message}`,
        severity: 'error'
      });
    } finally {
      setMarketplaceActionLoading('');
    }
  };



  const [loading, setLoading] = useState(true);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [verifiedUsers, setVerifiedUsers] = useState([]);
  
  const [tokenVerified, setTokenVerified] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);


  useEffect(() => {
    document.body.classList.add('admin-dashboard-page');
    return () => document.body.classList.remove('admin-dashboard-page');
  }, []);
  
  // Fetch announcements when component mounts
  useEffect(() => {
    if (tokenVerified) {
      fetchAnnouncements();
    }
  }, [tokenVerified]);

  // Check if admin is logged in
  useEffect(() => {
    console.log("AdminDashboard mounted, checking auth...");
    
    const adminToken = localStorage.getItem('adminToken');
    const adminInfo = localStorage.getItem('adminInfo');
    
    console.log("Admin token:", adminToken ? "Present" : "Missing");
    console.log("Admin info:", adminInfo);
    
    if (!adminToken) {
      console.log("No admin token found, redirecting to login");
      navigate('/admin/login');
      return;
    }

    // Set up axios default headers
    axios.defaults.headers.common['Authorization'] = `Bearer ${adminToken}`;
    console.log("Authorization header set");

    // If we've already verified the token in this session, skip verification
    if (tokenVerified) {
      console.log("Token already verified in this session");
      fetchDashboardData();
      return;
    }

    // Attempt to fetch dashboard data directly
    // If it fails due to auth issues, then redirect to login
    fetchDashboardData()
      .then(() => {
        setTokenVerified(true);
        
        // Set up polling to check for updates every 10 seconds
        const intervalId = setInterval(() => {
          fetchDashboardData(false); // Pass false to avoid showing loading state
        }, 10000);
        
        // Store the interval ID in a ref so we can clear it on unmount
        return () => clearInterval(intervalId);
      })
      .catch(err => {
        console.error("Dashboard data fetch failed, likely an auth issue:", err);
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminInfo');
          navigate('/admin/login');
        } else if (err.response?.status === 429) {
          // Rate limit error
          setSnackbar({
            open: true,
            message: "Rate limit exceeded. Please wait a moment and try again.",
            severity: 'error'
          });
          return false;
        }
      });
      
    // Clean up function to clear any intervals when component unmounts
    return () => {
      // This will be replaced by the actual cleanup function when the promise resolves
      console.log("AdminDashboard unmounting...");
    };
  }, [navigate, tokenVerified]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleManageRideShare = () => {
    setActiveView('rideshare');
  };

  const fetchDashboardData = async (showLoading = true) => {
    // Check if we're on the admin dashboard page
    const isAdminDashboard = window.location.pathname.includes('/admin');
    if (!isAdminDashboard) {
      console.log("Not on admin dashboard, skipping admin data fetch");
      return;
    }
    
    if (refreshDebounce) return; // Prevent rapid refresh
    setRefreshDebounce(true);
    setTimeout(() => setRefreshDebounce(false), 2000); // 2s debounce

    if (showLoading) {
      setLoading(true);
    }
    try {
      console.log("Fetching admin dashboard data...");
      
      // Create default empty stats in case of failure
      const defaultStats = {
        users: { total: 0, verified: 0, pending: 0 },
        marketplace: { total_items: 0 },
        recent_activities: { items: [] }
      };
      
      try {
        // Add timestamp to requests to prevent caching
        const timestamp = new Date().getTime();
        
        // Set up admin authentication for all requests
        setupAdminAuth();
        
        // Get statistics with cache busting
        console.log("Fetching statistics...");
        const statsResponse = await adminApiRequest(`/api/admin/statistics?_=${timestamp}`);
        console.log("Statistics response:", statsResponse.data);
        
        // Get marketplace items count with cache busting
        const marketplaceResponse = await axiosGetWithRetry(`/api/marketplace/items?_=${timestamp}`);
        const marketplaceItemsCount = marketplaceResponse.data?.length || 0;
        
        // Get ride share data with cache busting
        console.log("Fetching ride share data...");
        const rideShareResponse = await adminApiRequest(`/api/admin/rides?_=${timestamp}`);
        console.log("Ride share response:", rideShareResponse.data);
        const rideShareItems = rideShareResponse.data || [];
        setRideShareItems(rideShareItems);
        
        // Combine stats with real-time marketplace count and ride share data
        const combinedStats = {
          ...statsResponse.data,
          marketplace: {
            total_items: marketplaceItemsCount
          },
          rideshare: {
            // Check if statsResponse.data.rideshare exists, if not use an empty object
            ...(statsResponse.data.rideshare || {}),
            total: rideShareItems.length || (statsResponse.data.rideshare?.total || 0),
            active: rideShareItems.filter(ride => ride.status === 'available').length || (statsResponse.data.rideshare?.active || 0),
            completed: rideShareItems.filter(ride => ride.status === 'completed').length || (statsResponse.data.rideshare?.completed || 0),
            cancelled: rideShareItems.filter(ride => ride.status === 'cancelled').length || (statsResponse.data.rideshare?.cancelled || 0)
          },
          recent_activities: {
            items: marketplaceResponse.data?.slice(0, 5) || [], // Show only 5 most recent items
            rideshare: rideShareItems.slice(0, 5) || [] // Show only 5 most recent ride shares
          }
        };
        
        console.log("Combined stats:", combinedStats);
        setStats(combinedStats);
        setMarketplaceItems(marketplaceResponse.data || []);
      } catch (statsErr) {
        console.error("Error fetching statistics:", statsErr);
        setStats(defaultStats);
        let errorMsg = statsErr.response?.data?.error || statsErr.message;
        if (statsErr.response?.status === 429) errorMsg = 'Too many requests. Please wait a moment and try again.';
        setSnackbar({
          open: true,
          message: `Failed to load dashboard data: ${errorMsg}`,
          severity: statsErr.response?.status === 429 ? 'warning' : 'error'
        });
      }

      try {
        // Add timestamp to prevent caching
        const pendingTimestamp = new Date().getTime();
        
        // Get pending users with cache busting
        const pendingResponse = await adminApiRequest(`/api/admin/pending-users?_=${pendingTimestamp}`);
        console.log("Pending users response:", pendingResponse.data);
        
        // Check if there are new pending users that weren't in our list before
        const newPendingUsers = pendingResponse.data || [];
        const currentPendingIds = pendingUsers.map(user => user._id);
        const hasNewPendingUsers = newPendingUsers.some(user => !currentPendingIds.includes(user._id));
        
        if (hasNewPendingUsers && pendingUsers.length > 0) {
          setSnackbar({
            open: true,
            message: 'New registration requests received!',
            severity: 'info'
          });
        }
        
        setPendingUsers(newPendingUsers);
        
        // Update stats with real pending count
        setStats(prev => ({
          ...prev,
          users: {
            ...prev.users,
            pending: newPendingUsers.length || 0
          }
        }));
      } catch (pendingErr) {
        console.error("Error fetching pending users:", pendingErr);
        setPendingUsers([]);
        setSnackbar({
          open: true,
          message: `Failed to load pending users: ${pendingErr.response?.data?.error || pendingErr.message}`,
          severity: 'error'
        });
      }

      try {
        // Add timestamp to prevent caching
        const verifiedTimestamp = new Date().getTime();
        
        // Get verified users with cache busting
        const verifiedResponse = await adminApiRequest(`/api/admin/verified-users?_=${verifiedTimestamp}`);
        console.log("Verified users response:", verifiedResponse.data);
        
        // Check if there are changes in the verified users list
        const newVerifiedUsers = verifiedResponse.data || [];
        const currentVerifiedIds = verifiedUsers.map(user => user._id);
        
        // Find users that are in our current list but not in the new list (deleted users)
        const deletedUsers = verifiedUsers.filter(user => 
          !newVerifiedUsers.some(newUser => newUser._id === user._id)
        );
        
        if (deletedUsers.length > 0 && verifiedUsers.length > 0) {
          // This means some users were deleted from the database but still showing in our UI
          // We'll update the UI to match the database
          console.log('Detected deleted users that were still in UI:', deletedUsers);
        }
        
        setVerifiedUsers(newVerifiedUsers);
        
        // Update stats with real verified count
        setStats(prev => ({
          ...prev,
          users: {
            ...prev.users,
            verified: newVerifiedUsers.length || 0,
            total: (newVerifiedUsers.length || 0) + (prev.users.pending || 0)
          }
        }));
      } catch (verifiedErr) {
        console.error("Error fetching verified users:", verifiedErr);
        setVerifiedUsers([]);
        setSnackbar({
          open: true,
          message: `Failed to load verified users: ${verifiedErr.response?.data?.error || verifiedErr.message}`,
          severity: 'error'
        });
      }
      
      return true;
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setSnackbar({
        open: true,
        message: `Failed to load dashboard data: ${err.response?.data?.error || err.message}`,
        severity: 'error'
      });
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const handleApproveUser = async (userId) => {
    setActionLoading(userId);
    try {
      const adminToken = localStorage.getItem('adminToken');
      const adminInfoStr = localStorage.getItem('adminInfo');
      
      if (!adminToken || !adminInfoStr) {
        throw new Error('Admin authentication required');
      }
      
      // Set the authorization header
      axios.defaults.headers.common['Authorization'] = `Bearer ${adminToken}`;
      
      await axios.put(`/api/admin/approve-user/${userId}`);
      
      // Update UI immediately
      const approvedUser = pendingUsers.find(user => user._id === userId);
      
      // Remove from pending users list
      setPendingUsers(prevUsers => prevUsers.filter(user => user._id !== userId));
      
      // Add to verified users list if we have the user data
      if (approvedUser) {
        const updatedUser = {
          ...approvedUser,
          verification_status: 'approved',
          approved_at: new Date().toISOString()
        };
        
        // Make sure we don't add duplicates
        setVerifiedUsers(prevUsers => {
          // Check if user already exists in verified list
          const userExists = prevUsers.some(user => user._id === userId);
          if (userExists) {
            // Replace the existing user with updated data
            return prevUsers.map(user => 
              user._id === userId ? updatedUser : user
            );
          } else {
            // Add the new user to the top of the list
            return [updatedUser, ...prevUsers];
          }
        });
      }
      
      // Update user counts in statistics
      setStats(prevStats => ({
        ...prevStats,
        users: {
          ...prevStats.users,
          total: prevStats.users.total,
          verified: prevStats.users.verified + 1,
          pending: prevStats.users.pending - 1
        }
      }));
      
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
      // Refresh data in the background to ensure consistency
      fetchDashboardData(false);
    }
  };

  const handleRejectUser = async (userId) => {
    setActionLoading(userId);
    try {
      const adminToken = localStorage.getItem('adminToken');
      const adminInfoStr = localStorage.getItem('adminInfo');
      
      if (!adminToken || !adminInfoStr) {
        throw new Error('Admin authentication required');
      }
      
      // Set the authorization header
      axios.defaults.headers.common['Authorization'] = `Bearer ${adminToken}`;
      
      await axios.put(`/api/admin/reject-user/${userId}`);
      
      // Update UI immediately
      setPendingUsers(prevUsers => prevUsers.filter(user => user._id !== userId));
      
      // Update user counts in statistics
      setStats(prevStats => ({
        ...prevStats,
        users: {
          ...prevStats.users,
          total: prevStats.users.total - 1,
          pending: prevStats.users.pending - 1
        }
      }));
      
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
      // Refresh data in the background to ensure consistency
      fetchDashboardData(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminInfo');
    // Navigate to homepage instead of login
    navigate('/');
  };

  // Handler for navigating to student pages while preserving admin session
  const handleStudentPageNavigation = (path) => {
    try {
      // Set admin visiting flag
      localStorage.setItem('adminVisitingStudentPage', 'true');
      
      // Get admin credentials
      const adminToken = localStorage.getItem('adminToken');
      const adminInfo = localStorage.getItem('adminInfo');
      
      if (!adminToken || !adminInfo) {
        throw new Error('Admin credentials missing');
      }
      
      // Save admin credentials in special keys
      localStorage.setItem('lastAdminToken', adminToken);
      localStorage.setItem('lastAdminInfo', adminInfo);
      
      // IMPORTANT: Create a temporary user token for SharedRoute to recognize
      // This ensures we don't get redirected to login
      localStorage.setItem('token', adminToken);
      
      // Set axios headers
      axios.defaults.headers.common['Authorization'] = `Bearer ${adminToken}`;
      
      // Correct path if needed
      const correctedPath = path === '/ride-sharing' ? '/ride-booking' : path;
      
      // Navigate to page
      console.log(`Admin navigating to: ${correctedPath}`);
      navigate(correctedPath);
    } catch (error) {
      console.error('Error during navigation:', error);
      // Fallback to login if there's a problem
      navigate('/admin-login');
    }
  };

  const [userDetailsOpen, setUserDetailsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const handleViewUserDetails = (user) => {
    setSelectedUser(user);
    setUserDetailsOpen(true);
  };

  const handleCloseUserDetails = () => {
    setUserDetailsOpen(false);
    setSelectedUser(null);
  };
  
  // Define the drawer content using React.createElement instead of JSX
  const drawerContent = React.createElement(
    'div',
    null,
    React.createElement(
      Toolbar,
      null,
      React.createElement(
        Typography,
        { variant: 'h6', noWrap: true, component: 'div' },
        'Admin Panel'
      )
    ),
    React.createElement(Divider, null),
    React.createElement(
      List,
      null,
      React.createElement(
        ListItem,
        { 
          button: true, 
          onClick: () => setActiveView('dashboard'),
          sx: { 
            backgroundColor: activeView === 'dashboard' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
            borderRadius: '8px',
            margin: '4px 8px',
            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
          }
        },
        React.createElement(
          ListItemIcon,
          { sx: { color: '#90caf9' } },
          React.createElement(DashboardIcon)
        ),
        React.createElement(ListItemText, { primary: 'Dashboard Overview', sx: { color: 'white' } })
      ),
      React.createElement(
        ListItem,
        { 
          button: true, 
          onClick: () => setActiveView('users'),
          sx: { 
            backgroundColor: activeView === 'users' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
            borderRadius: '8px',
            margin: '4px 8px',
            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
          }
        },
        React.createElement(
          ListItemIcon,
          { sx: { color: '#81c784' } },
          React.createElement(DoneAllIcon)
        ),
        React.createElement(ListItemText, { primary: 'Verified Users', sx: { color: 'white' } })
      ),
      React.createElement(
        ListItem,
        { 
          button: true, 
          onClick: () => setActiveView('pending'),
          sx: { 
            backgroundColor: activeView === 'pending' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
            borderRadius: '8px',
            margin: '4px 8px',
            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
          }
        },
        React.createElement(
          ListItemIcon,
          { sx: { color: '#ffb74d' } },
          React.createElement(PendingActionsIcon)
        ),
        React.createElement(ListItemText, { primary: 'Pending Users', sx: { color: 'white' } })
      ),
      React.createElement(
        ListItem,
        { 
          button: true, 
          onClick: () => setActiveView('marketplace'),
          sx: { 
            backgroundColor: activeView === 'marketplace' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
            borderRadius: '8px',
            margin: '4px 8px',
            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
          }
        },
        React.createElement(
          ListItemIcon,
          { sx: { color: '#ce93d8' } },
          React.createElement(StoreIcon)
        ),
        React.createElement(ListItemText, { primary: 'Marketplace', sx: { color: 'white' } })
      ),
      React.createElement(
        ListItem,
        { 
          button: true, 
          onClick: () => setActiveView('rideshare'),
          sx: { 
            backgroundColor: activeView === 'rideshare' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
            borderRadius: '8px',
            margin: '4px 8px',
            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
          }
        },
        React.createElement(
          ListItemIcon,
          { sx: { color: '#80deea' } },
          React.createElement(DirectionsCarIcon)
        ),
        React.createElement(ListItemText, { primary: 'Ride Share', sx: { color: 'white' } })
      ),
      React.createElement(
        ListItem,
        { 
          button: true, 
          onClick: () => setActiveView('lostfound'),
          sx: { 
            backgroundColor: activeView === 'lostfound' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
            borderRadius: '8px',
            margin: '4px 8px',
            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
          }
        },
        React.createElement(
          ListItemIcon,
          { sx: { color: '#ef9a9a' } },
          React.createElement(HelpIcon)
        ),
        React.createElement(ListItemText, { primary: 'Lost & Found', sx: { color: 'white' } })
      ),
      React.createElement(
        ListItem,
        { 
          button: true, 
          onClick: () => {
            setActiveView('announcements');
            setShowAnnouncementForm(true);
            // Fetch announcements when clicking on this menu item
            fetchAnnouncements();
          },
          sx: { 
            backgroundColor: activeView === 'announcements' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
            borderRadius: '8px',
            margin: '4px 8px',
            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
          }
        },
        React.createElement(
          ListItemIcon,
          { sx: { color: '#aed581' } },
          React.createElement(NotificationsIcon)
        ),
        React.createElement(ListItemText, { primary: 'Announcements', sx: { color: 'white' } })
      ),
      React.createElement(
        ListItem,
        { 
          button: true, 
          onClick: handleLogout,
          sx: { 
            backgroundColor: 'rgba(255, 255, 255, 0.15)', 
            marginTop: 2, 
            borderRadius: '8px',
            margin: '12px 8px 4px 8px',
            '&:hover': { backgroundColor: 'rgba(244, 67, 54, 0.2)' }
          }
        },
        React.createElement(
          ListItemIcon,
          { sx: { color: '#ef5350' } },
          React.createElement(ExitToAppIcon)
        ),
        React.createElement(ListItemText, { primary: 'Logout', sx: { color: 'white', fontWeight: 'bold' } })
      )
    ),
    React.createElement(Divider, null),
    React.createElement(
      List,
      null,
      React.createElement(
        ListItem,
        { button: true, onClick: () => handleStudentPageNavigation('/marketplace') },
        React.createElement(
          ListItemIcon,
          null,
          React.createElement(StoreIcon, null)
        ),
        React.createElement(ListItemText, { primary: 'Visit Marketplace' })
      ),
      React.createElement(
        ListItem,
        { button: true, onClick: () => handleStudentPageNavigation('/lost-found') },
        React.createElement(
          ListItemIcon,
          null,
          React.createElement(HelpOutlineIcon, null)
        ),
        React.createElement(ListItemText, { primary: 'Visit Lost & Found' })
      ),
      React.createElement(
        ListItem,
        { button: true, onClick: () => handleStudentPageNavigation('/ride-sharing') },
        React.createElement(
          ListItemIcon,
          null,
          React.createElement(DirectionsCarIcon, null)
        ),
        React.createElement(ListItemText, { primary: 'Visit Ride Share' })
      )
    )
  );

  // Render different content based on active view
  const renderContent = () => {
    if (activeView === 'announcements' && showAnnouncementForm) {
      return (
        <Box sx={{ mt: 2 }}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Manage Announcements</Typography>
              <IconButton onClick={() => {
                setShowAnnouncementForm(false);
                setActiveView('dashboard');
              }}>
                <CloseIcon />
              </IconButton>
            </Box>
            <AnnouncementForm onClose={() => {
              setShowAnnouncementForm(false);
              setActiveView('dashboard');
            }} />
          </Paper>
        </Box>
      );
    } else if (activeView === 'lostfound') {
      // Import the LostFoundManagement component dynamically
      const LostFoundManagement = React.lazy(() => import('./admin/LostFoundManagement'));
      
      return React.createElement(
        Box, 
        { sx: { mt: 2 } },
        React.createElement(
          Typography, 
          { variant: 'h5', sx: { mb: 3 } },
          'Manage Lost & Found'
        ),
        React.createElement(
          React.Suspense,
          { 
            fallback: React.createElement(
              Box, 
              { sx: { display: 'flex', justifyContent: 'center', my: 4 } },
              React.createElement(CircularProgress, null)
            ) 
          },
          React.createElement(LostFoundManagement, null)
        )
      );
    } else if (activeView === 'rideshare') {
      return React.createElement(
        Box, 
        { sx: { mt: 2 } },
        React.createElement(
          Typography, 
          { variant: 'h5', sx: { mb: 3 } },
          'Manage Ride Share'
        ),
        React.createElement(RideShareList, {
          adminView: true,
          items: rideShareItems,
          onEdit: handleEditRideShare,
          onDelete: handleDeleteRideShare
        }),
        // Edit Ride Share Dialog
        React.createElement(
          Dialog, 
          { 
            open: editRideShareOpen, 
            onClose: handleEditRideShareClose, 
            maxWidth: 'sm', 
            fullWidth: true 
          },
          React.createElement(DialogTitle, null, 'Edit Ride Share Post'),
          React.createElement(
            DialogContent,
            null,
            React.createElement(TextField, {
              margin: 'normal',
              label: 'Title',
              fullWidth: true,
              value: editRideShareData?.title || '',
              onChange: e => setEditRideShareData({ ...editRideShareData, title: e.target.value })
            })
          ),
          React.createElement(
            DialogActions,
            null,
            React.createElement(Button, { onClick: handleEditRideShareClose }, 'Cancel'),
            React.createElement(
              Button, 
              { 
                variant: 'contained', 
                color: 'primary', 
                onClick: async () => {
                  setActionLoading(true);
                  try {
                    const adminToken = localStorage.getItem('adminToken');
                    axios.defaults.headers.common['Authorization'] = `Bearer ${adminToken}`;
                    const response = await axios.put(`/api/rideshare/edit/${editRideShareData._id}`, editRideShareData);
                    setSnackbar({
                      open: true,
                      message: response.data.message || 'Ride share post updated',
                      severity: 'success'
                    });
                    setEditRideShareOpen(false);
                    setEditRideShareData(null);
                    await fetchRideShareData();
                  } catch (err) {
                    setSnackbar({
                      open: true,
                      message: err.response?.data?.error || err.message,
                      severity: 'error'
                    });
                  } finally {
                    setActionLoading(false);
                  }
                }
              },
              'Save'
            )
          )
        ),
        // Delete Ride Share Confirmation Dialog
        React.createElement(
          Dialog, 
          { 
            open: deleteRideShareConfirmOpen, 
            onClose: handleDeleteRideShareClose 
          },
          React.createElement(DialogTitle, null, 'Delete Ride Share Post'),
          React.createElement(
            DialogContent,
            null,
            'Are you sure you want to delete this ride share post?'
          ),
          React.createElement(
            DialogActions,
            null,
            React.createElement(Button, { onClick: handleDeleteRideShareClose }, 'Cancel'),
            React.createElement(
              Button, 
              { 
                color: 'error', 
                variant: 'contained', 
                onClick: handleDeleteRideShareConfirm 
              },
              'Delete'
            )
          )
        )
      );
    }
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 8 }}>
          <CircularProgress />
        </Box>
      );
    }

    switch (activeView) {
      case 'dashboard':
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h5" sx={{ mb: 3, color: '#1a237e', fontWeight: 'bold', textShadow: '1px 1px 2px rgba(0,0,0,0.1)' }}>Dashboard Overview</Typography>
            
            {/* Scrolling Announcements */}
            <Paper sx={{ 
              p: 2, 
              mb: 3, 
              borderRadius: '12px', 
              overflow: 'hidden',
              background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
            }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ color: '#2e7d32', fontWeight: 'bold' }}>
                  <NotificationsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Latest Announcements
                </Typography>
                <Button 
                  variant="contained" 
                  color="success" 
                  size="small"
                  sx={{ 
                    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)',
                    '&:hover': { boxShadow: '0 6px 12px rgba(0, 0, 0, 0.2)' }
                  }}
                  onClick={() => {
                    setActiveView('announcements');
                    handleAnnouncementClick();
                  }}
                >
                  Add Announcement
                </Button>
              </Box>
              <ScrollingAnnouncement />
            </Paper>
            
            {/* Stats Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={4}>
                <Card sx={{ 
                  background: 'linear-gradient(135deg, #fff8e1 0%, #ffe082 100%)', 
                  borderRadius: '12px', 
                  height: '100%',
                  boxShadow: '0 4px 20px rgba(255, 152, 0, 0.2)',
                  transition: 'transform 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: '0 6px 25px rgba(255, 152, 0, 0.3)'
                  }
                }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ color: '#e65100', fontWeight: 'bold' }}>Pending Verification</Typography>
                    <Typography variant="h3" sx={{ my: 1, fontWeight: 600, color: '#f57c00' }}>{safeStats.users.pending}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <PendingActionsIcon sx={{ color: '#ff9800' }} />
                      <Typography variant="body2" sx={{ ml: 1, color: '#e65100' }}>Awaiting approval</Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ 
                  background: 'linear-gradient(135deg, #f3e5f5 0%, #ce93d8 100%)', 
                  borderRadius: '12px', 
                  height: '100%',
                  boxShadow: '0 4px 20px rgba(156, 39, 176, 0.2)',
                  transition: 'transform 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: '0 6px 25px rgba(156, 39, 176, 0.3)'
                  }
                }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ color: '#4a148c', fontWeight: 'bold' }}>Marketplace Items</Typography>
                    <Typography variant="h3" sx={{ my: 1, fontWeight: 600, color: '#6a1b9a' }}>{safeStats.marketplace.total_items}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <StoreIcon sx={{ color: '#8e24aa' }} />
                      <Typography variant="body2" sx={{ ml: 1, color: '#4a148c' }}>Listed items</Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ 
                  background: 'linear-gradient(135deg, #e0f7fa 0%, #80deea 100%)', 
                  borderRadius: '12px', 
                  height: '100%',
                  boxShadow: '0 4px 20px rgba(0, 188, 212, 0.2)',
                  transition: 'transform 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: '0 6px 25px rgba(0, 188, 212, 0.3)'
                  }
                }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ color: '#006064', fontWeight: 'bold' }}>Ride Share Posts</Typography>
                    <Typography variant="h3" sx={{ my: 1, fontWeight: 600, color: '#00838f' }}>{safeStats.rideshare?.total || 0}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <DirectionsCarIcon sx={{ color: '#0097a7' }} />
                      <Typography variant="body2" sx={{ ml: 1, color: '#006064' }}>Active posts: {safeStats.rideshare?.active || 0}</Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ 
                  background: 'linear-gradient(135deg, #e1f5fe 0%, #81d4fa 100%)', 
                  borderRadius: '12px', 
                  height: '100%',
                  boxShadow: '0 4px 20px rgba(3, 169, 244, 0.2)',
                  transition: 'transform 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: '0 6px 25px rgba(3, 169, 244, 0.3)'
                  }
                }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ color: '#01579b', fontWeight: 'bold' }}>Lost & Found</Typography>
                    <Typography variant="h3" sx={{ my: 1, fontWeight: 600, color: '#0277bd' }}>{safeStats.lost_found?.total || 0}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <HelpIcon sx={{ color: '#0288d1' }} />
                      <Typography variant="body2" sx={{ ml: 1, color: '#01579b' }}>Lost: {safeStats.lost_found?.lost || 0} | Found: {safeStats.lost_found?.found || 0}</Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Recent activities section */}
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Paper sx={{ 
                  p: 3, 
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #e8eaf6 0%, #c5cae9 100%)',
                  boxShadow: '0 4px 20px rgba(63, 81, 181, 0.15)'
                }}>
                  <Typography variant="h6" sx={{ mb: 2, color: '#303f9f', fontWeight: 'bold' }}>Recent Activities</Typography>
                  <Divider sx={{ mb: 2 }} />
                  
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>Latest Marketplace Items</Typography>
                  {safeStats.recent_activities.items.length > 0 ? (
                    <List sx={{ width: '100%' }}>
                      {safeStats.recent_activities.items.map((item) => (
                        <ListItem key={item._id} divider>
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: '#c62828' }}>
                              <StoreIcon />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={item.title}
                            secondary={`Price: $${item.price} | Category: ${item.category}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary">No recent marketplace items</Typography>
                  )}
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>Latest Ride Share Posts</Typography>
                  {safeStats.recent_activities.rideshare && safeStats.recent_activities.rideshare.length > 0 ? (
                    <List sx={{ width: '100%' }}>
                      {safeStats.recent_activities.rideshare.map((item) => (
                        <ListItem key={item._id} divider>
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: '#388e3c' }}>
                              <DirectionsCarIcon />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={item.title}
                            secondary={`From: ${item.origin} → To: ${item.destination}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary">No recent ride share posts</Typography>
                  )}
                  
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>Latest Lost & Found Items</Typography>
                  {safeStats.recent_activities.lost_found && safeStats.recent_activities.lost_found.length > 0 ? (
                    <List sx={{ width: '100%' }}>
                      {safeStats.recent_activities.lost_found.map((item) => (
                        <ListItem key={item._id} divider>
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: '#1565c0' }}>
                              <HelpIcon />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={item.title}
                            secondary={`Type: ${item.item_type === 'lost' ? 'Lost' : 'Found'} | Location: ${item.location}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary">No recent lost & found items</Typography>
                  )}
                </Paper>
              </Grid>
            </Grid>
          </Box>
        );

      case 'pending':
        return (
          <Box sx={{ mt: 2, maxWidth: '100%' }}>
            <Typography variant="h5" sx={{ mb: 3, color: '#ed6c02', fontWeight: 'bold', textShadow: '1px 1px 2px rgba(0,0,0,0.1)' }}>Pending Verification</Typography>
            <Paper sx={{ 
              p: 3, 
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #fff8e1 0%, #fffde7 100%)',
              boxShadow: '0 4px 20px rgba(255, 152, 0, 0.1)'
            }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Pending Users ({pendingUsers.length})
                </Typography>
                <Button 
                  variant="outlined" 
                  color="primary" 
                  onClick={fetchDashboardData}
                  disabled={actionLoading !== ''}
                  size="small"
                >
                  Refresh
                </Button>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              {pendingUsers.length > 0 ? (
                <List sx={{ width: '100%', p: 0 }}>
                  {pendingUsers.map((user) => (
                    <ListItem 
                      key={user._id} 
                      divider
                      sx={{ flexWrap: { xs: 'wrap', md: 'nowrap' } }}
                      secondaryAction={
                        <Box sx={{ 
                          display: 'flex', 
                          flexWrap: 'wrap', 
                          gap: 1, 
                          width: { xs: '100%', md: 'auto' },
                          mt: { xs: 1, md: 0 }
                        }}>
                          <Button 
                            variant="outlined" 
                            color="primary" 
                            size="small" 
                            onClick={() => handleViewUserDetails(user)}
                          >
                            View
                          </Button>
                          <Button 
                            variant="contained" 
                            color="success" 
                            size="small" 
                            onClick={() => handleApproveUser(user._id)}
                            disabled={actionLoading === user._id}
                          >
                            {actionLoading === user._id ? <CircularProgress size={20} /> : 'Approve'}
                          </Button>
                          <Button 
                            variant="contained" 
                            color="error" 
                            size="small" 
                            onClick={() => handleRejectUser(user._id)}
                            disabled={actionLoading === user._id}
                          >
                            {actionLoading === user._id ? <CircularProgress size={20} /> : 'Reject'}
                          </Button>
                        </Box>
                      }
                    >
                      <ListItemAvatar>
                        <Avatar src={user.profile_picture || ''}>
                          {user.name ? user.name.charAt(0) : 'U'}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={user.name}
                        secondary={
                          <>
                            {user.email} • {user.student_id || 'No ID'} • {user.department || 'No Dept'}
                            <br />
                            Registered: {new Date(user.created_at).toLocaleDateString()}
                          </>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  py: 4
                }}>
                  <PendingActionsIcon sx={{ fontSize: 40, mb: 1, color: '#ff9800', opacity: 0.6 }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 'medium', color: '#ed6c02' }}>
                    No pending verification requests
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5, color: '#f57c00', opacity: 0.7 }}>
                    All user verification requests have been processed
                  </Typography>
                </Box>
              )}
            </Paper>
          </Box>
        );

      case 'verified':
        return React.createElement(
          Box,
          { sx: { mt: 2, maxWidth: '100%' } },
          React.createElement(
            Typography,
            { 
              variant: 'h5', 
              sx: { 
                mb: 3, 
                color: '#2e7d32', 
                fontWeight: 'bold', 
                textShadow: '1px 1px 2px rgba(0,0,0,0.1)' 
              } 
            },
            React.createElement(VerifiedUserIcon, { sx: { mr: 1, verticalAlign: 'middle' } }),
            'Verified Users'
          ),
          React.createElement(
            Paper,
            { 
              sx: { 
                p: 3, 
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
                boxShadow: '0 8px 32px rgba(76, 175, 80, 0.15)'
              } 
            },
            React.createElement(
              Box,
              { 
                sx: { 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  mb: 3 
                } 
              },
              React.createElement(
                Typography,
                { variant: 'h6', sx: { color: '#2e7d32', fontWeight: 'bold' } },
                React.createElement(PeopleIcon, { sx: { mr: 1, verticalAlign: 'middle' } }),
                `Verified Users (${verifiedUsers.length})`
              ),
              React.createElement(
                Button,
                { 
                  variant: 'contained', 
                  color: 'success', 
                  onClick: fetchDashboardData,
                  disabled: actionLoading !== '',
                  sx: { 
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(76, 175, 80, 0.2)',
                    '&:hover': {
                      boxShadow: '0 6px 16px rgba(76, 175, 80, 0.3)'
                    }
                  }
                },
                'Refresh'
              )
            ),
            React.createElement(Divider, { sx: { mb: 3 } }),
            verifiedUsers.length > 0 ? 
              React.createElement(
                Grid,
                { container: true, spacing: 3 },
                verifiedUsers.map(user => 
                  React.createElement(
                    Grid,
                    {
                      item: true,
                      xs: 12,
                      sm: 6,
                      md: 4,
                      key: user._id
                    },
                    React.createElement(
                      Card,
                      {
                        elevation: 3,
                        sx: {
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          borderRadius: '16px',
                          overflow: 'hidden',
                          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                          '&:hover': {
                            transform: 'translateY(-8px)',
                            boxShadow: '0 16px 32px rgba(76, 175, 80, 0.25)'
                          }
                        }
                      },
                      // Card Header
                      React.createElement(
                        Box,
                        {
                          sx: {
                            p: 2,
                            background: 'linear-gradient(135deg, #43a047 0%, #66bb6a 100%)',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }
                        },
                        React.createElement(
                          Box,
                          { sx: { display: 'flex', alignItems: 'center' } },
                          React.createElement(VerifiedUserIcon, { sx: { mr: 1 } }),
                          React.createElement(
                            Typography,
                            { variant: 'subtitle1', sx: { fontWeight: 'bold' } },
                            'Verified User'
                          )
                        ),
                        React.createElement(
                          Chip,
                          { 
                            label: user.approved_at ? new Date(user.approved_at).toLocaleDateString() : 'N/A',
                            size: 'small',
                            sx: { 
                              bgcolor: 'rgba(255, 255, 255, 0.25)',
                              color: 'white',
                              fontWeight: 'medium',
                              '& .MuiChip-label': { px: 1 }
                            }
                          }
                        )
                      ),
                      // User Avatar and Basic Info
                      React.createElement(
                        Box,
                        { 
                          sx: { 
                            p: 2,
                            display: 'flex',
                            alignItems: 'center',
                            borderBottom: '1px solid rgba(0, 0, 0, 0.08)'
                          } 
                        },
                        React.createElement(
                          Avatar,
                          { 
                            src: user.profile_picture || '',
                            sx: { 
                              width: 70, 
                              height: 70, 
                              mr: 2,
                              border: '3px solid #43a047',
                              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)'
                            }
                          },
                          user.name ? user.name.charAt(0).toUpperCase() : 'U'
                        ),
                        React.createElement(
                          Box,
                          null,
                          React.createElement(
                            Typography,
                            { variant: 'h6', sx: { fontWeight: 'bold', color: '#2e7d32', mb: 0.5 } },
                            user.name || 'Unknown'
                          ),
                          React.createElement(
                            Typography,
                            { 
                              variant: 'body2', 
                              sx: { 
                                display: 'flex',
                                alignItems: 'center',
                                color: 'text.secondary'
                              } 
                            },
                            React.createElement(EmailIcon, { sx: { fontSize: 16, mr: 0.5, color: '#43a047' } }),
                            user.email
                          )
                        )
                      ),
                      // User Details
                      React.createElement(
                        CardContent,
                        { sx: { flexGrow: 1, p: 2 } },
                        React.createElement(
                          Grid,
                          { container: true, spacing: 2 },
                          React.createElement(
                            Grid,
                            { item: true, xs: 6 },
                            React.createElement(
                              Box,
                              { 
                                sx: { 
                                  bgcolor: 'rgba(76, 175, 80, 0.1)', 
                                  p: 1.5, 
                                  borderRadius: '12px',
                                  height: '100%',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }
                              },
                              React.createElement(BadgeIcon, { sx: { color: '#43a047', mb: 1, fontSize: 28 } }),
                              React.createElement(
                                Typography,
                                { variant: 'body2', color: 'text.secondary', textAlign: 'center' },
                                'Student ID'
                              ),
                              React.createElement(
                                Typography,
                                { variant: 'body1', sx: { fontWeight: 'medium', textAlign: 'center', mt: 0.5 } },
                                user.student_id || 'No ID'
                              )
                            )
                          ),
                          React.createElement(
                            Grid,
                            { item: true, xs: 6 },
                            React.createElement(
                              Box,
                              { 
                                sx: { 
                                  bgcolor: 'rgba(76, 175, 80, 0.1)', 
                                  p: 1.5, 
                                  borderRadius: '12px',
                                  height: '100%',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }
                              },
                              React.createElement(SchoolIcon, { sx: { color: '#43a047', mb: 1, fontSize: 28 } }),
                              React.createElement(
                                Typography,
                                { variant: 'body2', color: 'text.secondary', textAlign: 'center' },
                                'Department'
                              ),
                              React.createElement(
                                Typography,
                                { variant: 'body1', sx: { fontWeight: 'medium', textAlign: 'center', mt: 0.5 } },
                                user.department || 'No Dept'
                              )
                            )
                          )
                        )
                      ),
                      // Card Actions
                      React.createElement(
                        CardActions,
                        { sx: { p: 2, pt: 0, justifyContent: 'space-between' } },
                        React.createElement(
                          Button,
                          { 
                            variant: 'outlined',
                            color: 'success',
                            size: 'small',
                            startIcon: React.createElement(VisibilityIcon),
                            onClick: () => handleViewUserDetails(user),
                            sx: { borderRadius: '8px' }
                          },
                          'View'
                        ),
                        React.createElement(
                          Button,
                          { 
                            variant: 'contained',
                            color: 'primary',
                            size: 'small',
                            startIcon: React.createElement(EditIcon),
                            onClick: () => handleEditUser(user),
                            sx: { borderRadius: '8px' }
                          },
                          'Edit'
                        ),
                        React.createElement(
                          Button,
                          { 
                            variant: 'contained',
                            color: 'error',
                            size: 'small',
                            startIcon: actionLoading !== user._id ? React.createElement(DeleteIcon) : null,
                            onClick: () => handleDeleteVerifiedUser(user._id),
                            disabled: actionLoading === user._id,
                            sx: { borderRadius: '8px' }
                          },
                          actionLoading === user._id ? 
                            React.createElement(CircularProgress, { size: 20 }) : 
                            'Delete'
                        )
                      )
                    )
                  )
                )
              ) : 
              React.createElement(
                Box,
                { 
                  sx: { 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center',
                    py: 4
                  }
                },
                React.createElement(VerifiedUserIcon, { sx: { fontSize: 48, mb: 2, color: '#2e7d32', opacity: 0.6 } }),
                React.createElement(
                  Typography,
                  { variant: 'subtitle1', sx: { fontWeight: 'medium', color: '#2e7d32' } },
                  'No verified users found'
                ),
                React.createElement(
                  Typography,
                  { variant: 'body2', sx: { mt: 0.5, color: '#388e3c', opacity: 0.7 } },
                  'There are currently no verified users in the system'
                )
              )
          )
        );

      case 'marketplace':
        return (
          <Box sx={{ mt: 2, maxWidth: '100%' }}>
            <Typography variant="h5" sx={{ mb: 3 }}>Manage Marketplace</Typography>
            <Paper sx={{ p: 3, borderRadius: '12px' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Marketplace Items ({marketplaceItems.length})
                </Typography>
                <Button 
                  variant="outlined" 
                  color="primary" 
                  onClick={fetchMarketplaceData}
                  disabled={actionLoading !== ''}
                  size="small"
                >
                  Refresh
                </Button>
              </Box>
              <Divider sx={{ mb: 2 }} />
              {marketplaceItems.length > 0 ?
                <List sx={{ width: '100%', p: 0 }}>
                  {marketplaceItems.map((item) => (
                    <ListItem 
                      key={item._id} 
                      divider
                      sx={{ flexWrap: { xs: 'wrap', md: 'nowrap' } }}
                      secondaryAction={
                        <Box sx={{ 
                          display: 'flex', 
                          flexWrap: 'wrap', 
                          gap: 1,
                          width: { xs: '100%', md: 'auto' },
                          mt: { xs: 1, md: 0 }
                        }}>
                          <Button 
                            variant="contained"
                            color="primary"
                            size="small"
                            onClick={() => handleViewMarketplaceItem(item)}
                          >
                            View
                          </Button>
                          <Button 
                            variant="contained"
                            color="info"
                            size="small"
                            onClick={() => handleEditMarketplaceItem(item)}
                            disabled={marketplaceActionLoading === item._id}
                          >
                            {marketplaceActionLoading === item._id ? <CircularProgress size={20} color="inherit" /> : 'Edit'}
                          </Button>
                          <Button 
                            variant="contained"
                            color="error"
                            size="small"
                            onClick={() => handleDeleteMarketplaceItem(item)}
                            disabled={marketplaceActionLoading === item._id}
                          >
                            {marketplaceActionLoading === item._id ? <CircularProgress size={20} color="inherit" /> : 'Delete'}
                          </Button>
                        </Box>
                      }
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: '#c62828' }}>
                          <StoreIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={item.title}
                        secondary={`Price: $${item.price} | Category: ${item.category}`}
                      />
                    </ListItem>
                  ))}
                </List>
              : (
                <Typography variant="body1" align="center" sx={{ py: 3 }}>
                  No marketplace items found
                </Typography>
              )}
            </Paper>
          </Box>
        );

      case 'lostfound':
        return (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h5" sx={{ mb: 3 }}>Manage Lost & Found (Demo)</Typography>
            <Paper sx={{ p: 3, borderRadius: '12px' }}>
              <Typography variant="body1" align="center" sx={{ py: 3 }}>
                Lost & Found management functionality will be implemented in another module.
              </Typography>
            </Paper>
          </Box>
        );

      case 'rideshare':
        return (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h5" sx={{ mb: 3 }}>Manage Ride Share</Typography>
            <Paper sx={{ p: 3, borderRadius: '12px' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Ride Share Posts ({rideShareItems.length})
                </Typography>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={() => fetchRideShareData(true)}
                  disabled={actionLoading !== ''}
                  size="small"
                >
                  Refresh
                </Button>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                  <CircularProgress />
                </Box>
              ) : rideShareItems.length > 0 ? (
                <RideShareList
                  adminView={true}
                  items={rideShareItems}
                  onEdit={handleEditRideShare}
                  onDelete={handleDeleteRideShare}
                />
              ) : (
                <Typography variant="body1" align="center" sx={{ py: 3 }}>
                  No ride share posts found
                </Typography>
              )}
            </Paper>
            
            {/* Edit Ride Share Dialog */}
            <Dialog open={editRideShareOpen} onClose={handleEditRideShareClose} maxWidth="sm" fullWidth>
              <DialogTitle>Edit Ride Share Post</DialogTitle>
              <DialogContent>
                {editRideShareData && (
                  <Box sx={{ mt: 2 }}>
                    <TextField
                      margin="normal"
                      label="From Location"
                      fullWidth
                      value={editRideShareData?.from_location || ''}
                      onChange={e => setEditRideShareData({ ...editRideShareData, from_location: e.target.value })}
                    />
                    <TextField
                      margin="normal"
                      label="To Location"
                      fullWidth
                      value={editRideShareData?.to_location || ''}
                      onChange={e => setEditRideShareData({ ...editRideShareData, to_location: e.target.value })}
                    />
                    <TextField
                      margin="normal"
                      label="Date"
                      fullWidth
                      value={editRideShareData?.date || ''}
                      onChange={e => setEditRideShareData({ ...editRideShareData, date: e.target.value })}
                    />
                    <TextField
                      margin="normal"
                      label="Time"
                      fullWidth
                      value={editRideShareData?.time || ''}
                      onChange={e => setEditRideShareData({ ...editRideShareData, time: e.target.value })}
                    />
                    <TextField
                      margin="normal"
                      label="Vehicle Type"
                      fullWidth
                      value={editRideShareData?.vehicle_type || ''}
                      onChange={e => setEditRideShareData({ ...editRideShareData, vehicle_type: e.target.value })}
                    />
                    <TextField
                      margin="normal"
                      label="Seats Available"
                      type="number"
                      fullWidth
                      value={editRideShareData?.seats_available || ''}
                      onChange={e => setEditRideShareData({ ...editRideShareData, seats_available: e.target.value })}
                    />
                    <TextField
                      margin="normal"
                      label="Price per Seat"
                      fullWidth
                      value={editRideShareData?.price_per_seat || ''}
                      onChange={e => setEditRideShareData({ ...editRideShareData, price_per_seat: e.target.value })}
                    />
                    <TextField
                      margin="normal"
                      label="Description"
                      fullWidth
                      multiline
                      rows={3}
                      value={editRideShareData?.description || ''}
                      onChange={e => setEditRideShareData({ ...editRideShareData, description: e.target.value })}
                    />
                    <TextField
                      margin="normal"
                      label="Status"
                      select
                      fullWidth
                      value={editRideShareData?.status || 'active'}
                      onChange={e => setEditRideShareData({ ...editRideShareData, status: e.target.value })}
                      SelectProps={{
                        native: true,
                      }}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </TextField>
                  </Box>
                )}
              </DialogContent>
              <DialogActions>
                <Button onClick={handleEditRideShareClose}>Cancel</Button>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleEditRideShareSave}
                  disabled={actionLoading}
                >
                  {actionLoading ? <CircularProgress size={20} color="inherit" /> : 'Save'}
                </Button>
              </DialogActions>
            </Dialog>
            
            {/* Delete Ride Share Confirmation Dialog */}
            <Dialog open={deleteRideShareConfirmOpen} onClose={handleDeleteRideShareClose}>
              <DialogTitle>Delete Ride Share Post</DialogTitle>
              <DialogContent>
                <Typography>
                  Are you sure you want to delete this ride share post from {rideShareToDelete?.from_location} to {rideShareToDelete?.to_location}?
                </Typography>
                <Typography variant="body2" color="error" sx={{ mt: 2 }}>
                  This action cannot be undone. The post will be permanently removed from the system.
                </Typography>
              </DialogContent>
              <DialogActions>
                <Button onClick={handleDeleteRideShareClose}>Cancel</Button>
                <Button
                  color="error"
                  variant="contained"
                  onClick={handleDeleteRideShareConfirm}
                  disabled={actionLoading}
                >
                  {actionLoading ? <CircularProgress size={20} color="inherit" /> : 'Delete'}
                </Button>
              </DialogActions>
            </Dialog>
          </Box>
        );

      case 'notifications':
        return (
          <Box sx={{ mt: 2 }}>
            <Paper sx={{ p: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Manage Announcements</Typography>
                <IconButton onClick={handleAnnouncementClick}>
                  <CloseIcon />
                </IconButton>
              </Box>
              <AnnouncementForm />
            </Paper>
          </Box>
        );

      case 'users':
        return (
          <Box sx={{ mt: 2, maxWidth: '100%' }}>
            <Typography variant="h5" sx={{ mb: 3 }}>Manage Users</Typography>
            
            {/* Pending Verification Users Section */}
            <Paper sx={{ p: 3, mb: 3, borderRadius: '12px' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Pending Verification ({pendingUsers.length})</Typography>
                <Button 
                  variant="outlined" 
                  color="primary" 
                  onClick={fetchDashboardData}
                  disabled={actionLoading !== ''}
                  size="small"
                >
                  Refresh
                </Button>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              {pendingUsers.length > 0 ? (
                <List sx={{ width: '100%', p: 0 }}>
                  {pendingUsers.map((user) => (
                    <ListItem 
                      key={user._id} 
                      divider
                      sx={{ flexWrap: { xs: 'wrap', md: 'nowrap' } }}
                      secondaryAction={
                        <Box sx={{ 
                          display: 'flex', 
                          flexWrap: 'wrap', 
                          gap: 1, 
                          width: { xs: '100%', md: 'auto' },
                          mt: { xs: 1, md: 0 }
                        }}>
                          <Button 
                            variant="outlined"
                            color="primary"
                            size="small"
                            onClick={() => handleViewUserDetails(user)}
                          >
                            View
                          </Button>
                          <Button 
                            variant="contained"
                            color="success"
                            size="small"
                            onClick={() => handleApproveUser(user._id)}
                            disabled={actionLoading === user._id}
                          >
                            {actionLoading === user._id ? <CircularProgress size={20} /> : 'Approve'}
                          </Button>
                          <Button 
                            variant="contained"
                            color="error"
                            size="small"
                            onClick={() => handleRejectUser(user._id)}
                            disabled={actionLoading === user._id}
                          >
                            {actionLoading === user._id ? <CircularProgress size={20} /> : 'Reject'}
                          </Button>
                        </Box>
                      }
                    >
                      <ListItemAvatar>
                        <Avatar src={user.profile_picture || ''}>
                          {user.name ? user.name.charAt(0) : 'U'}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={user.name}
                        secondary={
                          <>
                            {user.email} • {user.student_id || 'No ID'} • {user.department || 'No Dept'}
                            <br />
                            Registered: {new Date(user.created_at).toLocaleDateString()}
                          </>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                  No pending verification requests
                </Typography>
              )}
            </Paper>
            
            {/* Verified Users Section */}
            <Paper sx={{ p: 3, borderRadius: '12px' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Verified Users ({verifiedUsers.length})</Typography>
                <Button 
                  variant="outlined" 
                  color="primary" 
                  onClick={fetchDashboardData}
                  disabled={actionLoading !== ''}
                  size="small"
                >
                  Refresh
                </Button>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              {verifiedUsers.length > 0 ? (
                <List sx={{ width: '100%', p: 0 }}>
                  {verifiedUsers.map((user) => (
                    <ListItem 
                      key={user._id} 
                      divider
                      sx={{ flexWrap: { xs: 'wrap', md: 'nowrap' } }}
                      secondaryAction={
                        <Box sx={{ 
                          display: 'flex', 
                          flexWrap: 'wrap', 
                          gap: 1, 
                          width: { xs: '100%', md: 'auto' },
                          mt: { xs: 1, md: 0 }
                        }}>
                          <Button 
                            variant="outlined"
                            color="primary"
                            size="small"
                            onClick={() => handleViewUserDetails(user)}
                          >
                            View
                          </Button>
                          <Button 
                            variant="contained"
                            color="info"
                            size="small"
                            onClick={() => handleEditUser(user)}
                          >
                            Edit
                          </Button>
                          <Button 
                            variant="contained"
                            color="error"
                            size="small"
                            onClick={() => handleDeleteVerifiedUser(user._id)}
                            disabled={actionLoading === user._id}
                          >
                            {actionLoading === user._id ? <CircularProgress size={20} /> : 'Delete'}
                          </Button>
                        </Box>
                      }
                    >
                      <ListItemAvatar>
                        <Avatar src={user.profile_picture || ''}>
                          {user.name ? user.name.charAt(0) : 'U'}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={user.name}
                        secondary={
                          <>
                            {user.email} • {user.student_id || 'No ID'} • {user.department || 'No Dept'}
                            <br />
                            Verified: {user.approved_at ? new Date(user.approved_at).toLocaleDateString() : 'N/A'}
                          </>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                  No verified users found
                </Typography>
              )}
            </Paper>
          </Box>
        );

      case 'lostfound':
        return (
          <Box sx={{ mt: 2, maxWidth: '100%' }}>
            <Typography variant="h5" sx={{ mb: 3, color: '#2e7d32', fontWeight: 'bold', textShadow: '1px 1px 2px rgba(0,0,0,0.1)' }}>
              <HelpIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Lost & Found Management
            </Typography>
            
            <Paper sx={{ 
              p: 3, 
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
              boxShadow: '0 8px 32px rgba(76, 175, 80, 0.15)'
            }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ color: '#2e7d32', fontWeight: 'bold' }}>
                  <HelpOutlineIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Lost & Found Items ({lostFoundItems.length})
                </Typography>
                <Button 
                  variant="contained" 
                  color="success" 
                  onClick={() => fetchLostFoundData(true)}
                  disabled={loading}
                  sx={{ 
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(76, 175, 80, 0.2)',
                    '&:hover': {
                      boxShadow: '0 6px 16px rgba(76, 175, 80, 0.3)'
                    }
                  }}
                >
                  {loading ? <CircularProgress size={24} color="inherit" /> : 'Refresh'}
                </Button>
              </Box>
              
              <Divider sx={{ mb: 3 }} />
              
              {lostFoundItems.length > 0 ? (
                <Grid container spacing={3}>
                  {lostFoundItems.map(item => (
                    <Grid item xs={12} sm={6} md={4} key={item._id}>
                      <Card 
                        elevation={3}
                        sx={{
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          borderRadius: '16px',
                          overflow: 'hidden',
                          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                          '&:hover': {
                            transform: 'translateY(-8px)',
                            boxShadow: '0 16px 32px rgba(76, 175, 80, 0.25)'
                          }
                        }}
                      >
                        {/* Card Header */}
                        <Box sx={{
                          p: 2,
                          background: item.type === 'lost' 
                            ? 'linear-gradient(135deg, #ef5350 0%, #f44336 100%)' 
                            : 'linear-gradient(135deg, #42a5f5 0%, #2196f3 100%)',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <HelpOutlineIcon sx={{ mr: 1 }} />
                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                              {item.type === 'lost' ? 'Lost Item' : 'Found Item'}
                            </Typography>
                          </Box>
                          <Chip 
                            label={item.formatted_date || 'Unknown date'}
                            size="small"
                            sx={{ 
                              bgcolor: 'rgba(255, 255, 255, 0.25)',
                              color: 'white',
                              fontWeight: 'medium',
                              '& .MuiChip-label': { px: 1 }
                            }}
                          />
                        </Box>
                        
                        {/* Item Image */}
                        {item.image && (
                          <Box 
                            component="img"
                            src={item.image}
                            alt={item.title}
                            sx={{
                              width: '100%',
                              height: 140,
                              objectFit: 'cover'
                            }}
                          />
                        )}
                        
                        {/* Item Details */}
                        <CardContent sx={{ flexGrow: 1, p: 2 }}>
                          <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>
                            {item.title}
                          </Typography>
                          
                          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                            {item.description.length > 100 
                              ? `${item.description.substring(0, 100)}...` 
                              : item.description}
                          </Typography>
                          
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                            <Chip 
                              label={`Category: ${item.category}`}
                              size="small"
                              sx={{ bgcolor: 'rgba(0, 0, 0, 0.08)' }}
                            />
                            <Chip 
                              label={`Location: ${item.location}`}
                              size="small"
                              sx={{ bgcolor: 'rgba(0, 0, 0, 0.08)' }}
                            />
                            <Chip 
                              label={`Status: ${item.status}`}
                              size="small"
                              color={item.status === 'resolved' ? 'success' : 'default'}
                              sx={{ bgcolor: item.status === 'resolved' ? undefined : 'rgba(0, 0, 0, 0.08)' }}
                            />
                          </Box>
                          
                          {item.user && (
                            <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                              <Avatar sx={{ width: 24, height: 24, mr: 1, bgcolor: '#9c27b0' }}>
                                {item.user.name ? item.user.name.charAt(0).toUpperCase() : 'U'}
                              </Avatar>
                              <Typography variant="body2" color="text.secondary">
                                {item.user.name || 'Unknown User'}
                              </Typography>
                            </Box>
                          )}
                        </CardContent>
                        
                        {/* Actions */}
                        <CardActions sx={{ p: 2, pt: 0 }}>
                          <Button 
                            size="small" 
                            startIcon={<EditIcon />}
                            onClick={() => handleEditLostFound(item)}
                          >
                            Edit
                          </Button>
                          <Button 
                            size="small" 
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={() => handleDeleteLostFound(item)}
                          >
                            Delete
                          </Button>
                        </CardActions>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  py: 4
                }}>
                  <HelpOutlineIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">No Lost & Found items found</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                    There are no lost or found items in the system yet.
                  </Typography>
                </Box>
              )}
            </Paper>
          </Box>
        );
        
      default:
        return <Typography>Select an option from the sidebar</Typography>;
    }
  };

  return (
    <Box sx={{ display: 'flex', maxWidth: '100vw', overflow: 'hidden' }}>
      {/* Dialogs and Modals */}
      {deleteConfirmOpen && (
        <Dialog open={deleteConfirmOpen} onClose={handleDeleteUserClose}>
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            <Typography>Are you sure you want to delete user <b>{userToDelete?.name}</b>?</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDeleteUserClose} color="primary">Cancel</Button>
            <Button onClick={handleDeleteUserConfirm} color="error" disabled={actionLoading}>
              {actionLoading ? <CircularProgress size={20} color="inherit" /> : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>
      )}
      
      {/* Delete Marketplace Item Dialog */}
      {deleteMarketplaceOpen && (
        <Dialog open={deleteMarketplaceOpen} onClose={handleDeleteMarketplaceClose}>
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            <Typography>Are you sure you want to delete item <b>{marketplaceToDelete?.title}</b>?</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDeleteMarketplaceClose} color="primary">Cancel</Button>
            <Button onClick={handleDeleteMarketplaceConfirm} color="error" disabled={marketplaceActionLoading === marketplaceToDelete?._id}>
              {marketplaceActionLoading === marketplaceToDelete?._id ? <CircularProgress size={20} color="inherit" /> : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>
      )}
      
      {/* Delete Lost & Found Item Dialog */}
      {deleteLostFoundOpen && (
        <Dialog open={deleteLostFoundOpen} onClose={handleDeleteLostFoundClose}>
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            <Typography>Are you sure you want to delete the {lostFoundToDelete?.type === 'lost' ? 'lost' : 'found'} item <b>{lostFoundToDelete?.title}</b>?</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDeleteLostFoundClose} color="primary">Cancel</Button>
            <Button onClick={handleDeleteLostFoundConfirm} color="error" disabled={lostFoundActionLoading === lostFoundToDelete?._id}>
              {lostFoundActionLoading === lostFoundToDelete?._id ? <CircularProgress size={20} color="inherit" /> : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>
      )}
      
      {/* Edit Lost & Found Item Drawer */}
      {editLostFoundOpen && editLostFoundData && (
        <Drawer
          anchor="right"
          open={editLostFoundOpen}
          onClose={handleEditLostFoundClose}
          sx={{ '& .MuiDrawer-paper': { width: { xs: '100%', sm: 400 } } }}
        >
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3 }}>
              Edit {editLostFoundData.type === 'lost' ? 'Lost' : 'Found'} Item
            </Typography>
            <TextField
              label="Title"
              value={editLostFoundData?.title || ''}
              onChange={e => setEditLostFoundData({ ...editLostFoundData, title: e.target.value })}
              fullWidth
              sx={{ mb: 2 }}
            />
            <TextField
              label="Description"
              value={editLostFoundData?.description || ''}
              onChange={e => setEditLostFoundData({ ...editLostFoundData, description: e.target.value })}
              fullWidth
              multiline
              rows={3}
              sx={{ mb: 2 }}
            />
            <TextField
              label="Category"
              value={editLostFoundData?.category || ''}
              onChange={e => setEditLostFoundData({ ...editLostFoundData, category: e.target.value })}
              fullWidth
              sx={{ mb: 2 }}
            />
            <TextField
              label="Location"
              value={editLostFoundData?.location || ''}
              onChange={e => setEditLostFoundData({ ...editLostFoundData, location: e.target.value })}
              fullWidth
              sx={{ mb: 2 }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
              <Button onClick={handleEditLostFoundClose} color="inherit">
                Cancel
              </Button>
              <Button 
                onClick={handleEditLostFoundSave} 
                variant="contained" 
                color="primary"
                disabled={lostFoundActionLoading === editLostFoundData?._id}
              >
                {lostFoundActionLoading === editLostFoundData?._id ? <CircularProgress size={24} /> : 'Save Changes'}
              </Button>
            </Box>
          </Box>
        </Drawer>
      )}
      
      {/* Edit Marketplace Item Drawer */}
      {editMarketplaceOpen && editMarketplaceData && (
        <Drawer
          anchor="right"
          open={editMarketplaceOpen}
          onClose={handleEditMarketplaceClose}
          sx={{ '& .MuiDrawer-paper': { width: { xs: '100%', sm: 400 } } }}
        >
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3 }}>Edit Item</Typography>
            <TextField
              label="Title"
              value={editMarketplaceData?.title || ''}
              onChange={e => setEditMarketplaceData({ ...editMarketplaceData, title: e.target.value })}
              fullWidth
              sx={{ mb: 2 }}
            />
            <TextField
              label="Description"
              value={editMarketplaceData?.description || ''}
              onChange={e => setEditMarketplaceData({ ...editMarketplaceData, description: e.target.value })}
              fullWidth
              multiline
              rows={3}
              sx={{ mb: 2 }}
            />
            <TextField
              label="Price"
              type="number"
              value={editMarketplaceData?.price || ''}
              onChange={e => setEditMarketplaceData({ ...editMarketplaceData, price: e.target.value })}
              fullWidth
              sx={{ mb: 2 }}
            />
            <TextField
              label="Category"
              value={editMarketplaceData?.category || ''}
              onChange={e => setEditMarketplaceData({ ...editMarketplaceData, category: e.target.value })}
              fullWidth
              sx={{ mb: 2 }}
            />
            <TextField
              label="Condition"
              value={editMarketplaceData?.condition || ''}
              onChange={e => setEditMarketplaceData({ ...editMarketplaceData, condition: e.target.value })}
              fullWidth
              sx={{ mb: 2 }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button onClick={handleEditMarketplaceClose} color="primary" sx={{ mr: 2 }}>Cancel</Button>
              <Button onClick={handleEditMarketplaceSave} color="success" variant="contained" disabled={marketplaceActionLoading === editMarketplaceData?._id}>
                {marketplaceActionLoading === editMarketplaceData?._id ? <CircularProgress size={20} color="inherit" /> : 'Save'}
              </Button>
            </Box>
          </Box>
        </Drawer>
      )}
      
      {/* Edit User Drawer */}
      {editUserOpen && (
        <Drawer 
          anchor="right" 
          open={editUserOpen} 
          onClose={handleEditUserClose} 
          sx={{ '& .MuiDrawer-paper': { width: { xs: '100%', sm: 400 }, p: 0 } }}
        >
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3 }}>Edit User</Typography>
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
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button onClick={handleEditUserClose} color="primary" sx={{ mr: 2 }}>Cancel</Button>
              <Button 
                onClick={handleEditUserSave} 
                color="success" 
                variant="contained" 
                disabled={actionLoading}
              >
                {actionLoading ? <CircularProgress size={20} color="inherit" /> : 'Save'}
              </Button>
            </Box>
          </Box>
        </Drawer>
      )}
      
      {/* Layout */}
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          boxSizing: 'border-box',
          bgcolor: '#1a237e'
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Admin Dashboard
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              background: 'linear-gradient(180deg, #1a237e 0%, #283593 100%)',
              color: 'white'
            },
          }}
        >
          {drawerContent}
        </Drawer>
        
        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              background: 'linear-gradient(180deg, #1a237e 0%, #283593 100%)',
              color: 'white'
            },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>
      
      {/* Main content */}
      <Box
        component="main"
        sx={{ 
          flexGrow: 1, 
          p: { xs: 2, sm: 3 }, 
          width: { xs: '100%', sm: `calc(100% - ${drawerWidth}px)` },
          maxWidth: '100%',
          overflowX: 'hidden',
          background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e8f0 100%)', 
          minHeight: '100vh' 
        }}
      >
        <Toolbar /> {/* Spacer for AppBar */}
        {/* Admin panel should not display announcements */}
        {renderContent()}
      </Box>

      {/* Marketplace Item Details Drawer */}
      <MarketplaceItemDetailsDrawer
        open={marketplaceItemDetails.open}
        item={marketplaceItemDetails.item}
        onClose={handleCloseMarketplaceItemDetails}
      />

      {/* User Details Dialog */}
      <Dialog open={userDetailsOpen} onClose={handleCloseUserDetails} maxWidth="sm" fullWidth>
        <DialogTitle>User Details</DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                <strong>Name:</strong> {selectedUser.name}
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                <strong>Email:</strong> {selectedUser.email}
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                <strong>Username:</strong> {selectedUser.username}
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

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} 
          severity={snackbar.severity} 
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminDashboard;
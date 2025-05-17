import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { CircularProgress, Box } from '@mui/material';

// Eagerly load critical components
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import SharedRoute from './components/SharedRoute';

// Lazy load pages for better performance
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const UserProfile = lazy(() => import('./pages/UserProfile'));
const Marketplace = lazy(() => import('./pages/Marketplace'));
const Payment = lazy(() => import('./pages/Payment'));
const LostFound = lazy(() => import('./pages/LostFound'));
const RideShare = lazy(() => import('./pages/RideShare'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));

// Loading component for suspense fallback
const LoadingFallback = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <CircularProgress />
  </Box>
);

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#7b1fa2',
    },
    error: {
      main: '#c62828',
    },
    background: {
      default: '#f0f8ff', // Light blue background instead of white
      paper: 'rgba(255, 255, 255, 0.85)', // Semi-transparent white with backdrop blur
    }
  },
  typography: {
    fontFamily: '"Poppins", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backdropFilter: 'blur(10px)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'linear-gradient(135deg, #1976d2, #115293)',
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(10px)',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          '&:hover': {
            transform: 'translateY(-5px)',
            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.14)'
          }
        }
      }
    }
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            
            {/* Protected admin routes */}
            <Route path="/admin-dashboard" element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            } />
            
            {/* Protected user routes - accessible only to regular users */}
            <Route path="/profile" element={
              <ProtectedRoute>
                <UserProfile />
              </ProtectedRoute>
            } />
            
            {/* Shared routes - accessible to both admins and regular users */}
            <Route path="/marketplace" element={
              <SharedRoute>
                <Marketplace />
              </SharedRoute>
            } />
            <Route path="/payment" element={
              <SharedRoute>
                <Payment />
              </SharedRoute>
            } />
            <Route path="/lost-found" element={
              <SharedRoute>
                <LostFound />
              </SharedRoute>
            } />
            <Route path="/ride-booking" element={
              <SharedRoute>
                <RideShare />
              </SharedRoute>
            } />
            <Route path="/ride-sharing" element={
              <SharedRoute>
                <RideShare />
              </SharedRoute>
            } />
          </Routes>
        </Suspense>
      </Router>
    </ThemeProvider>
  );
}

export default App; 
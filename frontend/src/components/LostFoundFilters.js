import React from 'react';
import { 
  Box, 
  TextField, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  IconButton, 
  InputAdornment,
  Chip,
  Grid,
  Paper,
  styled
} from '@mui/material';
import { Search, FilterList, Close } from '@mui/icons-material';

// Styled components for a colorful UI
const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: '12px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
  background: 'linear-gradient(to right, rgba(255,255,255,0.95), rgba(255,255,255,0.98))',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255,255,255,0.3)',
  marginBottom: theme.spacing(3)
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: '12px',
    transition: 'all 0.3s',
    '&:hover': {
      boxShadow: '0 0 0 4px rgba(25, 118, 210, 0.1)'
    },
    '&.Mui-focused': {
      boxShadow: '0 0 0 4px rgba(25, 118, 210, 0.2)'
    }
  }
}));

const StyledFormControl = styled(FormControl)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: '12px',
    transition: 'all 0.3s',
    '&:hover': {
      boxShadow: '0 0 0 4px rgba(25, 118, 210, 0.1)'
    },
    '&.Mui-focused': {
      boxShadow: '0 0 0 4px rgba(25, 118, 210, 0.2)'
    }
  }
}));

const StyledChip = styled(Chip)(({ theme, color }) => ({
  margin: theme.spacing(0.5),
  fontWeight: 'bold',
  borderRadius: '8px',
  backgroundColor: color || theme.palette.primary.main,
  color: '#fff',
  '&:hover': {
    boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
  }
}));

// Categories for lost & found items
const categories = [
  'All Categories',
  'Electronics',
  'Clothing',
  'ID/Documents',
  'Keys',
  'Jewelry',
  'Book/Notes',
  'Bag/Luggage',
  'Other'
];

// Locations for the campus
const locations = [
  'All Locations',
  'Library',
  'Student Center',
  'Science Building',
  'Dining Hall',
  'Dorm A',
  'Dorm B',
  'Sports Complex',
  'Parking Lot',
  'Classroom Building',
  'Admin Building'
];

// Status options
const statuses = [
  'All Statuses',
  'Lost',
  'Found',
  'Claimed',
  'Returned',
  'Pending'
];

// Function to get color for category chips
const getCategoryColor = (category) => {
  switch (category) {
    case 'Electronics': return '#2196F3'; // Blue
    case 'Clothing': return '#4CAF50'; // Green
    case 'ID/Documents': return '#F44336'; // Red
    case 'Keys': return '#FF9800'; // Orange
    case 'Jewelry': return '#E91E63'; // Pink
    case 'Book/Notes': return '#9C27B0'; // Purple
    case 'Bag/Luggage': return '#795548'; // Brown
    case 'Other': return '#607D8B'; // Blue Grey
    default: return '#757575'; // Grey
  }
};

const LostFoundFilters = ({ 
  searchTerm, 
  setSearchTerm, 
  filters, 
  setFilters,
  activeFilters,
  setActiveFilters
}) => {
  // Helper function to handle filter changes
  const handleFilterChange = (filterName, value) => {
    const newFilters = { ...filters, [filterName]: value };
    setFilters(newFilters);
    
    // Update active filters for chips
    if (value && value !== `All ${filterName}s` && !activeFilters.includes(value)) {
      setActiveFilters([...activeFilters.filter(f => {
        // Remove previous value of same type (e.g. replace one category with another)
        const isCategory = categories.includes(f);
        const isLocation = locations.includes(f);
        const isStatus = statuses.includes(f);
        
        if ((filterName === 'category' && isCategory) || 
            (filterName === 'location' && isLocation) ||
            (filterName === 'status' && isStatus)) {
          return false;
        }
        return true;
      }), value]);
    }
  };

  // Remove a filter chip
  const handleRemoveFilter = (filter) => {
    setActiveFilters(activeFilters.filter(f => f !== filter));
    
    // Reset the corresponding dropdown
    if (categories.includes(filter)) {
      setFilters({ ...filters, category: 'All Categories' });
    } else if (locations.includes(filter)) {
      setFilters({ ...filters, location: 'All Locations' });
    } else if (statuses.includes(filter)) {
      setFilters({ ...filters, status: 'All Statuses' });
    }
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearchTerm('');
    setFilters({
      category: 'All Categories',
      location: 'All Locations',
      status: 'All Statuses',
      startDate: '',
      endDate: ''
    });
    setActiveFilters([]);
  };

  return (
    <StyledPaper>
      <Grid container spacing={2}>
        {/* Search field */}
        <Grid item xs={12} md={4}>
          <StyledTextField
            fullWidth
            variant="outlined"
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search color="primary" />
                </InputAdornment>
              ),
              endAdornment: searchTerm && (
                <InputAdornment position="end">
                  <IconButton 
                    onClick={() => setSearchTerm('')}
                    size="small"
                  >
                    <Close fontSize="small" />
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
        </Grid>
        
        {/* Category filter */}
        <Grid item xs={12} sm={6} md={2}>
          <StyledFormControl fullWidth variant="outlined">
            <InputLabel>Category</InputLabel>
            <Select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              label="Category"
              startAdornment={
                <InputAdornment position="start">
                  <FilterList fontSize="small" sx={{ color: '#9c27b0' }} />
                </InputAdornment>
              }
            >
              {categories.map((category) => (
                <MenuItem key={category} value={category}>
                  {category}
                </MenuItem>
              ))}
            </Select>
          </StyledFormControl>
        </Grid>
        
        {/* Location filter */}
        <Grid item xs={12} sm={6} md={2}>
          <StyledFormControl fullWidth variant="outlined">
            <InputLabel>Location</InputLabel>
            <Select
              value={filters.location}
              onChange={(e) => handleFilterChange('location', e.target.value)}
              label="Location"
              startAdornment={
                <InputAdornment position="start">
                  <FilterList fontSize="small" sx={{ color: '#ff9800' }} />
                </InputAdornment>
              }
            >
              {locations.map((location) => (
                <MenuItem key={location} value={location}>
                  {location}
                </MenuItem>
              ))}
            </Select>
          </StyledFormControl>
        </Grid>
        
        {/* Status filter */}
        <Grid item xs={12} sm={6} md={2}>
          <StyledFormControl fullWidth variant="outlined">
            <InputLabel>Status</InputLabel>
            <Select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              label="Status"
              startAdornment={
                <InputAdornment position="start">
                  <FilterList fontSize="small" sx={{ color: '#f44336' }} />
                </InputAdornment>
              }
            >
              {statuses.map((status) => (
                <MenuItem key={status} value={status}>
                  {status}
                </MenuItem>
              ))}
            </Select>
          </StyledFormControl>
        </Grid>
        
        {/* Date range filters */}
        <Grid item xs={12} sm={6} md={2}>
          <StyledTextField
            fullWidth
            label="From Date"
            type="date"
            variant="outlined"
            value={filters.startDate}
            onChange={(e) => handleFilterChange('startDate', e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        
        {/* Active filters display */}
        {activeFilters.length > 0 && (
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', mt: 1 }}>
              {activeFilters.map((filter) => (
                <StyledChip
                  key={filter}
                  label={filter}
                  onDelete={() => handleRemoveFilter(filter)}
                  color={getCategoryColor(filter)}
                />
              ))}
              
              <StyledChip
                label="Clear All"
                onClick={handleClearFilters}
                color="#757575"
                variant="outlined"
              />
            </Box>
          </Grid>
        )}
      </Grid>
    </StyledPaper>
  );
};

export default LostFoundFilters; 
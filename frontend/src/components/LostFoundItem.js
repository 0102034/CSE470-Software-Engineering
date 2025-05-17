import React from 'react';
import { 
  Card, 
  CardContent, 
  CardMedia, 
  Typography, 
  Box, 
  Chip, 
  Button, 
  Stack, 
  Divider,
  styled
} from '@mui/material';
import { 
  LocationOn, 
  CalendarToday, 
  Person, 
  CreditCard,
  CheckCircle,
  ErrorOutline,
  AccessTime
} from '@mui/icons-material';

// Styled components for visual appeal
const StyledCard = styled(Card)(({ theme, item }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
  borderRadius: '12px',
  overflow: 'hidden',
  borderLeft: `5px solid ${getStatusColor(item.status)}`,
  '&:hover': {
    transform: 'translateY(-8px)',
    boxShadow: '0 12px 20px rgba(0, 0, 0, 0.1)'
  }
}));

const StyledCardMedia = styled(CardMedia)({
  height: 200,
  objectFit: 'cover',
  objectPosition: 'center'
});

const StyledChip = styled(Chip)(({ theme, color }) => ({
  fontWeight: 'bold',
  borderRadius: '8px',
  backgroundColor: color || theme.palette.primary.main,
  color: '#fff'
}));

// Helper function to get color based on item status
function getStatusColor(status) {
  switch (status.toLowerCase()) {
    case 'found':
      return '#4CAF50'; // Green
    case 'lost':
      return '#F44336'; // Red
    case 'claimed':
      return '#2196F3'; // Blue
    case 'returned':
      return '#9C27B0'; // Purple
    case 'pending':
      return '#FFC107'; // Amber
    default:
      return '#757575'; // Grey
  }
}

// Helper function to get icon based on category
function getCategoryIcon(category) {
  // You can expand this with more icons for different categories
  return category === 'Electronics' ? '💻' : 
         category === 'Clothing' ? '👕' : 
         category === 'ID/Documents' ? '📄' : 
         category === 'Keys' ? '🔑' : 
         category === 'Jewelry' ? '💍' : 
         category === 'Book/Notes' ? '📚' : 
         category === 'Bag/Luggage' ? '🧳' : 
         category === 'Other' ? '📦' : '❓';
}

// Helper function to get status icon
function getStatusIcon(status) {
  switch (status.toLowerCase()) {
    case 'found':
      return <CheckCircle fontSize="small" />;
    case 'lost':
      return <ErrorOutline fontSize="small" />;
    case 'claimed':
    case 'returned':
      return <CheckCircle fontSize="small" />;
    case 'pending':
      return <AccessTime fontSize="small" />;
    default:
      return null;
  }
}

const LostFoundItem = ({ item, onContactClick }) => {
  const defaultImage = 'https://via.placeholder.com/300x200?text=No+Image';
  
  return (
    <StyledCard item={item}>
      <StyledCardMedia
        component="img"
        image={item.image || defaultImage}
        alt={item.title}
      />
      <CardContent sx={{ flexGrow: 1, p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 'bold' }}>
            {item.title}
          </Typography>
          <StyledChip 
            label={item.status} 
            color={getStatusColor(item.status)}
            icon={getStatusIcon(item.status)}
            size="small"
          />
        </Box>
        
        <Box sx={{ display: 'flex', mb: 2 }}>
          <StyledChip 
            label={item.category} 
            color="#795548"
            icon={<span style={{ fontSize: '1.2rem', marginRight: '4px' }}>{getCategoryIcon(item.category)}</span>}
            variant="outlined"
            size="small"
          />
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {item.description}
        </Typography>
        
        <Stack spacing={1.5} sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <LocationOn fontSize="small" color="primary" sx={{ mr: 1 }} />
            <Typography variant="body2">{item.location}</Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <CalendarToday fontSize="small" color="primary" sx={{ mr: 1 }} />
            <Typography variant="body2">{new Date(item.date).toLocaleDateString()}</Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Person fontSize="small" color="primary" sx={{ mr: 1 }} />
            <Typography variant="body2">{item.contact}</Typography>
          </Box>
          
          {item.reward && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <CreditCard fontSize="small" color="primary" sx={{ mr: 1 }} />
              <Typography variant="body2">Reward: {item.reward}</Typography>
            </Box>
          )}
        </Stack>
        
        <Divider sx={{ mb: 2 }} />
        
        <Button 
          variant="contained" 
          fullWidth 
          sx={{ 
            mt: 'auto',
            borderRadius: '8px',
            py: 1,
            background: 'linear-gradient(45deg, #FF5722, #FF9800)',
            '&:hover': {
              background: 'linear-gradient(45deg, #E64A19, #F57C00)',
            }
          }}
          onClick={() => onContactClick(item)}
        >
          Contact
        </Button>
      </CardContent>
    </StyledCard>
  );
};

export default LostFoundItem; 
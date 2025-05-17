import React from 'react';
import { Box, Typography, Container, Paper } from '@mui/material';

const RideShare = () => {
  return (
    <Container maxWidth="lg">
      <Paper elevation={3} sx={{ p: 4, mt: 4, mb: 4 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Ride Share
          </Typography>
          <Typography variant="body1">
            The new ride share functionality will be implemented here.
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default RideShare;

import React from 'react';
import {
  Card,
  CardContent,
  TextField,
  Stack,
  Typography
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';

const RideFilter = ({ filters, setFilters }) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Filter Rides
        </Typography>
        
        <Stack spacing={2}>
          <TextField
            name="from"
            label="From"
            value={filters.from}
            onChange={handleChange}
            fullWidth
          />

          <TextField
            name="to"
            label="To"
            value={filters.to}
            onChange={handleChange}
            fullWidth
          />

          <DatePicker
            label="Date"
            value={filters.date}
            onChange={(newValue) => {
              setFilters(prev => ({ ...prev, date: newValue }));
            }}
            renderInput={(params) => <TextField {...params} fullWidth />}
          />
        </Stack>
      </CardContent>
    </Card>
  );
};

export default RideFilter;

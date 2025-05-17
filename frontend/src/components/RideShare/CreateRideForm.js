import React, { useState } from 'react';
import {
  Card,
  CardContent,
  TextField,
  Button,
  Stack,
  FormControlLabel,
  Switch,
  MenuItem,
  Typography
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';

const PAYMENT_METHODS = [
  { value: 'in_person', label: 'In Person' },
  { value: 'bkash', label: 'bKash' },
  { value: 'nagad', label: 'Nagad' }
];

const CreateRideForm = ({ onSubmit }) => {
  const [formData, setFormData] = useState({
    from_location: '',
    to_location: '',
    date: null,
    seats: '',
    is_paid: false,
    fee: '',
    payment_method: 'in_person',
    contact_number: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({
      from_location: '',
      to_location: '',
      date: null,
      seats: '',
      is_paid: false,
      fee: '',
      payment_method: 'in_person',
      contact_number: ''
    });
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Post a Ride
        </Typography>
        
        <form onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <TextField
              name="from_location"
              label="From"
              value={formData.from_location}
              onChange={handleChange}
              required
              fullWidth
            />

            <TextField
              name="to_location"
              label="To"
              value={formData.to_location}
              onChange={handleChange}
              required
              fullWidth
            />

            <DatePicker
              label="Date"
              value={formData.date}
              onChange={(newValue) => {
                setFormData(prev => ({ ...prev, date: newValue }));
              }}
              renderInput={(params) => <TextField {...params} required fullWidth />}
              minDate={new Date()}
            />

            <TextField
              name="seats"
              label="Number of Seats"
              type="number"
              value={formData.seats}
              onChange={handleChange}
              required
              fullWidth
              inputProps={{ min: 1 }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_paid}
                  onChange={(e) => {
                    setFormData(prev => ({
                      ...prev,
                      is_paid: e.target.checked,
                      fee: e.target.checked ? prev.fee : ''
                    }));
                  }}
                />
              }
              label="Paid Ride"
            />

            {formData.is_paid && (
              <>
                <TextField
                  name="fee"
                  label="Fee per Seat (BDT)"
                  type="number"
                  value={formData.fee}
                  onChange={handleChange}
                  required={formData.is_paid}
                  fullWidth
                  inputProps={{ min: 0 }}
                />

                <TextField
                  name="payment_method"
                  label="Payment Method"
                  select
                  value={formData.payment_method}
                  onChange={handleChange}
                  required={formData.is_paid}
                  fullWidth
                >
                  {PAYMENT_METHODS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              </>
            )}

            <TextField
              name="contact_number"
              label="Contact Number"
              value={formData.contact_number}
              onChange={handleChange}
              required
              fullWidth
            />

            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
            >
              Post Ride
            </Button>
          </Stack>
        </form>
      </CardContent>
    </Card>
  );
};

export default CreateRideForm;

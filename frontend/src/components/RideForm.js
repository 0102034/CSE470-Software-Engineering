import React, { useState } from 'react';
import rideService from '../services/rideService';

function RideForm({ type }) {
  const [formData, setFormData] = useState({
    pickup_location: '',
    dropoff_location: '',
    date: '',
    time: '',
    seats: '',
    contact_info: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        [type === 'offer' ? 'available_seats' : 'needed_seats']: parseInt(formData.seats)
      };

      const response = type === 'offer' 
        ? await rideService.createRideOffer(payload)
        : await rideService.createRideRequest(payload);

      alert(type === 'offer' ? 'Ride offer created!' : 'Ride request created!');
      // Reset form
      setFormData({
        pickup_location: '',
        dropoff_location: '',
        date: '',
        time: '',
        seats: '',
        contact_info: ''
      });
    } catch (error) {
      alert('Error creating ride: ' + error.message);
    }
  };

  return (
    React.createElement('div', { className: 'max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md' },
      React.createElement('h2', { className: 'text-2xl font-bold mb-6' },
        `Create Ride ${type === 'offer' ? 'Offer' : 'Request'}`
      ),
      React.createElement('form', { onSubmit: handleSubmit, className: 'space-y-4' },
        // Pickup Location
        React.createElement('div', null,
          React.createElement('label', { className: 'block text-sm font-medium text-gray-700' }, 'Pickup Location'),
          React.createElement('input', {
            type: 'text',
            name: 'pickup_location',
            value: formData.pickup_location,
            onChange: handleChange,
            required: true,
            className: 'mt-1 block w-full rounded-md border-gray-300 shadow-sm'
          })
        ),
        // Drop-off Location
        React.createElement('div', null,
          React.createElement('label', { className: 'block text-sm font-medium text-gray-700' }, 'Drop-off Location'),
          React.createElement('input', {
            type: 'text',
            name: 'dropoff_location',
            value: formData.dropoff_location,
            onChange: handleChange,
            required: true,
            className: 'mt-1 block w-full rounded-md border-gray-300 shadow-sm'
          })
        ),
        // Date
        React.createElement('div', null,
          React.createElement('label', { className: 'block text-sm font-medium text-gray-700' }, 'Date'),
          React.createElement('input', {
            type: 'date',
            name: 'date',
            value: formData.date,
            onChange: handleChange,
            required: true,
            className: 'mt-1 block w-full rounded-md border-gray-300 shadow-sm'
          })
        ),
        // Time
        React.createElement('div', null,
          React.createElement('label', { className: 'block text-sm font-medium text-gray-700' }, 'Time'),
          React.createElement('input', {
            type: 'time',
            name: 'time',
            value: formData.time,
            onChange: handleChange,
            required: true,
            className: 'mt-1 block w-full rounded-md border-gray-300 shadow-sm'
          })
        ),
        // Seats
        React.createElement('div', null,
          React.createElement('label', { className: 'block text-sm font-medium text-gray-700' },
            type === 'offer' ? 'Available Seats' : 'Needed Seats'
          ),
          React.createElement('input', {
            type: 'number',
            name: 'seats',
            value: formData.seats,
            onChange: handleChange,
            required: true,
            min: '1',
            className: 'mt-1 block w-full rounded-md border-gray-300 shadow-sm'
          })
        ),
        // Contact Information
        React.createElement('div', null,
          React.createElement('label', { className: 'block text-sm font-medium text-gray-700' }, 'Contact Information'),
          React.createElement('input', {
            type: 'text',
            name: 'contact_info',
            value: formData.contact_info,
            onChange: handleChange,
            required: true,
            className: 'mt-1 block w-full rounded-md border-gray-300 shadow-sm'
          })
        ),
        // Submit Button
        React.createElement('button', {
          type: 'submit',
          className: 'w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700'
        }, `Create ${type === 'offer' ? 'Offer' : 'Request'}`)
      )
    )
  );
}

export default RideForm;

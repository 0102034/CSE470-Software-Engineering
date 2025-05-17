import React, { useState, useEffect } from 'react';
import rideService from '../services/rideService';

function RideList({ type }) {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadRides();
  }, [type]);

  const loadRides = async () => {
    try {
      setLoading(true);
      const response = await rideService.getRides({ type });
      setRides(response);
      setError(null);
    } catch (err) {
      setError('Failed to load rides');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleContact = async (rideId) => {
    try {
      const response = await rideService.contactRideCreator(rideId);
      alert(`Contact Information: ${response.contact_info}`);
    } catch (err) {
      alert(err.message || 'Failed to get contact information');
    }
  };

  if (loading) {
    return React.createElement('div', { className: 'text-center py-4' }, 'Loading...');
  }

  if (error) {
    return React.createElement('div', { className: 'text-red-500 text-center py-4' }, error);
  }

  return React.createElement('div', { className: 'space-y-4' },
    rides.map(ride => 
      React.createElement('div', {
        key: ride._id,
        className: 'border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow'
      },
        React.createElement('div', { className: 'flex justify-between items-start' },
          React.createElement('div', null,
            React.createElement('h3', { className: 'text-lg font-semibold' },
              `${ride.pickup_location} → ${ride.dropoff_location}`
            ),
            React.createElement('p', { className: 'text-gray-600' },
              `Date: ${new Date(ride.date).toLocaleDateString()}`
            ),
            React.createElement('p', { className: 'text-gray-600' },
              `Time: ${ride.time}`
            ),
            React.createElement('p', { className: 'text-gray-600' },
              type === 'offer' 
                ? `Available Seats: ${ride.available_seats}`
                : `Needed Seats: ${ride.needed_seats}`
            )
          ),
          // Only show contact button if user is not the creator
          !ride.is_creator && React.createElement('button', {
            onClick: () => handleContact(ride._id),
            className: 'bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600'
          }, 'Contact')
        ),
        ride.is_creator && React.createElement('div', {
          className: 'mt-2 text-sm text-gray-500 italic'
        }, 'This is your post')
      )
    ),
    rides.length === 0 && React.createElement('div', {
      className: 'text-center py-4 text-gray-500'
    }, `No ${type}s found`)
  );
}

export default RideList;

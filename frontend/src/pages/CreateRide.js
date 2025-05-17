import React from 'react';
import RideForm from '../components/RideForm';

function CreateRide() {
  return (
    React.createElement('div', { className: 'container mx-auto px-4 py-8' },
      React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-8' },
        // Offer Form
        React.createElement('div', null,
          React.createElement(RideForm, { type: 'offer' })
        ),
        // Request Form
        React.createElement('div', null,
          React.createElement(RideForm, { type: 'request' })
        )
      )
    )
  );
}

export default CreateRide;

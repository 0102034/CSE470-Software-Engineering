import React from 'react';
import NotificationBanner from './NotificationBanner';

const withNotificationBanner = (WrappedComponent, page) => {
  return function WithNotificationBannerComponent(props) {
    return React.createElement('div', null,
      React.createElement(NotificationBanner, { page: page }),
      React.createElement(WrappedComponent, props)
    );
  };
};

export default withNotificationBanner;

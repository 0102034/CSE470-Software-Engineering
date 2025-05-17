import React, { useState, useEffect } from 'react';
import notificationService from '../services/notificationService';

function NotificationBanner({ page }) {
  const [notifications, setNotifications] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    loadNotifications();
    // Refresh notifications every 5 minutes
    const interval = setInterval(loadNotifications, 300000);
    return () => clearInterval(interval);
  }, [page]);

  useEffect(() => {
    if (notifications.length > 0) {
      // Rotate through notifications every 10 seconds
      const rotationInterval = setInterval(() => {
        setCurrentIndex((prevIndex) => 
          prevIndex + 1 >= notifications.length ? 0 : prevIndex + 1
        );
      }, 10000);
      return () => clearInterval(rotationInterval);
    }
  }, [notifications]);

  const loadNotifications = async () => {
    try {
      const activeNotifications = await notificationService.getActiveNotifications(page);
      setNotifications(activeNotifications);
      setCurrentIndex(0);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  if (notifications.length === 0) {
    return null;
  }

  const currentNotification = notifications[currentIndex];

  return React.createElement('div', {
    className: 'bg-blue-600 text-white py-2 px-4 relative overflow-hidden',
    style: { minHeight: '40px' }
  },
    React.createElement('div', {
      className: 'animate-marquee whitespace-nowrap absolute',
      style: {
        animation: 'marquee 20s linear infinite',
      }
    },
      React.createElement('span', { className: 'text-md font-medium', style: { fontSize: '1.1rem', fontWeight: 'bold' } },
        `📢 ${currentNotification.message}`
      )
    ),
    // Add the same content again for seamless looping
    React.createElement('div', {
      className: 'animate-marquee2 whitespace-nowrap absolute',
      style: {
        animation: 'marquee2 20s linear infinite',
      }
    },
      React.createElement('span', { className: 'text-md font-medium', style: { fontSize: '1.1rem', fontWeight: 'bold' } },
        `📢 ${currentNotification.message}`
      )
    ),
    // Add CSS animation
    React.createElement('style', null, `
      @keyframes marquee {
        from { transform: translateX(100%); }
        to { transform: translateX(-100%); }
      }
      @keyframes marquee2 {
        from { transform: translateX(200%); }
        to { transform: translateX(0%); }
      }
      .animate-marquee {
        animation: marquee 20s linear infinite;
      }
      .animate-marquee2 {
        animation: marquee2 20s linear infinite;
      }
    `)
  );
}

export default NotificationBanner;

import React from 'react';
import withNotificationBanner from '../components/withNotificationBanner';
import { API_URL } from '../config';
import axios from 'axios';
import ContactButton from '../components/ContactButton';
import MessageChat from '../components/MessageChat';

const RideShare = () => {
  // Create a class-based implementation for pure JavaScript
  class RideShareComponent {
    constructor() {
      this.state = {
        rides: [],
        loading: true,
        error: null,
        currentUser: JSON.parse(localStorage.getItem('user')) || {},
        selectedRide: null,
        showChatModal: false,
        chatData: null
      };
      
      this.containerRef = null;
      this.contactButtonRefs = {};
      this.chatContainerRef = null;
    }
    
    // Initialize the component
    init(containerElement) {
      this.containerRef = containerElement;
      this.loadRides();
      this.render();
    }
    
    // Load rides from the API
    async loadRides() {
      try {
        this.setState({ loading: true });
        const token = localStorage.getItem('token');
        
        if (!token) {
          this.setState({ 
            loading: false,
            error: 'Please log in to view ride shares'
          });
          return;
        }
        
        const response = await axios.get(`${API_URL}/api/ride`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data.status === 'success') {
          this.setState({ 
            rides: response.data.rides || [],
            loading: false
          });
        } else {
          throw new Error(response.data.message || 'Failed to load rides');
        }
      } catch (error) {
        console.error('Error loading rides:', error);
        this.setState({ 
          loading: false,
          error: error.message || 'Failed to load rides'
        });
      }
      
      // Re-render with updated state
      this.render();
    }
    
    // Update component state
    setState(newState) {
      this.state = { ...this.state, ...newState };
    }
    
    // Handle booking a ride
    async handleBookNow(ride) {
      try {
        const token = localStorage.getItem('token');
        
        if (!token) {
          alert('Please log in to book a ride');
          return;
        }
        
        // Check if user is the creator of the ride
        if (ride.user_id === this.state.currentUser._id || ride.user_id === this.state.currentUser.id) {
          alert('You cannot book your own ride');
          return;
        }
        
        const response = await axios.post(`${API_URL}/api/ride/${ride._id}/book`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data.status === 'success') {
          alert('Ride booked successfully!');
          this.loadRides(); // Reload rides to update status
        } else {
          throw new Error(response.data.message || 'Failed to book ride');
        }
      } catch (error) {
        console.error('Error booking ride:', error);
        alert(error.message || 'Failed to book ride');
      }
    }
    
    // Handle contact initiated callback from ContactButton
    handleContactInitiated(data) {
      this.setState({
        showChatModal: true,
        chatData: {
          postId: data.postId,
          postType: 'ride_share',
          otherUser: data.postCreator
        }
      });
      
      this.renderChatModal();
    }
    
    // Close chat modal
    closeChatModal() {
      this.setState({
        showChatModal: false,
        chatData: null
      });
      
      this.render();
    }
    
    // Render chat modal
    renderChatModal() {
      if (!this.state.showChatModal || !this.state.chatData) return;
      
      // Create modal container if it doesn't exist
      let modalContainer = document.getElementById('chat-modal-container');
      if (!modalContainer) {
        modalContainer = document.createElement('div');
        modalContainer.id = 'chat-modal-container';
        modalContainer.style.position = 'fixed';
        modalContainer.style.top = '0';
        modalContainer.style.left = '0';
        modalContainer.style.width = '100%';
        modalContainer.style.height = '100%';
        modalContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        modalContainer.style.display = 'flex';
        modalContainer.style.justifyContent = 'center';
        modalContainer.style.alignItems = 'center';
        modalContainer.style.zIndex = '1000';
        document.body.appendChild(modalContainer);
      }
      
      // Clear modal container
      modalContainer.innerHTML = '';
      
      // Create modal content
      const modalContent = document.createElement('div');
      modalContent.className = 'chat-modal-content';
      modalContent.style.backgroundColor = 'white';
      modalContent.style.padding = '20px';
      modalContent.style.borderRadius = '5px';
      modalContent.style.width = '600px';
      modalContent.style.maxWidth = '90%';
      modalContent.style.maxHeight = '80vh';
      modalContent.style.overflow = 'hidden';
      modalContent.style.display = 'flex';
      modalContent.style.flexDirection = 'column';
      
      // Create modal header
      const modalHeader = document.createElement('div');
      modalHeader.className = 'chat-modal-header';
      modalHeader.style.display = 'flex';
      modalHeader.style.justifyContent = 'space-between';
      modalHeader.style.alignItems = 'center';
      modalHeader.style.marginBottom = '15px';
      
      const modalTitle = document.createElement('h3');
      modalTitle.textContent = `Chat with ${this.state.chatData.otherUser.name || 'User'}`;
      modalTitle.style.margin = '0';
      
      const closeButton = document.createElement('button');
      closeButton.textContent = '×';
      closeButton.style.background = 'none';
      closeButton.style.border = 'none';
      closeButton.style.fontSize = '20px';
      closeButton.style.cursor = 'pointer';
      closeButton.onclick = () => this.closeChatModal();
      
      modalHeader.appendChild(modalTitle);
      modalHeader.appendChild(closeButton);
      modalContent.appendChild(modalHeader);
      
      // Create chat container
      const chatContainer = document.createElement('div');
      chatContainer.className = 'chat-container';
      chatContainer.style.flexGrow = '1';
      chatContainer.style.overflow = 'hidden';
      modalContent.appendChild(chatContainer);
      
      // Add modal to container
      modalContainer.appendChild(modalContent);
      
      // Initialize message chat
      const messageChat = new MessageChat();
      messageChat.init({
        postId: this.state.chatData.postId,
        postType: this.state.chatData.postType,
        otherUser: this.state.chatData.otherUser,
        container: chatContainer
      });
    }
    
    // Render the component
    render() {
      if (!this.containerRef) return;
      
      // Clear container
      this.containerRef.innerHTML = '';
      
      // Create main container
      const mainContainer = document.createElement('div');
      mainContainer.className = 'ride-share-container';
      mainContainer.style.padding = '20px';
      
      // Create title
      const titleElement = document.createElement('h1');
      titleElement.textContent = 'Ride Share';
      titleElement.style.marginBottom = '20px';
      mainContainer.appendChild(titleElement);
      
      // Show loading state
      if (this.state.loading) {
        const loadingElement = document.createElement('div');
        loadingElement.textContent = 'Loading rides...';
        loadingElement.style.padding = '20px';
        loadingElement.style.textAlign = 'center';
        mainContainer.appendChild(loadingElement);
      }
      
      // Show error if any
      else if (this.state.error) {
        const errorElement = document.createElement('div');
        errorElement.textContent = this.state.error;
        errorElement.style.color = 'red';
        errorElement.style.padding = '20px';
        errorElement.style.textAlign = 'center';
        mainContainer.appendChild(errorElement);
      }
      
      // Show empty state if no rides
      else if (this.state.rides.length === 0) {
        const emptyElement = document.createElement('div');
        emptyElement.textContent = 'No rides available. Be the first to post a ride!';
        emptyElement.style.padding = '20px';
        emptyElement.style.textAlign = 'center';
        mainContainer.appendChild(emptyElement);
      }
      
      // Show rides
      else {
        const ridesContainer = document.createElement('div');
        ridesContainer.className = 'rides-container';
        ridesContainer.style.display = 'grid';
        ridesContainer.style.gridTemplateColumns = 'repeat(auto-fill, minmax(300px, 1fr))';
        ridesContainer.style.gap = '20px';
        
        this.state.rides.forEach(ride => {
          const rideCard = document.createElement('div');
          rideCard.className = 'ride-card';
          rideCard.style.border = '1px solid #ddd';
          rideCard.style.borderRadius = '5px';
          rideCard.style.padding = '15px';
          rideCard.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
          
          // Ride type badge
          const typeBadge = document.createElement('div');
          typeBadge.textContent = ride.type === 'offer' ? 'Offering Ride' : 'Requesting Ride';
          typeBadge.style.display = 'inline-block';
          typeBadge.style.padding = '5px 10px';
          typeBadge.style.borderRadius = '15px';
          typeBadge.style.fontSize = '0.8em';
          typeBadge.style.marginBottom = '10px';
          typeBadge.style.backgroundColor = ride.type === 'offer' ? '#e6f7ff' : '#fff7e6';
          typeBadge.style.color = ride.type === 'offer' ? '#0070f3' : '#fa8c16';
          rideCard.appendChild(typeBadge);
          
          // Ride details
          const detailsContainer = document.createElement('div');
          detailsContainer.style.marginBottom = '15px';
          
          // Route
          const routeElement = document.createElement('div');
          routeElement.style.fontSize = '1.2em';
          routeElement.style.fontWeight = 'bold';
          routeElement.style.marginBottom = '5px';
          routeElement.textContent = `${ride.pickup_location} → ${ride.dropoff_location}`;
          detailsContainer.appendChild(routeElement);
          
          // Date and time
          const dateTimeElement = document.createElement('div');
          dateTimeElement.style.marginBottom = '5px';
          dateTimeElement.textContent = `${new Date(ride.date).toLocaleDateString()} at ${ride.time}`;
          detailsContainer.appendChild(dateTimeElement);
          
          // Seats
          const seatsElement = document.createElement('div');
          if (ride.type === 'offer') {
            seatsElement.textContent = `Available Seats: ${ride.available_seats}`;
          } else {
            seatsElement.textContent = `Needed Seats: ${ride.needed_seats}`;
          }
          detailsContainer.appendChild(seatsElement);
          
          // Status
          if (ride.status && ride.status !== 'active') {
            const statusElement = document.createElement('div');
            statusElement.style.fontWeight = 'bold';
            statusElement.style.color = ride.status === 'booked' ? '#52c41a' : '#f5222d';
            statusElement.style.marginTop = '5px';
            statusElement.textContent = `Status: ${ride.status.charAt(0).toUpperCase() + ride.status.slice(1)}`;
            detailsContainer.appendChild(statusElement);
          }
          
          rideCard.appendChild(detailsContainer);
          
          // User info
          const userElement = document.createElement('div');
          userElement.style.display = 'flex';
          userElement.style.alignItems = 'center';
          userElement.style.marginBottom = '15px';
          
          // User avatar
          const avatarElement = document.createElement('div');
          avatarElement.style.width = '30px';
          avatarElement.style.height = '30px';
          avatarElement.style.borderRadius = '50%';
          avatarElement.style.backgroundColor = '#1890ff';
          avatarElement.style.color = 'white';
          avatarElement.style.display = 'flex';
          avatarElement.style.alignItems = 'center';
          avatarElement.style.justifyContent = 'center';
          avatarElement.style.marginRight = '10px';
          avatarElement.textContent = ride.user?.name ? ride.user.name.charAt(0).toUpperCase() : '?';
          userElement.appendChild(avatarElement);
          
          // User name and email
          const userInfoElement = document.createElement('div');
          
          const userNameElement = document.createElement('div');
          userNameElement.style.fontWeight = 'bold';
          userNameElement.textContent = ride.user?.name || 'Unknown User';
          userInfoElement.appendChild(userNameElement);
          
          const userEmailElement = document.createElement('div');
          userEmailElement.style.fontSize = '0.8em';
          userEmailElement.style.color = '#666';
          userEmailElement.textContent = ride.user?.email || '';
          userInfoElement.appendChild(userEmailElement);
          
          userElement.appendChild(userInfoElement);
          rideCard.appendChild(userElement);
          
          // Action buttons
          const actionsElement = document.createElement('div');
          actionsElement.style.display = 'flex';
          actionsElement.style.justifyContent = 'flex-end';
          actionsElement.style.gap = '10px';
          
          // Only show buttons if ride is active
          if (ride.status === 'active' || !ride.status) {
            // Contact button container
            const contactButtonContainer = document.createElement('div');
            contactButtonContainer.id = `contact-button-${ride._id}`;
            actionsElement.appendChild(contactButtonContainer);
            
            // Book Now button (only if current user is not the creator)
            if (ride.user_id !== this.state.currentUser._id && ride.user_id !== this.state.currentUser.id) {
              const bookButton = document.createElement('button');
              bookButton.textContent = 'Book Now';
              bookButton.style.padding = '8px 16px';
              bookButton.style.backgroundColor = '#1890ff';
              bookButton.style.color = 'white';
              bookButton.style.border = 'none';
              bookButton.style.borderRadius = '4px';
              bookButton.style.cursor = 'pointer';
              bookButton.addEventListener('click', () => this.handleBookNow(ride));
              actionsElement.appendChild(bookButton);
            }
          } else {
            // Show booked status
            const bookedElement = document.createElement('div');
            bookedElement.style.color = '#52c41a';
            bookedElement.style.fontWeight = 'bold';
            bookedElement.textContent = 'Booked';
            actionsElement.appendChild(bookedElement);
          }
          
          rideCard.appendChild(actionsElement);
          ridesContainer.appendChild(rideCard);
          
          // Initialize contact button if user is not the creator
          if (ride.status === 'active' || !ride.status) {
            const contactButtonContainer = document.getElementById(`contact-button-${ride._id}`);
            if (contactButtonContainer) {
              const contactButton = new ContactButton();
              contactButton.init({
                postId: ride._id,
                postType: 'ride_share',
                postCreator: {
                  id: ride.user_id,
                  name: ride.user?.name || 'Unknown User',
                  email: ride.user?.email || ''
                },
                onContactInitiated: (data) => this.handleContactInitiated(data),
                container: contactButtonContainer
              });
              
              // Store reference to contact button
              this.contactButtonRefs[ride._id] = contactButton;
            }
          }
        });
        
        mainContainer.appendChild(ridesContainer);
      }
      
      this.containerRef.appendChild(mainContainer);
    }
  }
  
  // Create ref for the container
  const containerRef = React.useRef(null);
  
  // Initialize the component after render
  React.useEffect(() => {
    if (containerRef.current) {
      const rideShareComponent = new RideShareComponent();
      rideShareComponent.init(containerRef.current);
      
      // Cleanup on unmount
      return () => {
        // Clean up any resources if needed
      };
    }
  }, []);
  
  // Return a container div for the component to render into
  return React.createElement('div', { ref: containerRef });
};

export default withNotificationBanner(RideShare, 'ride_share');

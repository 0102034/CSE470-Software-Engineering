import { messageService } from '../services/MessageService';

/**
 * ContactButton component for initiating contact with post creators
 * This is a pure JavaScript implementation (no JSX)
 */
class ContactButton {
  constructor() {
    this.currentUser = JSON.parse(localStorage.getItem('user')) || {};
    this.currentUserId = this.currentUser._id || this.currentUser.id || '';
    this.postCreator = null;
    this.postId = null;
    this.postType = null;
    this.onContactInitiated = null;
    this.buttonElement = null;
  }

  /**
   * Initialize the contact button
   * @param {Object} options - Configuration options
   * @param {string} options.postId - ID of the post
   * @param {string} options.postType - Type of post ('marketplace' or 'ride_share')
   * @param {Object} options.postCreator - The creator of the post
   * @param {Function} options.onContactInitiated - Callback when contact is initiated
   * @param {HTMLElement} options.container - Container element to render the button
   */
  init(options) {
    this.postId = options.postId;
    this.postType = options.postType;
    this.postCreator = options.postCreator;
    this.onContactInitiated = options.onContactInitiated;
    this.containerElement = options.container;

    // Render the button
    this.render();
  }

  /**
   * Check if the current user is the creator of the post
   * @returns {boolean} True if the current user is the creator
   */
  isPostCreator() {
    if (!this.currentUserId || !this.postCreator) return false;
    
    const creatorId = this.postCreator.id || this.postCreator._id || this.postCreator.user_id;
    return this.currentUserId === creatorId;
  }

  /**
   * Handle contact button click
   */
  async handleContactClick() {
    if (!this.currentUserId) {
      // User is not logged in
      alert('Please log in to contact the seller.');
      return;
    }
    
    if (this.isPostCreator()) {
      // User is the creator of the post
      alert('You cannot contact yourself as the creator of this post.');
      return;
    }
    
    // Create a modal dialog for sending the first message
    this.showContactModal();
  }

  /**
   * Show the contact modal dialog
   */
  showContactModal() {
    // Create modal container
    const modalContainer = document.createElement('div');
    modalContainer.className = 'contact-modal';
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
    
    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'contact-modal-content';
    modalContent.style.backgroundColor = 'white';
    modalContent.style.padding = '20px';
    modalContent.style.borderRadius = '5px';
    modalContent.style.width = '500px';
    modalContent.style.maxWidth = '90%';
    
    // Create modal header
    const modalHeader = document.createElement('div');
    modalHeader.className = 'contact-modal-header';
    modalHeader.style.display = 'flex';
    modalHeader.style.justifyContent = 'space-between';
    modalHeader.style.alignItems = 'center';
    modalHeader.style.marginBottom = '15px';
    
    const modalTitle = document.createElement('h3');
    modalTitle.textContent = `Contact ${this.postCreator.name || 'Seller'}`;
    modalTitle.style.margin = '0';
    
    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.style.background = 'none';
    closeButton.style.border = 'none';
    closeButton.style.fontSize = '20px';
    closeButton.style.cursor = 'pointer';
    closeButton.onclick = () => document.body.removeChild(modalContainer);
    
    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(closeButton);
    modalContent.appendChild(modalHeader);
    
    // Create form
    const form = document.createElement('form');
    form.onsubmit = (e) => {
      e.preventDefault();
      this.sendInitialMessage(messageInput.value);
      document.body.removeChild(modalContainer);
    };
    
    // Message input
    const messageLabel = document.createElement('label');
    messageLabel.textContent = 'Message:';
    messageLabel.style.display = 'block';
    messageLabel.style.marginBottom = '5px';
    
    const messageInput = document.createElement('textarea');
    messageInput.placeholder = 'Type your message here...';
    messageInput.style.width = '100%';
    messageInput.style.padding = '8px';
    messageInput.style.marginBottom = '15px';
    messageInput.style.borderRadius = '4px';
    messageInput.style.border = '1px solid #ddd';
    messageInput.style.minHeight = '100px';
    messageInput.required = true;
    
    // Submit button
    const submitButton = document.createElement('button');
    submitButton.type = 'submit';
    submitButton.textContent = 'Send Message';
    submitButton.style.padding = '10px 15px';
    submitButton.style.backgroundColor = '#007bff';
    submitButton.style.color = 'white';
    submitButton.style.border = 'none';
    submitButton.style.borderRadius = '4px';
    submitButton.style.cursor = 'pointer';
    
    form.appendChild(messageLabel);
    form.appendChild(messageInput);
    form.appendChild(submitButton);
    modalContent.appendChild(form);
    
    modalContainer.appendChild(modalContent);
    document.body.appendChild(modalContainer);
    
    // Focus on the message input
    messageInput.focus();
  }

  /**
   * Send the initial message to the post creator
   * @param {string} message - The message content
   */
  async sendInitialMessage(message) {
    if (!message.trim()) return;
    
    try {
      const messageData = {
        sender_id: this.currentUserId,
        receiver_id: this.postCreator.id || this.postCreator._id || this.postCreator.user_id,
        content: message,
        post_id: this.postId,
        post_type: this.postType
      };
      
      // Send the message
      const response = await messageService.sendMessage(messageData);
      
      if (response.status === 'success') {
        // Call the callback if provided
        if (typeof this.onContactInitiated === 'function') {
          this.onContactInitiated({
            postId: this.postId,
            postType: this.postType,
            postCreator: this.postCreator,
            initialMessage: message
          });
        }
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending initial message:', error);
      alert('Failed to send message. Please try again.');
    }
  }

  /**
   * Render the contact button
   */
  render() {
    if (!this.containerElement) return;
    
    // Clear container
    this.containerElement.innerHTML = '';
    
    // Create button only if the current user is not the creator
    if (!this.isPostCreator()) {
      const buttonElement = document.createElement('button');
      buttonElement.className = 'contact-button';
      buttonElement.textContent = 'Contact';
      buttonElement.style.padding = '8px 16px';
      buttonElement.style.backgroundColor = '#28a745';
      buttonElement.style.color = 'white';
      buttonElement.style.border = 'none';
      buttonElement.style.borderRadius = '4px';
      buttonElement.style.cursor = 'pointer';
      buttonElement.style.marginRight = '10px';
      
      // Add click event listener
      buttonElement.addEventListener('click', () => this.handleContactClick());
      
      this.containerElement.appendChild(buttonElement);
      this.buttonElement = buttonElement;
    }
  }

  /**
   * Disable the contact button
   */
  disable() {
    if (this.buttonElement) {
      this.buttonElement.disabled = true;
      this.buttonElement.style.backgroundColor = '#6c757d';
      this.buttonElement.style.cursor = 'not-allowed';
    }
  }

  /**
   * Enable the contact button
   */
  enable() {
    if (this.buttonElement) {
      this.buttonElement.disabled = false;
      this.buttonElement.style.backgroundColor = '#28a745';
      this.buttonElement.style.cursor = 'pointer';
    }
  }
}

export default ContactButton;

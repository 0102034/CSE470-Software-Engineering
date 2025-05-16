import { messageService } from '../services/MessageService';

/**
 * MessageChat component for real-time messaging
 * This is a pure JavaScript implementation (no JSX)
 */
class MessageChat {
  constructor() {
    this.messages = [];
    this.currentUser = JSON.parse(localStorage.getItem('user')) || {};
    this.currentUserId = this.currentUser._id || this.currentUser.id || '';
    this.otherUser = null;
    this.postId = null;
    this.postType = null;
    this.socket = null;
    this.messageListeners = [];
    this.containerElement = null;
  }

  /**
   * Initialize the chat component
   * @param {Object} options - Configuration options
   * @param {string} options.postId - ID of the post
   * @param {string} options.postType - Type of post ('marketplace' or 'ride_share')
   * @param {Object} options.otherUser - The other user in the conversation
   * @param {HTMLElement} options.container - Container element to render the chat
   */
  init(options) {
    this.postId = options.postId;
    this.postType = options.postType;
    this.otherUser = options.otherUser;
    this.containerElement = options.container;

    // Connect to socket
    this.socket = messageService.connectSocket();
    
    // Setup socket event listeners
    this.setupSocketListeners();
    
    // Load existing messages
    this.loadMessages();
    
    // Render the chat UI
    this.render();
  }

  /**
   * Set up socket event listeners
   */
  setupSocketListeners() {
    if (!this.socket) return;
    
    // Listen for new messages
    this.socket.on('new_message', (message) => {
      // Add message to the list
      this.messages.unshift(message);
      
      // Update UI
      this.updateMessageList();
      
      // Mark message as read if it's for the current user
      if (message.receiver_id === this.currentUserId) {
        messageService.markMessageRead(message._id, this.currentUserId);
      }
      
      // Notify listeners
      this.notifyMessageListeners(message);
    });
    
    // Listen for message read status updates
    this.socket.on('message_read', (data) => {
      // Find the message and update its read status
      const message = this.messages.find(m => m._id === data.message_id);
      if (message) {
        message.read = true;
        this.updateMessageList();
      }
    });
  }

  /**
   * Load existing messages from the server
   */
  async loadMessages() {
    try {
      const response = await messageService.getConversationMessages(
        this.otherUser.id || this.otherUser._id,
        this.postId
      );
      
      if (response.status === 'success' && response.messages) {
        this.messages = response.messages;
        this.updateMessageList();
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      this.showError('Failed to load messages. Please try again.');
    }
  }

  /**
   * Send a message
   * @param {string} content - Message content
   * @param {File} attachment - Optional image attachment
   */
  async sendMessage(content, attachment = null) {
    if (!content.trim() && !attachment) return;
    
    try {
      const messageData = {
        sender_id: this.currentUserId,
        receiver_id: this.otherUser.id || this.otherUser._id,
        content: content,
        post_id: this.postId,
        post_type: this.postType
      };
      
      // Send message
      if (attachment) {
        await messageService.sendMessage(messageData, attachment);
      } else {
        await messageService.sendMessage(messageData);
      }
      
      // Clear input field
      const inputElement = this.containerElement.querySelector('#message-input');
      if (inputElement) {
        inputElement.value = '';
      }
      
      // Clear attachment preview
      const attachmentPreview = this.containerElement.querySelector('#attachment-preview');
      if (attachmentPreview) {
        attachmentPreview.innerHTML = '';
        attachmentPreview.style.display = 'none';
      }
    } catch (error) {
      console.error('Error sending message:', error);
      this.showError('Failed to send message. Please try again.');
    }
  }

  /**
   * Update the message list in the UI
   */
  updateMessageList() {
    const messageList = this.containerElement.querySelector('#message-list');
    if (!messageList) return;
    
    // Clear existing messages
    messageList.innerHTML = '';
    
    // Add messages to the list
    this.messages.forEach(message => {
      const isCurrentUser = message.sender_id === this.currentUserId;
      
      // Create message element
      const messageElement = document.createElement('div');
      messageElement.className = `message ${isCurrentUser ? 'message-sent' : 'message-received'}`;
      
      // Message content
      const contentElement = document.createElement('div');
      contentElement.className = 'message-content';
      contentElement.textContent = message.content;
      messageElement.appendChild(contentElement);
      
      // Message attachment if any
      if (message.attachment_url) {
        const attachmentElement = document.createElement('img');
        attachmentElement.className = 'message-attachment';
        attachmentElement.src = message.attachment_url;
        attachmentElement.alt = 'Attachment';
        attachmentElement.style.maxWidth = '200px';
        attachmentElement.style.maxHeight = '200px';
        attachmentElement.style.cursor = 'pointer';
        attachmentElement.onclick = () => window.open(message.attachment_url, '_blank');
        messageElement.appendChild(attachmentElement);
      }
      
      // Message timestamp
      const timestampElement = document.createElement('div');
      timestampElement.className = 'message-timestamp';
      timestampElement.textContent = new Date(message.created_at).toLocaleTimeString();
      messageElement.appendChild(timestampElement);
      
      // Add read status for sent messages
      if (isCurrentUser) {
        const readStatusElement = document.createElement('div');
        readStatusElement.className = 'message-read-status';
        readStatusElement.textContent = message.read ? 'Read' : 'Sent';
        messageElement.appendChild(readStatusElement);
      }
      
      // Add message to list
      messageList.appendChild(messageElement);
    });
    
    // Scroll to bottom
    messageList.scrollTop = messageList.scrollHeight;
  }

  /**
   * Add a message listener
   * @param {Function} listener - Callback function
   */
  addMessageListener(listener) {
    this.messageListeners.push(listener);
  }

  /**
   * Notify all message listeners
   * @param {Object} message - The message object
   */
  notifyMessageListeners(message) {
    this.messageListeners.forEach(listener => listener(message));
  }

  /**
   * Show an error message
   * @param {string} message - Error message
   */
  showError(message) {
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.textContent = message;
    errorElement.style.color = 'red';
    errorElement.style.padding = '10px';
    errorElement.style.marginBottom = '10px';
    
    // Add to container
    this.containerElement.prepend(errorElement);
    
    // Remove after 5 seconds
    setTimeout(() => {
      errorElement.remove();
    }, 5000);
  }

  /**
   * Render the chat UI
   */
  render() {
    if (!this.containerElement) return;
    
    // Clear container
    this.containerElement.innerHTML = '';
    
    // Create chat header
    const headerElement = document.createElement('div');
    headerElement.className = 'chat-header';
    headerElement.style.padding = '10px';
    headerElement.style.borderBottom = '1px solid #ddd';
    headerElement.style.display = 'flex';
    headerElement.style.alignItems = 'center';
    
    // User avatar
    const avatarElement = document.createElement('div');
    avatarElement.className = 'chat-avatar';
    avatarElement.style.width = '40px';
    avatarElement.style.height = '40px';
    avatarElement.style.borderRadius = '50%';
    avatarElement.style.backgroundColor = '#007bff';
    avatarElement.style.color = 'white';
    avatarElement.style.display = 'flex';
    avatarElement.style.alignItems = 'center';
    avatarElement.style.justifyContent = 'center';
    avatarElement.style.marginRight = '10px';
    avatarElement.textContent = this.otherUser.name ? this.otherUser.name.charAt(0).toUpperCase() : '?';
    headerElement.appendChild(avatarElement);
    
    // User info
    const userInfoElement = document.createElement('div');
    userInfoElement.className = 'chat-user-info';
    
    const nameElement = document.createElement('div');
    nameElement.className = 'chat-user-name';
    nameElement.style.fontWeight = 'bold';
    nameElement.textContent = this.otherUser.name || 'Unknown User';
    userInfoElement.appendChild(nameElement);
    
    const emailElement = document.createElement('div');
    emailElement.className = 'chat-user-email';
    emailElement.style.fontSize = '0.8em';
    emailElement.style.color = '#666';
    emailElement.textContent = this.otherUser.email || '';
    userInfoElement.appendChild(emailElement);
    
    headerElement.appendChild(userInfoElement);
    this.containerElement.appendChild(headerElement);
    
    // Create message list
    const messageListElement = document.createElement('div');
    messageListElement.id = 'message-list';
    messageListElement.className = 'message-list';
    messageListElement.style.height = '300px';
    messageListElement.style.overflowY = 'auto';
    messageListElement.style.padding = '10px';
    messageListElement.style.display = 'flex';
    messageListElement.style.flexDirection = 'column-reverse';
    this.containerElement.appendChild(messageListElement);
    
    // Create attachment preview
    const attachmentPreviewElement = document.createElement('div');
    attachmentPreviewElement.id = 'attachment-preview';
    attachmentPreviewElement.className = 'attachment-preview';
    attachmentPreviewElement.style.padding = '10px';
    attachmentPreviewElement.style.display = 'none';
    this.containerElement.appendChild(attachmentPreviewElement);
    
    // Create message input
    const inputContainerElement = document.createElement('div');
    inputContainerElement.className = 'message-input-container';
    inputContainerElement.style.padding = '10px';
    inputContainerElement.style.borderTop = '1px solid #ddd';
    inputContainerElement.style.display = 'flex';
    
    // Attachment button
    const attachmentButtonElement = document.createElement('button');
    attachmentButtonElement.className = 'attachment-button';
    attachmentButtonElement.textContent = '📎';
    attachmentButtonElement.style.marginRight = '10px';
    attachmentButtonElement.style.cursor = 'pointer';
    attachmentButtonElement.style.border = 'none';
    attachmentButtonElement.style.background = 'none';
    attachmentButtonElement.style.fontSize = '1.2em';
    
    // Hidden file input
    const fileInputElement = document.createElement('input');
    fileInputElement.type = 'file';
    fileInputElement.id = 'attachment-input';
    fileInputElement.accept = 'image/*';
    fileInputElement.style.display = 'none';
    
    // Handle file selection
    fileInputElement.addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (file) {
        // Show preview
        const reader = new FileReader();
        reader.onload = (e) => {
          attachmentPreviewElement.innerHTML = '';
          attachmentPreviewElement.style.display = 'block';
          
          const previewImage = document.createElement('img');
          previewImage.src = e.target.result;
          previewImage.style.maxWidth = '100px';
          previewImage.style.maxHeight = '100px';
          attachmentPreviewElement.appendChild(previewImage);
          
          const removeButton = document.createElement('button');
          removeButton.textContent = '✕';
          removeButton.style.marginLeft = '10px';
          removeButton.style.cursor = 'pointer';
          removeButton.style.border = 'none';
          removeButton.style.background = 'none';
          removeButton.addEventListener('click', () => {
            attachmentPreviewElement.innerHTML = '';
            attachmentPreviewElement.style.display = 'none';
            fileInputElement.value = '';
          });
          attachmentPreviewElement.appendChild(removeButton);
        };
        reader.readAsDataURL(file);
      }
    });
    
    // Connect attachment button to file input
    attachmentButtonElement.addEventListener('click', () => {
      fileInputElement.click();
    });
    
    inputContainerElement.appendChild(attachmentButtonElement);
    inputContainerElement.appendChild(fileInputElement);
    
    // Text input
    const inputElement = document.createElement('input');
    inputElement.id = 'message-input';
    inputElement.className = 'message-input';
    inputElement.type = 'text';
    inputElement.placeholder = 'Type a message...';
    inputElement.style.flexGrow = '1';
    inputElement.style.padding = '8px';
    inputElement.style.border = '1px solid #ddd';
    inputElement.style.borderRadius = '4px';
    inputElement.style.marginRight = '10px';
    
    // Handle enter key
    inputElement.addEventListener('keypress', (event) => {
      if (event.key === 'Enter') {
        const file = fileInputElement.files[0];
        this.sendMessage(inputElement.value, file);
      }
    });
    
    inputContainerElement.appendChild(inputElement);
    
    // Send button
    const sendButtonElement = document.createElement('button');
    sendButtonElement.className = 'send-button';
    sendButtonElement.textContent = 'Send';
    sendButtonElement.style.padding = '8px 16px';
    sendButtonElement.style.backgroundColor = '#007bff';
    sendButtonElement.style.color = 'white';
    sendButtonElement.style.border = 'none';
    sendButtonElement.style.borderRadius = '4px';
    sendButtonElement.style.cursor = 'pointer';
    
    // Handle click
    sendButtonElement.addEventListener('click', () => {
      const file = fileInputElement.files[0];
      this.sendMessage(inputElement.value, file);
    });
    
    inputContainerElement.appendChild(sendButtonElement);
    this.containerElement.appendChild(inputContainerElement);
    
    // Update message list
    this.updateMessageList();
  }

  /**
   * Cleanup when component is unmounted
   */
  cleanup() {
    // Remove socket event listeners
    if (this.socket) {
      this.socket.off('new_message');
      this.socket.off('message_read');
    }
    
    // Clear message listeners
    this.messageListeners = [];
  }
}

export default MessageChat;

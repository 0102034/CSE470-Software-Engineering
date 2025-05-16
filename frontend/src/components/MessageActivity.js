import { messageService } from '../services/MessageService';
import MessageChat from './MessageChat';

/**
 * MessageActivity component for displaying user's message activity
 * This is a pure JavaScript implementation (no JSX)
 */
class MessageActivity {
  constructor() {
    this.conversations = [];
    this.currentUser = JSON.parse(localStorage.getItem('user')) || {};
    this.currentUserId = this.currentUser._id || this.currentUser.id || '';
    this.selectedConversation = null;
    this.containerElement = null;
    this.messageChat = null;
    this.socket = null;
  }

  /**
   * Initialize the message activity component
   * @param {Object} options - Configuration options
   * @param {HTMLElement} options.container - Container element to render the component
   */
  init(options) {
    this.containerElement = options.container;

    // Connect to socket
    this.socket = messageService.connectSocket();
    
    // Setup socket event listeners
    this.setupSocketListeners();
    
    // Load conversations
    this.loadConversations();
    
    // Render the UI
    this.render();
  }

  /**
   * Set up socket event listeners
   */
  setupSocketListeners() {
    if (!this.socket) return;
    
    // Listen for new messages
    this.socket.on('new_message', (message) => {
      // Reload conversations to get the latest
      this.loadConversations();
    });
  }

  /**
   * Load conversations from the server
   */
  async loadConversations() {
    try {
      const response = await messageService.getConversations();
      
      if (response.status === 'success' && response.conversations) {
        this.conversations = response.conversations;
        this.updateConversationList();
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      this.showError('Failed to load conversations. Please try again.');
    }
  }

  /**
   * Select a conversation and show the chat
   * @param {Object} conversation - The conversation to select
   */
  selectConversation(conversation) {
    this.selectedConversation = conversation;
    
    // Update UI to show selected conversation
    const conversationItems = this.containerElement.querySelectorAll('.conversation-item');
    conversationItems.forEach(item => {
      item.classList.remove('selected');
      if (item.dataset.id === conversation._id) {
        item.classList.add('selected');
      }
    });
    
    // Show the chat for this conversation
    this.showChat(conversation);
  }

  /**
   * Show the chat for a conversation
   * @param {Object} conversation - The conversation to show chat for
   */
  showChat(conversation) {
    const chatContainer = this.containerElement.querySelector('#chat-container');
    if (!chatContainer) return;
    
    // Clear chat container
    chatContainer.innerHTML = '';
    
    // Create and initialize message chat
    this.messageChat = new MessageChat();
    this.messageChat.init({
      postId: conversation.post_id,
      postType: conversation.post_type || 'marketplace', // Default to marketplace if not specified
      otherUser: conversation.other_participant,
      container: chatContainer
    });
    
    // Join the conversation room
    messageService.joinConversation(conversation._id);
  }

  /**
   * Update the conversation list in the UI
   */
  updateConversationList() {
    const conversationList = this.containerElement.querySelector('#conversation-list');
    if (!conversationList) return;
    
    // Clear existing conversations
    conversationList.innerHTML = '';
    
    if (this.conversations.length === 0) {
      const emptyElement = document.createElement('div');
      emptyElement.className = 'empty-conversations';
      emptyElement.textContent = 'No conversations yet';
      emptyElement.style.padding = '20px';
      emptyElement.style.textAlign = 'center';
      emptyElement.style.color = '#666';
      conversationList.appendChild(emptyElement);
      return;
    }
    
    // Add conversations to the list
    this.conversations.forEach(conversation => {
      const otherUser = conversation.other_participant;
      
      // Create conversation element
      const conversationElement = document.createElement('div');
      conversationElement.className = 'conversation-item';
      conversationElement.dataset.id = conversation._id;
      conversationElement.style.padding = '10px';
      conversationElement.style.borderBottom = '1px solid #eee';
      conversationElement.style.cursor = 'pointer';
      conversationElement.style.display = 'flex';
      conversationElement.style.alignItems = 'center';
      
      // Add hover effect
      conversationElement.addEventListener('mouseover', () => {
        conversationElement.style.backgroundColor = '#f5f5f5';
      });
      
      conversationElement.addEventListener('mouseout', () => {
        conversationElement.style.backgroundColor = '';
      });
      
      // User avatar
      const avatarElement = document.createElement('div');
      avatarElement.className = 'conversation-avatar';
      avatarElement.style.width = '40px';
      avatarElement.style.height = '40px';
      avatarElement.style.borderRadius = '50%';
      avatarElement.style.backgroundColor = '#007bff';
      avatarElement.style.color = 'white';
      avatarElement.style.display = 'flex';
      avatarElement.style.alignItems = 'center';
      avatarElement.style.justifyContent = 'center';
      avatarElement.style.marginRight = '10px';
      avatarElement.style.flexShrink = '0';
      avatarElement.textContent = otherUser.name ? otherUser.name.charAt(0).toUpperCase() : '?';
      conversationElement.appendChild(avatarElement);
      
      // Conversation info
      const infoElement = document.createElement('div');
      infoElement.className = 'conversation-info';
      infoElement.style.flexGrow = '1';
      infoElement.style.overflow = 'hidden';
      
      const nameElement = document.createElement('div');
      nameElement.className = 'conversation-name';
      nameElement.style.fontWeight = 'bold';
      nameElement.style.whiteSpace = 'nowrap';
      nameElement.style.overflow = 'hidden';
      nameElement.style.textOverflow = 'ellipsis';
      nameElement.textContent = otherUser.name || 'Unknown User';
      infoElement.appendChild(nameElement);
      
      // Last message preview
      if (conversation.last_message || conversation.latest_message) {
        const lastMessageElement = document.createElement('div');
        lastMessageElement.className = 'conversation-last-message';
        lastMessageElement.style.fontSize = '0.9em';
        lastMessageElement.style.color = '#666';
        lastMessageElement.style.whiteSpace = 'nowrap';
        lastMessageElement.style.overflow = 'hidden';
        lastMessageElement.style.textOverflow = 'ellipsis';
        
        const messageContent = conversation.latest_message ? 
          conversation.latest_message.content : conversation.last_message;
        
        lastMessageElement.textContent = messageContent || '';
        infoElement.appendChild(lastMessageElement);
      }
      
      conversationElement.appendChild(infoElement);
      
      // Timestamp
      if (conversation.last_message_time) {
        const timestampElement = document.createElement('div');
        timestampElement.className = 'conversation-timestamp';
        timestampElement.style.fontSize = '0.8em';
        timestampElement.style.color = '#999';
        timestampElement.style.marginLeft = '10px';
        
        const date = new Date(conversation.last_message_time);
        const now = new Date();
        let timeText;
        
        if (date.toDateString() === now.toDateString()) {
          // Today, show time
          timeText = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
          // Not today, show date
          timeText = date.toLocaleDateString();
        }
        
        timestampElement.textContent = timeText;
        conversationElement.appendChild(timestampElement);
      }
      
      // Add click event to select conversation
      conversationElement.addEventListener('click', () => {
        this.selectConversation(conversation);
      });
      
      conversationList.appendChild(conversationElement);
    });
    
    // If there's a selected conversation, highlight it
    if (this.selectedConversation) {
      const selectedElement = conversationList.querySelector(`[data-id="${this.selectedConversation._id}"]`);
      if (selectedElement) {
        selectedElement.classList.add('selected');
        selectedElement.style.backgroundColor = '#e6f2ff';
      }
    } else if (this.conversations.length > 0) {
      // Select the first conversation by default
      this.selectConversation(this.conversations[0]);
    }
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
   * Render the message activity UI
   */
  render() {
    if (!this.containerElement) return;
    
    // Clear container
    this.containerElement.innerHTML = '';
    
    // Create title
    const titleElement = document.createElement('h2');
    titleElement.textContent = 'Message Activity';
    titleElement.style.marginBottom = '20px';
    this.containerElement.appendChild(titleElement);
    
    // Create main container with split view
    const mainContainer = document.createElement('div');
    mainContainer.className = 'message-activity-container';
    mainContainer.style.display = 'flex';
    mainContainer.style.height = '500px';
    mainContainer.style.border = '1px solid #ddd';
    mainContainer.style.borderRadius = '4px';
    mainContainer.style.overflow = 'hidden';
    
    // Create conversation list container (left side)
    const conversationListContainer = document.createElement('div');
    conversationListContainer.className = 'conversation-list-container';
    conversationListContainer.style.width = '300px';
    conversationListContainer.style.borderRight = '1px solid #ddd';
    conversationListContainer.style.overflowY = 'auto';
    
    // Create conversation list
    const conversationList = document.createElement('div');
    conversationList.id = 'conversation-list';
    conversationList.className = 'conversation-list';
    conversationListContainer.appendChild(conversationList);
    
    // Create chat container (right side)
    const chatContainer = document.createElement('div');
    chatContainer.id = 'chat-container';
    chatContainer.className = 'chat-container';
    chatContainer.style.flexGrow = '1';
    chatContainer.style.display = 'flex';
    chatContainer.style.flexDirection = 'column';
    
    // Add empty state for chat
    if (!this.selectedConversation) {
      const emptyChatElement = document.createElement('div');
      emptyChatElement.className = 'empty-chat';
      emptyChatElement.style.display = 'flex';
      emptyChatElement.style.flexDirection = 'column';
      emptyChatElement.style.alignItems = 'center';
      emptyChatElement.style.justifyContent = 'center';
      emptyChatElement.style.height = '100%';
      emptyChatElement.style.color = '#666';
      
      const iconElement = document.createElement('div');
      iconElement.textContent = 'ud83dudcac';
      iconElement.style.fontSize = '48px';
      iconElement.style.marginBottom = '10px';
      emptyChatElement.appendChild(iconElement);
      
      const textElement = document.createElement('div');
      textElement.textContent = 'Select a conversation to start chatting';
      emptyChatElement.appendChild(textElement);
      
      chatContainer.appendChild(emptyChatElement);
    }
    
    mainContainer.appendChild(conversationListContainer);
    mainContainer.appendChild(chatContainer);
    
    this.containerElement.appendChild(mainContainer);
    
    // Update conversation list
    this.updateConversationList();
  }

  /**
   * Cleanup when component is unmounted
   */
  cleanup() {
    // Remove socket event listeners
    if (this.socket) {
      this.socket.off('new_message');
    }
    
    // Clean up message chat if exists
    if (this.messageChat) {
      this.messageChat.cleanup();
    }
    
    // Leave conversation room if in one
    if (this.selectedConversation) {
      messageService.leaveConversation(this.selectedConversation._id);
    }
  }
}

export default MessageActivity;

const SHARE_CONFIG = {
  domain: window.location.origin,
  appName: 'StudySphere'
};

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} - Success status
 */
const copyToClipboard = async (text) => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const result = document.execCommand('copy');
      document.body.removeChild(textArea);
      return result;
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
};

/**
 * Show share feedback to user
 * @param {string} message - Feedback message
 * @param {string} type - Type of feedback ('success' or 'error')
 */
const showShareFeedback = (message, type = 'success') => {
  // Create a toast notification
  const toast = document.createElement('div');
  toast.className = `share-toast share-toast-${type}`;
  toast.textContent = message;
  
  // Style the toast
  Object.assign(toast.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    backgroundColor: type === 'success' ? 'var(--secondary)' : 'var(--rose)',
    color: 'white',
    padding: '12px 24px',
    borderRadius: 'var(--radius-lg)',
    fontSize: '14px',
    fontWeight: '500',
    zIndex: '9999',
    boxShadow: 'var(--shadow-lg)',
    transform: 'translateX(100%)',
    transition: 'transform 0.3s ease-in-out',
    backdropFilter: 'blur(10px)'
  });
  
  document.body.appendChild(toast);
  
  // Animate in
  setTimeout(() => {
    toast.style.transform = 'translateX(0)';
  }, 10);
  
  // Remove after 3 seconds
  setTimeout(() => {
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    }, 300);
  }, 3000);
};

/**
 * Share a post
 * @param {Object} post - Post object with id, title, content
 * @returns {Promise<void>}
 */
export const sharePost = async (post) => {
  const url = `${SHARE_CONFIG.domain}/post/${post.id}`;
  const title = post.title || 'Check out this post';
  const text = post.content 
    ? `${title}\n\n${post.content.substring(0, 150)}${post.content.length > 150 ? '...' : ''}`
    : title;

  const shareData = {
    title: `${title} - ${SHARE_CONFIG.appName}`,
    text: text,
    url: url
  };

  try {
    // Try native Web Share API first (mobile/modern browsers)
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      await navigator.share(shareData);
      return;
    }
    
    // Fallback to clipboard copy
    const shareText = `${title}\n\n${text}\n\n📖 View on ${SHARE_CONFIG.appName}: ${url}`;
    const success = await copyToClipboard(shareText);
    
    if (success) {
      showShareFeedback('Post link copied to clipboard! 📋');
    } else {
      showShareFeedback('Failed to copy link. Please try again.', 'error');
    }
  } catch (error) {
    console.error('Error sharing post:', error);
    
    // Final fallback - copy just the URL
    const success = await copyToClipboard(url);
    if (success) {
      showShareFeedback('Post link copied to clipboard! 📋');
    } else {
      showShareFeedback('Failed to share. Please copy the URL manually.', 'error');
    }
  }
};

/**
 * Share a flashcard set
 * @param {Object} flashcardSet - Flashcard set object with id, title, description, flashcards
 * @returns {Promise<void>}
 */
export const shareFlashcardSet = async (flashcardSet) => {
  const url = `${SHARE_CONFIG.domain}/flashcards/${flashcardSet.id}`;
  const title = flashcardSet.title || 'Check out this flashcard set';
  const cardCount = flashcardSet.flashcards?.length || flashcardSet.card_count || 0;
  const description = flashcardSet.description || '';
  
  const text = description 
    ? `${title} (${cardCount} cards)\n\n${description.substring(0, 150)}${description.length > 150 ? '...' : ''}`
    : `${title} - ${cardCount} flashcards to help you study`;

  const shareData = {
    title: `${title} - ${SHARE_CONFIG.appName}`,
    text: text,
    url: url
  };

  try {
    // Try native Web Share API first
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      await navigator.share(shareData);
      return;
    }
    
    // Fallback to clipboard copy
    const shareText = `🎓 ${title}\n📚 ${cardCount} flashcards\n\n${description ? description + '\n\n' : ''}📖 Study on ${SHARE_CONFIG.appName}: ${url}`;
    const success = await copyToClipboard(shareText);
    
    if (success) {
      showShareFeedback('Flashcard set link copied to clipboard! 📋');
    } else {
      showShareFeedback('Failed to copy link. Please try again.', 'error');
    }
  } catch (error) {
    console.error('Error sharing flashcard set:', error);
    
    // Final fallback - copy just the URL
    const success = await copyToClipboard(url);
    if (success) {
      showShareFeedback('Flashcard set link copied to clipboard! 📋');
    } else {
      showShareFeedback('Failed to share. Please copy the URL manually.', 'error');
    }
  }
};

/**
 * Generic share function that determines content type and calls appropriate handler
 * @param {Object} content - Content object with type indicator
 * @returns {Promise<void>}
 */
export const shareContent = async (content) => {
  if (content.type === 'post' || content.title && content.content !== undefined) {
    await sharePost(content);
  } else if (content.type === 'flashcard-set' || content.flashcards !== undefined || content.card_count !== undefined) {
    await shareFlashcardSet(content);
  } else {
    console.error('Unknown content type for sharing:', content);
    showShareFeedback('Unable to share this content.', 'error');
  }
}; 
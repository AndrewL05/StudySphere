import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router';
import supabase from '../Services/supabaseClient';
import PostCard from './PostCard';
import './SearchOverlay.css';

const formatTimeAgo = (dateString) => {
  if (!dateString) return 'unknown time';
  const now = new Date();
  const postDate = new Date(dateString);
  const diffInSeconds = Math.floor((now - postDate) / 1000);
  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  if (diffInSeconds < 2629800) return `${Math.floor(diffInSeconds / 604800)} weeks ago`;
  if (diffInSeconds < 31557600) return `${Math.floor(diffInSeconds / 2629800)} months ago`;
  return `${Math.floor(diffInSeconds / 31557600)} years ago`;
};

const SearchOverlay = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const debounceRef = useRef(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user ? user.id : null);
    };
    if (isOpen) getUser();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setSearched(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const searchPosts = useCallback(async (searchQuery) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setSearched(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) {
        console.error('Search error:', error);
        return;
      }
      setResults(data || []);
      setSearched(true);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchPosts(value), 300);
  };

  const handleResultClick = (postId) => {
    onClose();
    navigate(`/post/${postId}`);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="search-overlay" onClick={handleBackdropClick}>
      <div className="search-overlay-inner">
        <div className="search-overlay-header">
          <svg className="search-overlay-icon" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="search-overlay-input"
            placeholder="Search posts..."
            value={query}
            onChange={handleInputChange}
          />
          <button className="search-overlay-close" onClick={onClose}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {loading && (
          <div className="search-overlay-loading">Searching...</div>
        )}

        {!loading && searched && results.length > 0 && (
          <>
            <div className="search-overlay-meta">
              {results.length} result{results.length !== 1 ? 's' : ''} found
            </div>
            <div className="search-overlay-results">
              {results.map((post) => (
                <div key={post.id} className="search-overlay-result-link" onClick={() => handleResultClick(post.id)}>
                  <PostCard
                    id={post.id}
                    title={post.title}
                    content={post.content || ''}
                    image={post.image_url}
                    authorId={post.user_id}
                    time={formatTimeAgo(post.created_at)}
                    upvotesNum={post.upvotes || 0}
                    userId={userId}
                  />
                </div>
              ))}
            </div>
          </>
        )}

        {!loading && searched && results.length === 0 && (
          <div className="search-overlay-empty">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <p>No posts found for "{query}"</p>
            <p>Try different keywords or check your spelling.</p>
          </div>
        )}

        {!loading && !searched && (
          <div className="search-overlay-hint">
            <p>Type to search posts</p>
            <p>Press <kbd>ESC</kbd> to close</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchOverlay;

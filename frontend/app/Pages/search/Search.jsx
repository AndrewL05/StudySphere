import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import supabase from '../../Services/supabaseClient';
import PostCard from '../../Components/PostCard';
import './Search.css';

const Search = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const query = searchParams.get('q') || '';

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      } else {
        setUserId(null);
      }
    };

    getCurrentUser();

    const fetchSearchResults = async () => {
      setLoading(true);
      try {
        if (!query.trim()) {
          setPosts([]);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('posts')
          .select('*')
          .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error searching posts:', error);
          return;
        }

        setPosts(data || []);
      } catch (err) {
        console.error('Unexpected error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSearchResults();
  }, [query]);

  const handlePostClick = (postId) => {
    navigate(`/post/${postId}`);
  };

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

  if (loading) {
    return <div className="search-page"><div className="search-loading">Searching...</div></div>;
  }

  return (
    <div className="search-page">
      <h1 className="search-heading">
        Results for <span>"{query}"</span>
      </h1>
      <p className="search-results-count">
        {posts.length} result{posts.length !== 1 ? 's' : ''} found
      </p>

      {posts.length === 0 ? (
        <div className="search-empty">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <p>No posts match your search.</p>
          <p>Try different keywords or check your spelling.</p>
        </div>
      ) : (
        <div className="search-results-list">
          {posts.map((post) => (
            <div key={post.id} className="search-result-link" onClick={() => handlePostClick(post.id)}>
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
      )}
    </div>
  );
};

export default Search;

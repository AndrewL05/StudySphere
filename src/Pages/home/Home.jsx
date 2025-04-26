import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import supabase from '../../Services/supabaseClient';
import PostCard from '../../Components/PostCard';
import Filter from '../../Components/Filter';
import './Home.css';

const Home = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentFilter, setCurrentFilter] = useState('newest');
  const [userId, setUserId] = useState(null);
  const navigate = useNavigate();

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
    
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT') {
          setUserId(null);
        } else if (event === 'SIGNED_IN' && session) {
          setUserId(session.user.id);
        }
      }
    );
    
    fetchPosts(currentFilter);
  
    return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, [currentFilter]);

  const fetchPosts = async (filter) => {
    setLoading(true);
    try {
      console.log('Fetching posts with filter:', filter);
      
      let query = supabase.from('posts').select('*');

      switch(filter) {
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
        case 'oldest':
          query = query.order('created_at', { ascending: true });
          break;
        case 'popular':
          query = query.order('upvotes', { ascending: false });
          break;
        default:
          query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching posts:', error);
        return;
      }

      console.log('Fetched posts:', data);
      setPosts(data || []);
    } catch (err) {
      console.error('Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filterId) => {
    console.log('Filter changed to:', filterId);
    setCurrentFilter(filterId);
  };

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
    return <div className="home-page loading">Loading posts...</div>;
  }

  return (
    <div className="home-page">
      <Filter activeFilter={currentFilter} onFilterChange={handleFilterChange} />
      
      {posts.length === 0 ? (
        <p className="no-posts">No posts available. Be the first to create a post!</p>
      ) : (
        posts.map((post) => (
          <div key={post.id} onClick={() => handlePostClick(post.id)} style={{ cursor: 'pointer' }}>
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
        ))
      )}
    </div>
  );
};

export default Home;
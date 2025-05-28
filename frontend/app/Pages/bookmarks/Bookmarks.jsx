import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import supabase from '../../Services/supabaseClient';
import PostCard from '../../Components/PostCard';
import './Bookmarks.css'; 

const Bookmarks = () => {
  const [bookmarkedPosts, setBookmarkedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    const fetchUserDataAndBookmarks = async () => {
      setLoading(true);
      setError(null);

      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (!isMounted) return;

      if (userError || !user) {
        console.error("User not logged in or error fetching user:", userError);
        setError("Please log in to view your bookmarks.");
        setLoading(false);
        return;
      }
      setUserId(user.id);

      try {
        const { data: bookmarks, error: bookmarkError } = await supabase
          .from('bookmarked_posts')
          .select('post_id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }); 

        if (!isMounted) return;
        if (bookmarkError) throw bookmarkError;

        if (!bookmarks || bookmarks.length === 0) {
          setBookmarkedPosts([]); 
        } else {
          const postIds = bookmarks.map(b => b.post_id);
          const { data: postsData, error: postsError } = await supabase
            .from('posts')
            .select('*, comments(count)') 
            .in('id', postIds);

          if (!isMounted) return;
          if (postsError) throw postsError;

          const orderedPosts = postIds.map(pId => postsData.find(p => p.id === pId)).filter(Boolean);
          setBookmarkedPosts(orderedPosts || []);

        }
      } catch (err) {
        if (isMounted) {
          console.error("Error fetching bookmarked posts:", err);
          setError("Failed to load your bookmarked posts.");
          setBookmarkedPosts([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchUserDataAndBookmarks();

    return () => { isMounted = false; };
  }, [navigate]); 

  const formatTimeAgo = (dateString) => {
    if (!dateString) return 'unknown time';
    const now = new Date();
    const postDate = new Date(dateString);
    const diffInSeconds = Math.floor((now - postDate) / 1000);
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return new Date(dateString).toLocaleDateString(); 
  };


  return (
    <div className="bookmarks-page">
      <h2>My Bookmarks</h2>

      {loading ? (
        <div className="loading">Loading bookmarks...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : bookmarkedPosts.length === 0 ? (
        <p className="no-bookmarks">You haven't bookmarked any posts yet.</p>
      ) : (
        <div className="bookmarked-posts-list">
          {bookmarkedPosts.map((post) => (
            <PostCard
              key={post.id}
              id={post.id}
              title={post.title}
              content={post.content || ''}
              image={post.image_url}
              authorId={post.user_id}
              time={formatTimeAgo(post.created_at)}
              upvotesNum={post.upvotes || 0}
              commentCount={post.comments?.[0]?.count ?? 0}
              userId={userId} 
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Bookmarks;

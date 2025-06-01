import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router'; 
import supabase from '../../Services/supabaseClient';
import PostCard from '../../Components/PostCard';
import Filter from '../../Components/Filter';
import AvailableGroups from '../../Components/AvailableGroups';
import PublicFlashcardSets from '../../Components/PublicFlashcardSets';
import './Home.css';

const Home = () => {
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [currentFilter, setCurrentFilter] = useState('recent');
  const [userId, setUserId] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const getInitialUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        setUserId(session?.user?.id ?? null);
        if (!session?.user && currentFilter === 'bookmarked') {
            setCurrentFilter('recent');
        }
    };
    getInitialUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const currentUser = session?.user;
        setUserId(currentUser?.id ?? null);
        if (!currentUser && currentFilter === 'bookmarked') {
           setCurrentFilter('recent');
        }
      }
    );

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [currentFilter]); 

  const fetchPosts = useCallback(async (filter) => {
    setLoadingPosts(true);
    setFetchError(null);
    // console.log(`Fetching posts with filter: ${filter}`);

    try {
      let query;

      if (filter === 'bookmarked') {
        if (!userId) {
          setPosts([]);
          setFetchError("Please log in to view your bookmarked posts.");
          setLoadingPosts(false);
          return;
        }

        const { data: bookmarks, error: bookmarkError } = await supabase
          .from('bookmarked_posts')
          .select('post_id')
          .eq('user_id', userId);

        if (bookmarkError) throw bookmarkError;

        if (!bookmarks || bookmarks.length === 0) {
          setPosts([]);
        } else {
          const postIds = bookmarks.map(b => b.post_id);
          query = supabase
            .from('posts')
            .select('*, comments(count)')
            .in('id', postIds)
            .order('created_at', { ascending: false });
        }
      } else {
        query = supabase
          .from('posts')
          .select('*, comments(count)')
          .is('source_group_id', null); 

        switch(filter) {
          case 'recent':
            query = query.order('created_at', { ascending: false });
            break;
          case 'popular':
            query = query.order('upvotes', { ascending: false })
                         .order('created_at', { ascending: false });
            break;
          case 'oldest':
            query = query.order('created_at', { ascending: true });
            break;
          default:
            query = query.order('created_at', { ascending: false });
        }
      }

      if (query) {
          const { data, error } = await query;
          if (error) throw error;
          setPosts(data || []);
      } else if (filter === 'bookmarked' && userId && posts.length === 0) { 
          setPosts([]);
      }


    } catch (err) {
      console.error('Error fetching posts:', err);
      setPosts([]);
      setFetchError(err.message || "Failed to load posts. Please try again.");
    } finally {
      setLoadingPosts(false);
    }
  }, [userId, posts.length]); 

  useEffect(() => {
    fetchPosts(currentFilter);
  }, [currentFilter, fetchPosts]);

  const handleFilterChange = (filterId) => {
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

  return (
    <div className="home-page">
        <div className="feed-header">
             <Filter
                 filters={[
                     { id: 'popular', label: 'Popular' },
                     { id: 'recent', label: 'Recent' },
                     { id: 'oldest', label: 'Oldest' },
                     { id: 'bookmarked', label: 'Bookmarked' }
                 ]}
                 activeFilter={currentFilter}
                 onFilterChange={handleFilterChange}
             />
        </div>

        <div className="home-content-grid">
             <div className="feed-column">
                 {loadingPosts ? (
                    <div className="loading">Loading posts...</div>
                 ) : fetchError ? (
                    <p className="error-message">{fetchError}</p>
                 ) : posts.length === 0 ? (
                   <p className="no-posts">
                     {currentFilter === 'bookmarked' && !userId
                       ? "Please log in to view your bookmarked posts."
                       : currentFilter === 'bookmarked'
                       ? "You haven't bookmarked any posts yet."
                       : "No posts found for this filter."}
                   </p>
                 ) : (
                   posts.map((post) => (
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
                   ))
                 )}
             </div>

             <div className="sidebar-column">
                  <AvailableGroups title="Popular Groups" showCreateButton={true} showViewAllButton={true} />
                  <PublicFlashcardSets title="Public Flashcard Sets" showViewAllButton={true} />
             </div>
        </div>
    </div>
  );
};

export default Home;
import React, { useEffect, useState, useCallback } from 'react'; 
import { useNavigate } from 'react-router';
import supabase from '../../Services/supabaseClient';
import PostCard from '../../Components/PostCard';
import Filter from '../../Components/Filter';
import AvailableGroups from '../../Components/AvailableGroups';
import './Home.css';

const Home = () => {
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [currentFilter, setCurrentFilter] = useState('recent'); 
  const [userId, setUserId] = useState(null);
  const [fetchError, setFetchError] = useState(null); 
  const navigate = useNavigate();

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserId(session?.user?.id || null);

      // Fetch user again to be sure, especially on initial load
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };

    getCurrentUser(); // Call on initial mount

    // Listen for auth state changes (login/logout)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUserId(session?.user?.id || null);
        // Optionally refetch posts if filter is 'bookmarked' when user logs in/out
        // setCurrentFilter('recent'); // Or reset filter on auth change
      }
    );

    // Cleanup listener on component unmount
    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []); // Run only once on mount

  // Fetch posts logic wrapped in useCallback to stabilize the function reference
  const fetchPosts = useCallback(async (filter) => {
    setLoadingPosts(true);
    setFetchError(null); // Clear previous errors
    console.log(`Fetching posts with filter: ${filter}, User ID: ${userId}`); // Debug log

    try {
      // Base query - fetch comment count using relationship
      // Ensure 'comments' relationship is defined in Supabase
      let query = supabase
        .from('posts')
        .select('*, comments(count)'); // Fetch all post columns and count of related comments

      switch(filter) {
        case 'recent':
          query = query.order('created_at', { ascending: false });
          break;
        case 'popular':
          query = query.order('upvotes', { ascending: false })
                       .order('created_at', { ascending: false }); // Secondary sort
          break;
        case 'oldest':
          query = query.order('created_at', { ascending: true });
          break;
        case 'bookmarked':
          if (!userId) {
            console.log("User must be logged in to see bookmarks.");
            setPosts([]); // Clear posts
            setFetchError("Please log in to view your bookmarked posts."); // Set error message
            setLoadingPosts(false); // Stop loading
            return; // Exit function early
          }
          // 1. Get bookmarked post IDs for the current user
          const { data: bookmarks, error: bookmarkError } = await supabase
            .from('bookmarked_posts')
            .select('post_id')
            .eq('user_id', userId);

          if (bookmarkError) {
            console.error('Error fetching bookmarks:', bookmarkError);
            throw new Error("Could not fetch your bookmarks.");
          }

          if (!bookmarks || bookmarks.length === 0) {
            setPosts([]); // No bookmarks found
          } else {
            // 2. Fetch posts whose IDs are in the bookmarked list
            const postIds = bookmarks.map(b => b.post_id);
            // Re-initialize query for bookmarks, including comment count
            query = supabase
              .from('posts')
              .select('*, comments(count)')
              .in('id', postIds)
              .order('created_at', { ascending: false }); // Order bookmarks by date
          }
          break;
        // Add 'trending' case here if needed later
        default:
          // Default to 'recent' if filter is unknown
          query = query.order('created_at', { ascending: false });
      }

      // Only execute the query if it wasn't handled entirely within the switch (like bookmark error)
      if (filter !== 'bookmarked' || userId) { // Avoid re-querying if bookmark check failed/returned early
          const { data, error } = await query;

          if (error) {
            console.error('Error fetching posts:', error);
            throw error; // Throw error to be caught by the catch block
          }

          console.log("Fetched posts data:", data); // Debug log
          setPosts(data || []);
      }

    } catch (err) {
      console.error('Unexpected error fetching posts:', err);
      setPosts([]); // Clear posts on error
      // Set a generic error message or use err.message
      setFetchError(err.message || "Failed to load posts. Please try again.");
    } finally {
      setLoadingPosts(false); // Ensure loading is set to false
    }
  }, [userId]); // Include userId as a dependency for useCallback

  // Effect to fetch posts when the filter or userId changes
  useEffect(() => {
    fetchPosts(currentFilter);
  }, [currentFilter, fetchPosts]); // fetchPosts is now stable due to useCallback

  // Handler for changing the filter
  const handleFilterChange = (filterId) => {
    setCurrentFilter(filterId);
  };

  // Handler for clicking on a post
  const handlePostClick = (postId) => {
    navigate(`/post/${postId}`);
  };

  // Utility function to format time (remains the same)
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
             {/* Update Filter component props to include 'Bookmarked' */}
             <Filter
                 filters={[
                     { id: 'popular', label: 'Popular' },
                     { id: 'recent', label: 'Recent' },
                     { id: 'oldest', label: 'Oldest' },
                     // Add Bookmarked option - only show if user is logged in?
                     // Or handle the logged-out state within fetchPosts as done above
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
                 ) : fetchError ? ( // Display fetch error message
                    <p className="error-message">{fetchError}</p> // Use a suitable class for styling errors
                 ) : posts.length === 0 ? (
                   <p className="no-posts">
                     {currentFilter === 'bookmarked'
                       ? "You haven't bookmarked any posts yet."
                       : "No posts found for this filter."}
                   </p>
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
                         // Pass the comment count fetched from the 'comments' relationship
                         // Ensure the relationship is named 'comments' in Supabase or adjust here
                         commentCount={post.comments?.[0]?.count ?? 0} // Access count safely
                         userId={userId} // Pass current user ID for upvote logic in PostCard
                       />
                     </div>
                   ))
                 )}
             </div>

             <div className="sidebar-column">
                  <AvailableGroups title="Popular Study Groups" showCreateButton={true} showViewAllButton={true} />
             </div>
        </div>
    </div>
  );
};

export default Home;

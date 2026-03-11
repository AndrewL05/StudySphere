import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router';
import supabase from '../../Services/supabaseClient';
import PostCard from '../../Components/PostCard';
import Filter from '../../Components/Filter';
import './Home.css';

const Home = () => {
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [currentFilter, setCurrentFilter] = useState('recent');
  const [userId, setUserId] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const [recentGroups, setRecentGroups] = useState([]);
  const [publicSets, setPublicSets] = useState([]);
  const [loadingSidebar, setLoadingSidebar] = useState(true);
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

  // Fetch sidebar data
  useEffect(() => {
    const fetchSidebarData = async () => {
      setLoadingSidebar(true);
      try {
        const [groupsRes, setsRes] = await Promise.all([
          supabase
            .from('study_groups')
            .select('id, name')
            .order('created_at', { ascending: false })
            .limit(5),
          supabase
            .from('flashcard_sets')
            .select('*, flashcards(count)')
            .eq('is_public', true)
            .order('created_at', { ascending: false })
            .limit(4)
        ]);

        if (groupsRes.data) setRecentGroups(groupsRes.data);
        if (setsRes.data) setPublicSets(setsRes.data);
      } catch (err) {
        console.error('Error fetching sidebar data:', err);
      } finally {
        setLoadingSidebar(false);
      }
    };
    fetchSidebarData();
  }, []);

  const fetchPosts = useCallback(async (filter) => {
    setLoadingPosts(true);
    setFetchError(null);

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
      {/* Hero Section */}
      <div className="home-hero">
        <div className="home-hero-content">
          <p className="home-hero-greeting">Welcome to StudySphere</p>
          <h1 className="home-hero-title">Your study hub</h1>
          <p className="home-hero-subtitle">
            Share knowledge, join study groups, master flashcards, and test yourself with AI-powered quizzes.
          </p>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="home-quick-actions">
        <Link to="/groups" className="quick-action-card">
          <div className="quick-action-icon accent">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <div className="quick-action-text">
            <span className="quick-action-label">Study Groups</span>
            <span className="quick-action-desc">Join or create groups</span>
          </div>
        </Link>

        <Link to="/flashcards" className="quick-action-card">
          <div className="quick-action-icon purple">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
          </div>
          <div className="quick-action-text">
            <span className="quick-action-label">Flashcards</span>
            <span className="quick-action-desc">Create and study sets</span>
          </div>
        </Link>

        <Link to="/create" className="quick-action-card">
          <div className="quick-action-icon warning">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
          </div>
          <div className="quick-action-text">
            <span className="quick-action-label">Write a Post</span>
            <span className="quick-action-desc">Share your knowledge</span>
          </div>
        </Link>
      </div>

      {/* Main Content: Feed + Sidebar */}
      <div className="home-content">
        {/* Feed Column */}
        <div className="feed-container">
          <div className="feed-header">
            <h2 className="feed-section-title">Posts</h2>
            <Filter
              filters={[
                { id: 'recent', label: 'Recent' },
                { id: 'popular', label: 'Popular' },
                { id: 'bookmarked', label: 'Bookmarked' }
              ]}
              activeFilter={currentFilter}
              onFilterChange={handleFilterChange}
            />
          </div>

          <div className="feed-list">
            {loadingPosts ? (
              <div className="feed-loading">
                <div className="loading-spinner"></div>
                <p>Loading posts...</p>
              </div>
            ) : fetchError ? (
              <div className="feed-empty">
                <p>{fetchError}</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="feed-empty">
                <p>
                  {currentFilter === 'bookmarked' && !userId
                    ? 'Please sign in to view bookmarks.'
                    : currentFilter === 'bookmarked'
                    ? "You haven't bookmarked any posts yet."
                    : 'No posts yet. Be the first to share!'}
                </p>
              </div>
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
        </div>

        {/* Sidebar */}
        <aside className="home-sidebar">
          {/* Flashcard Sets */}
          <div className="sidebar-section">
            <div className="sidebar-section-header">
              <h3 className="sidebar-section-title">Flashcard Sets</h3>
              <Link to="/flashcards" className="sidebar-section-link">View all</Link>
            </div>
            {loadingSidebar ? (
              <div className="sidebar-empty">Loading...</div>
            ) : publicSets.length === 0 ? (
              <div className="sidebar-empty">No public sets yet</div>
            ) : (
              <div className="sidebar-fc-list">
                {publicSets.map((set) => (
                  <Link to={`/flashcards/${set.id}`} key={set.id} className="sidebar-fc-item">
                    <div className="sidebar-fc-info">
                      <div className="sidebar-fc-name">{set.title}</div>
                      <div className="sidebar-fc-count">{set.flashcards?.[0]?.count || 0} cards</div>
                    </div>
                    <Link to={`/flashcards/${set.id}/study`} className="sidebar-fc-study" onClick={(e) => e.stopPropagation()}>
                      Study
                    </Link>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Groups */}
          <div className="sidebar-section">
            <div className="sidebar-section-header">
              <h3 className="sidebar-section-title">Study Groups</h3>
              <Link to="/groups" className="sidebar-section-link">View all</Link>
            </div>
            {loadingSidebar ? (
              <div className="sidebar-empty">Loading...</div>
            ) : recentGroups.length === 0 ? (
              <div className="sidebar-empty">No groups yet</div>
            ) : (
              <div className="sidebar-group-list">
                {recentGroups.map((group) => (
                  <Link to={`/group/${group.id}`} key={group.id} className="sidebar-group-item">
                    <span className="sidebar-group-name">{group.name}</span>
                    <svg className="sidebar-group-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Create CTA */}
          <div className="sidebar-section">
            <div className="sidebar-cta">
              <Link to="/create" className="sidebar-cta-btn primary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                New Post
              </Link>
              <Link to="/create-group" className="sidebar-cta-btn secondary">
                Create Group
              </Link>
              <Link to="/flashcards/create" className="sidebar-cta-btn secondary">
                New Flashcard Set
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Home;

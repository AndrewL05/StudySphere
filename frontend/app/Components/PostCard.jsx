import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import supabase from '../Services/supabaseClient';
import UserName from './Username';
import { sharePost } from '../Services/shareService';
import '../Pages/posts/Posts.css';

const BookmarkIcon = ({ filled }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
       fill={filled ? "currentColor" : "none"}
       stroke="currentColor"
       strokeWidth="2"
       strokeLinecap="round"
       strokeLinejoin="round"
       className="bookmark-svg-icon"
  >
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
  </svg>
);

const MAX_CONTENT_LENGTH = 250;

const PostCard = ({
  id,
  title,
  content,
  image = null,
  upvotesNum = 0,
  commentCount = 0,
  userId,
  authorId = null,
  time = "just now"
}) => {
  const [upvoted, setUpvoted] = useState(false);
  const [currentUpvotes, setCurrentUpvotes] = useState(upvotesNum);
  const [loadingVote, setLoadingVote] = useState(false);
  const [loadingInitialState, setLoadingInitialState] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loadingBookmark, setLoadingBookmark] = useState(false);

  useEffect(() => {
    setCurrentUpvotes(upvotesNum);
  }, [upvotesNum]);

  useEffect(() => {
    let isMounted = true;
    setLoadingInitialState(true);
    if(isMounted) {
        setUpvoted(false);
        setIsBookmarked(false);
    }

    const fetchInitialPostState = async () => {
      if (!id) {
        if (isMounted) {
          setCurrentUpvotes(upvotesNum); 
          setLoadingInitialState(false);
        }
        return;
      }

      try {
        const { data: postData, error: postError } = await supabase
          .from('posts')
          .select('upvotes')
          .eq('id', id)
          .single(); 

        if (!isMounted) return;

        if (postError) {
          if (postError.code === 'PGRST116') { 
            console.warn(`PostCard (id: ${id}): Post not found. It might have been deleted.`);
            setCurrentUpvotes(upvotesNum); 
          } else {
            console.error(`PostCard (id: ${id}): Error fetching post details for upvote count:`, postError);
          }
        } else if (postData) {
          setCurrentUpvotes(postData.upvotes);
        }

        if (userId) {
          const [voteResult, bookmarkResult] = await Promise.all([
            supabase
              .from('post_votes')
              .select('id', { count: 'exact', head: true }) 
              .eq('post_id', id)
              .eq('user_id', userId),
            supabase
              .from('bookmarked_posts')
              .select('post_id', { count: 'exact', head: true }) 
              .eq('post_id', id)
              .eq('user_id', userId)
          ]);

          if (!isMounted) return;

          if (voteResult.error) {
            console.error(`PostCard (id: ${id}): Error checking vote status:`, voteResult.error);
            // setUpvoted(false); 
          } else {
            setUpvoted(voteResult.count > 0);
          }

          if (bookmarkResult.error) {
            console.error(`PostCard (id: ${id}): Error checking bookmark status:`, bookmarkResult.error);
            // setIsBookmarked(false); 
          } else {
            setIsBookmarked(bookmarkResult.count > 0);
          }
        } else {
          
        }

      } catch (err) {
        if (isMounted) {
          console.error(`PostCard (id: ${id}): Exception checking initial post state:`, err);
          setCurrentUpvotes(upvotesNum); 
          // setUpvoted(false); 
          // setIsBookmarked(false); 
        }
      } finally {
        if (isMounted) {
          setLoadingInitialState(false);
        }
      }
    };

    fetchInitialPostState();
    return () => { isMounted = false; };
  }, [id, userId, upvotesNum]); 

  const handleUpvote = async (e) => {
    e.stopPropagation();
    if (!userId) { alert('Please sign in to upvote posts'); navigate('/signin'); return; }
    if (loadingVote || !id) return;
    setLoadingVote(true);
    try {
      const { data, error } = await supabase.rpc('toggle_post_vote_and_update_count', {
        post_id_to_vote_on: id, voter_user_id: userId
      });
      if (error) throw error;
      if (data && data.length > 0) {
        const result = data[0];
        setCurrentUpvotes(result.new_vote_count);
        setUpvoted(result.user_has_voted);
      } else {
        console.warn('RPC toggle_post_vote_and_update_count did not return expected data.');
        const { data: postDataFallback } = await supabase.from('posts').select('upvotes').eq('id', id).single();
        if (postDataFallback) setCurrentUpvotes(postDataFallback.upvotes);
        const { data: voteDataFallback } = await supabase.from('post_votes').select('id').eq('post_id', id).eq('user_id', userId).maybeSingle();
        setUpvoted(!!voteDataFallback);
      }
    } catch (error) { console.error('Error during upvote process:', error); alert(`Failed to update vote: ${error.message || 'Please try again.'}`); }
    finally { setLoadingVote(false); }
  };

  const handleBookmarkToggle = async (e) => {
    e.stopPropagation();
    if (!userId) { alert('Please sign in to bookmark posts'); navigate('/signin'); return; }
    if (loadingBookmark || !id) return;
    setLoadingBookmark(true);
    const currentlyBookmarked = isBookmarked;
    try {
      if (currentlyBookmarked) {
        const { error } = await supabase.from('bookmarked_posts').delete().eq('user_id', userId).eq('post_id', id);
        if (error) throw error;
        setIsBookmarked(false);
      } else {
        const { error } = await supabase.from('bookmarked_posts').insert({ user_id: userId, post_id: id });
        if (error) throw error;
        setIsBookmarked(true);
      }
    } catch (error) { console.error('Error toggling bookmark:', error); alert(`Failed to update bookmark: ${error.message || 'Please try again.'}`);}
    finally { setLoadingBookmark(false); }
  };

  const handleCommentClick = (e) => {
      e.stopPropagation();
      navigate(`/post/${id}`);
  };

  const needsTruncation = content && content.length > MAX_CONTENT_LENGTH;
  const displayedContent = needsTruncation && !isExpanded
    ? `${content.substring(0, MAX_CONTENT_LENGTH)}...`
    : content;

  const toggleReadMore = (e) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleCardClick = () => {
      navigate(`/post/${id}`);
  };

  const handleShare = async (e) => {
    e.stopPropagation();
    await sharePost({
      id,
      title,
      content,
      type: 'post'
    });
  };

  return (
    <article className="post-card" onClick={handleCardClick}>
      <div className="post-card-meta">
        <span className="post-card-author">
          <UserName userId={authorId} />
        </span>
        <span className="post-card-time">{time}</span>
      </div>
      <h3 className="post-card-title">{title}</h3>
      {displayedContent && (
        <p className="post-card-preview">{displayedContent}</p>
      )}
      {needsTruncation && (
        <button onClick={toggleReadMore} className="post-card-readmore">
          {isExpanded ? 'Show less' : 'Read more'}
        </button>
      )}
      {image && (
        <div className="post-card-image">
          <img src={image} alt={title || 'Post image'} />
        </div>
      )}
      <div className="post-card-actions">
        <button
          className={`post-action-btn ${upvoted ? 'active' : ''}`}
          onClick={handleUpvote}
          disabled={loadingInitialState || loadingVote || !userId}
          title={upvoted ? 'Remove upvote' : 'Upvote'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={upvoted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5M5 12l7-7 7 7"/>
          </svg>
          <span>{loadingInitialState ? '...' : currentUpvotes}</span>
        </button>
        <button className="post-action-btn" onClick={handleCommentClick} title="Comments">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span>{commentCount}</span>
        </button>
        <button className="post-action-btn" onClick={handleShare} title="Share">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
          </svg>
        </button>
        {userId && (
          <button
            className={`post-action-btn ${isBookmarked ? 'active' : ''}`}
            onClick={handleBookmarkToggle}
            disabled={loadingInitialState || loadingBookmark}
            title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
          >
            <BookmarkIcon filled={isBookmarked} />
          </button>
        )}
      </div>
    </article>
  );
};

export default PostCard;

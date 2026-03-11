import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router'; 
import supabase from '../../Services/supabaseClient';
import UserName from '../../Components/Username';
import './Posts.css';

const ShareIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3"></circle>
    <circle cx="6" cy="12" r="3"></circle>
    <circle cx="18" cy="19" r="3"></circle>
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
  </svg>
);

const BookmarkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path>
  </svg>
);

const BookmarkFilledIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path>
  </svg>
);

const Post = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [upvoted, setUpvoted] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [voteLoading, setVoteLoading] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchPost = async () => {
      if (!isMounted) return;
      setLoading(true);
      setError(null);

      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (!isMounted) return;
        if (userError) console.warn("Error fetching user session:", userError);
        setCurrentUser(user);

        const { data: postData, error: postError } = await supabase
          .from('posts')
          .select('*')
          .eq('id', id)
          .single(); 

        if (!isMounted) return;
        if (postError) {
          if (postError.code === 'PGRST116') { 
            setError('Post not found.');
          } else {
            console.error('Error fetching post:', postError);
            setError('Failed to load post.');
          }
          setPost(null);
          setLoading(false);
          return;
        }
        setPost(postData);

        const { data: commentsData, error: commentsError } = await supabase
          .from('comments')
          .select('*')
          .eq('post_id', id)
          .order('created_at', { ascending: false });

        if (!isMounted) return;
        if (commentsError) {
            console.error("Error fetching comments:", commentsError);
            setComments([]);
        } else {
            setComments(commentsData || []);
        }

        if (user && postData) {
          // Check vote status
          const { data: voteData, error: voteError } = await supabase
            .from('post_votes')
            .select('id')
            .eq('post_id', postData.id)
            .eq('user_id', user.id)
            .maybeSingle();

          if (!isMounted) return;
          if (voteError) console.error("Error checking initial vote status:", voteError);
          setUpvoted(!!voteData);

          // Check bookmark status
          const { data: bookmarkData, error: bookmarkError } = await supabase
            .from('bookmarked_posts')
            .select('user_id')
            .eq('post_id', postData.id)
            .eq('user_id', user.id)
            .maybeSingle();

          if (!isMounted) return;
          if (bookmarkError) console.error("Error checking bookmark status:", bookmarkError);
          setBookmarked(!!bookmarkData);
        } else {
          if (isMounted) {
            setUpvoted(false);
            setBookmarked(false);
          }
        }

      } catch (err) { 
        if (!isMounted) return;
        console.error('Unexpected error in fetchPost:', err);
        if (!error) setError('An unexpected error occurred.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (id) {
      fetchPost();
    } else {
      setError("No post ID provided.");
      setPost(null);
      setLoading(false);
    }
    return () => { isMounted = false; };
  }, [id]); 

  const handleUpvote = async () => {
    if (!currentUser) {
      alert('Please sign in to upvote posts');
      navigate('/signin');
      return;
    }
    if (!post || voteLoading) return;

    setVoteLoading(true);
    setError(null);

    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('toggle_post_vote_and_update_count', {
        post_id_to_vote_on: post.id,
        voter_user_id: currentUser.id
      });

      if (rpcError) throw rpcError;

      if (rpcData && rpcData.length > 0) {
        const result = rpcData[0];
        setPost(prevPost => ({ ...prevPost, upvotes: result.new_vote_count }));
        setUpvoted(result.user_has_voted);
      } else {
        console.warn('RPC toggle_post_vote_and_update_count did not return expected data.');
      }
    } catch (err) {
      console.error('Error updating upvote:', err);
      alert(`Failed to update vote: ${err.message || 'Please try again.'}`);
    } finally {
      setVoteLoading(false);
    }
  };

  const handleBookmark = async () => {
    if (!currentUser) {
      alert('Please sign in to bookmark posts');
      navigate('/signin');
      return;
    }
    if (!post || bookmarkLoading) return;

    setBookmarkLoading(true);
    setError(null);

    try {
      if (bookmarked) {
        // Remove bookmark
        const { error } = await supabase
          .from('bookmarked_posts')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', currentUser.id);

        if (error) throw error;
        setBookmarked(false);
      } else {
        // Add bookmark
        const { error } = await supabase
          .from('bookmarked_posts')
          .insert([{
            post_id: post.id,
            user_id: currentUser.id
          }]);

        if (error) throw error;
        setBookmarked(true);
      }
    } catch (err) {
      console.error('Error updating bookmark:', err);
      alert(`Failed to ${bookmarked ? 'remove' : 'add'} bookmark: ${err.message || 'Please try again.'}`);
    } finally {
      setBookmarkLoading(false);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: post.title,
      text: `Check out this post: ${post.title}`,
      url: window.location.href,
    };

    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      }
    } catch (err) {
      console.error('Error sharing:', err);
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      } catch (clipboardErr) {
        console.error('Error copying to clipboard:', clipboardErr);
        alert('Unable to share. Please copy the URL manually.');
      }
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();

    if (!currentUser) {
      alert('Please sign in to comment');
      return;
    }

    if (!newComment.trim()) return;
    setCommentLoading(true);

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert([{ post_id: id, user_id: currentUser.id, content: newComment.trim() }])
        .select()
        .single();

      if (error) throw error;

      setComments(prevComments => [data, ...prevComments]);
      setNewComment('');
    } catch (err) {
      console.error('Error adding comment:', err);
      alert('Failed to add comment. Please try again.');
    } finally {
      setCommentLoading(false);
    }
  };

  const handleDeletePost = async () => {
    if (!currentUser || !post || (post.user_id !== currentUser.id)) {
      return;
    }
    if (window.confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      try {
        await supabase.from('comments').delete().eq('post_id', id);
        await supabase.from('post_votes').delete().eq('post_id', id);
        await supabase.from('bookmarked_posts').delete().eq('post_id', id);
        const { error } = await supabase.from('posts').delete().eq('id', id);
        if (error) throw error;
        alert('Post deleted successfully');
        navigate('/');
      } catch (err) {
        console.error('Error deleting post:', err);
        alert('Failed to delete post. Please try again.');
      }
    }
  };

  const handleEditPost = () => {
    if (!currentUser || !post || (post.user_id !== currentUser.id)) {
        alert("You can only edit your own posts.");
        return;
    }
    navigate(`/edit/${id}`);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) return <div className="post-page"><div className="post-page-container"><div className="feed-loading"><div className="loading-spinner"></div><p>Loading post...</p></div></div></div>;
  if (error) return <div className="post-page"><div className="post-page-container"><div className="feed-empty"><p>{error}</p></div></div></div>;
  if (!post) return <div className="post-page"><div className="post-page-container"><div className="feed-empty"><p>Post not found.</p></div></div></div>;

  return (
    <div className="post-page">
      <div className="post-page-container">
        <article className="post-detail">
          <div className="post-detail-meta">
            <span className="post-detail-author">
              <UserName userId={post.user_id} />
            </span>
            <span className="post-detail-time">{formatDate(post.created_at)}</span>
          </div>

          <h1 className="post-detail-title">{post.title}</h1>

          {post.content && (
            <div className="post-detail-content" dangerouslySetInnerHTML={{ __html: post.content.replace(/\n/g, '<br />') }} />
          )}

          {post.image_url && (
            <div className="post-detail-image">
              <img src={post.image_url} alt={post.title || 'Post image'} />
            </div>
          )}

          <div className="post-detail-actions">
            <button
              className={`post-action-btn ${upvoted ? 'active' : ''}`}
              onClick={handleUpvote}
              disabled={voteLoading || !currentUser}
              title={upvoted ? 'Remove upvote' : 'Upvote'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={upvoted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 19V5M5 12l7-7 7 7"/>
              </svg>
              <span>{post.upvotes !== undefined ? post.upvotes : 0}</span>
            </button>

            <button
              className={`post-action-btn ${bookmarked ? 'active' : ''}`}
              onClick={handleBookmark}
              disabled={bookmarkLoading || !currentUser}
              title={bookmarked ? 'Remove bookmark' : 'Bookmark'}
            >
              {bookmarked ? <BookmarkFilledIcon /> : <BookmarkIcon />}
              <span>{bookmarked ? 'Bookmarked' : 'Bookmark'}</span>
            </button>

            <button className="post-action-btn" onClick={handleShare} title="Share">
              <ShareIcon />
              <span>Share</span>
            </button>

            {currentUser && post.user_id === currentUser.id && (
              <>
                <button className="post-action-btn" onClick={handleEditPost} title="Edit">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  <span>Edit</span>
                </button>
                <button className="post-action-btn danger" onClick={handleDeletePost} title="Delete">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                  <span>Delete</span>
                </button>
              </>
            )}
          </div>
        </article>

        <section className="comments-section">
          <h3 className="comments-title">Comments ({comments.length})</h3>

          {currentUser ? (
            <form className="comment-form" onSubmit={handleAddComment}>
              <textarea
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                disabled={commentLoading}
                rows="3"
              />
              <button type="submit" className="comment-submit-btn" disabled={!newComment.trim() || commentLoading}>
                {commentLoading ? 'Posting...' : 'Post Comment'}
              </button>
            </form>
          ) : (
            <p className="comment-signin">
              <Link to="/signin">Sign in</Link> to leave a comment.
            </p>
          )}

          <div className="comments-list">
            {comments.length === 0 ? (
              <p className="comments-empty">No comments yet. Be the first to share your thoughts!</p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="comment-item">
                  <div className="comment-item-meta">
                    <span className="comment-item-author"><UserName userId={comment.user_id} /></span>
                    <span className="comment-item-time">{formatDate(comment.created_at)}</span>
                  </div>
                  <div className="comment-item-content" dangerouslySetInnerHTML={{ __html: comment.content.replace(/\n/g, '<br />') }} />
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Post;
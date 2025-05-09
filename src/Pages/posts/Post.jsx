import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import supabase from '../../Services/supabaseClient';
import UserName from '../../Components/Username';
import './Posts.css';

const Post = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [upvoted, setUpvoted] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user);

        const { data: postData, error: postError } = await supabase
          .from('posts')
          .select('*')
          .eq('id', id)
          .single();

        if (postError) throw postError;
        setPost(postData);

        if (user) {
          const { data: voteData } = await supabase
            .from('post_votes')
            .select('*')
            .eq('post_id', id)
            .eq('user_id', user.id)
            .single();
          
          setUpvoted(!!voteData);
        }

        const { data: commentsData, error: commentsError } = await supabase
          .from('comments')
          .select('*')
          .eq('post_id', id)
          .order('created_at', { ascending: false });

        if (commentsError) throw commentsError;
        setComments(commentsData || []);

      } catch (err) {
        console.error('Error fetching post data:', err);
        setError('Failed to load post. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [id]);

  const handleUpvote = async () => {
    if (!currentUser) {
      alert('Please sign in to upvote posts');
      return;
    }

    try {
      const { data: existingVote } = await supabase
        .from('post_votes')
        .select('*')
        .eq('post_id', id)
        .eq('user_id', currentUser.id)
        .single();

      if (existingVote) {
        await supabase
          .from('post_votes')
          .delete()
          .eq('post_id', id)
          .eq('user_id', currentUser.id);

        await supabase
          .from('posts')
          .update({ upvotes: post.upvotes - 1 })
          .eq('id', id);

        setPost({ ...post, upvotes: post.upvotes - 1 });
        setUpvoted(false);
      } else {
        await supabase
          .from('post_votes')
          .insert([{ post_id: id, user_id: currentUser.id, vote_type: 'upvote' }]);

        await supabase
          .from('posts')
          .update({ upvotes: post.upvotes + 1 })
          .eq('id', id);

        setPost({ ...post, upvotes: post.upvotes + 1 });
        setUpvoted(true);
      }
    } catch (err) {
      console.error('Error updating upvote:', err);
      alert('Failed to update vote. Please try again.');
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
        .insert([
          {
            post_id: id,
            user_id: currentUser.id,
            content: newComment.trim()
          }
        ])
        .select();

      if (error) throw error;

      setComments([data[0], ...comments]);
      setNewComment('');
    } catch (err) {
      console.error('Error adding comment:', err);
      alert('Failed to add comment. Please try again.');
    } finally {
      setCommentLoading(false);
    }
  };

  const handleDeletePost = async () => {
    if (!currentUser || (post.user_id !== currentUser.id)) {
      alert('You can only delete your own posts');
      return;
    }

    if (window.confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      try {
        await supabase
          .from('comments')
          .delete()
          .eq('post_id', id);

        await supabase
          .from('post_votes')
          .delete()
          .eq('post_id', id);

        const { error } = await supabase
          .from('posts')
          .delete()
          .eq('id', id);

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
    navigate(`/edit/${id}`);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (loading) return <div className="post-page loading">Loading post...</div>;
  if (error) return <div className="post-page error">{error}</div>;
  if (!post) return <div className="post-page not-found">Post not found</div>;

  return (
    <div className="post-page">
      <div className="post-container">
        <div className="post-header">
          <div className="post-metadata">
            <span className="post-author">
              <UserName userId={post.user_id} />
            </span>
            <span className="post-time">• Posted on {formatDate(post.created_at)}</span>
          </div>

          {currentUser && post.user_id === currentUser.id && (
            <div className="post-actions-owner">
              <button onClick={handleEditPost} className="edit-btn">Edit</button>
              <button onClick={handleDeletePost} className="delete-btn">Delete</button>
            </div>
          )}
        </div>

        <h1 className="post-title">{post.title}</h1>

        {post.content && <div className="post-content">{post.content}</div>}

        {post.image_url && (
          <div className="post-image">
            <img src={post.image_url} alt={post.title} />
          </div>
        )}

        <div className="post-interactions">
          <button 
            className={`upvote-btn ${upvoted ? 'upvoted' : ''}`}
            onClick={handleUpvote}
          >
            ↑ {post.upvotes || 0} upvotes
          </button>
        </div>

        <div className="comments-section">
          <h3>Comments ({comments.length})</h3>
          
          <form className="comment-form" onSubmit={handleAddComment}>
            <textarea
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              disabled={!currentUser || commentLoading}
            />
            <button 
              type="submit" 
              className="submit-comment-btn"
              disabled={!currentUser || !newComment.trim() || commentLoading}
            >
              {commentLoading ? 'Posting...' : 'Post Comment'}
            </button>
          </form>

          <div className="comments-list">
            {comments.length === 0 ? (
              <p className="no-comments">No comments yet. Be the first to comment!</p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="comment">
                  <div className="comment-header">
                    <span className="comment-author">
                      <UserName userId={comment.user_id} />
                    </span>
                    <span className="comment-time">• {formatDate(comment.created_at)}</span>
                  </div>
                  <div className="comment-content">{comment.content}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Post;
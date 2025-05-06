import React, { useState, useEffect } from 'react';
import supabase from '../Services/supabaseClient';
import UserName from './Username';
import { useNavigate } from 'react-router';
import '../App.css' 


const PostCard = ({
  id,   
  title,
  content,
  image = null,
  upvotesNum = 0,
  commentCount = 0, 
  userId = null,
  authorId = null,
  time = "just now"
}) => {
  const [upvoted, setUpvoted] = useState(false);
  const [upvotes, setUpvotes] = useState(upvotesNum);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setUpvotes(upvotesNum);
  }, [upvotesNum]);

  useEffect(() => {
    setUpvoted(false);

    const checkUpvoteStatus = async () => {
      if (!userId || !id) return;

      try {
        const { data, error } = await supabase
          .from('post_votes')
          .select('*')
          .eq('post_id', id)
          .eq('user_id', userId)
          .maybeSingle(); 

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking upvote status:', error);
        }

        setUpvoted(!!data); 
      } catch (err) {
        console.error('Exception checking upvote status:', err);
      }
    };

    checkUpvoteStatus();
  }, [id, userId]);

  const handleUpvote = async (e) => {
    e.stopPropagation(); 

    if (!userId) {
      navigate('/signin');
      return;
    }

    if (loading) return; 
    setLoading(true);

    try {
      const { data: existingVote, error: checkError } = await supabase
        .from('post_votes')
        .select('id') 
        .eq('post_id', id)
        .eq('user_id', userId)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError; 
      }

      const isCurrentlyUpvoted = !!existingVote;
      const newUpvoteState = !isCurrentlyUpvoted;
      const newUpvotesCount = isCurrentlyUpvoted ? upvotes - 1 : upvotes + 1;

      if (newUpvoteState) {
        const { error: insertError } = await supabase
          .from('post_votes')
          .insert([{ post_id: id, user_id: userId, vote_type: 'upvote' }]);
        if (insertError) throw insertError;
      } else {
        const { error: deleteError } = await supabase
          .from('post_votes')
          .delete()
          .eq('post_id', id)
          .eq('user_id', userId);
        if (deleteError) console.warn('Error deleting vote:', deleteError);
      }

      const { error: updateError } = await supabase
        .from('posts')
        .update({ upvotes: Math.max(0, newUpvotesCount) }) 
        .eq('id', id);

      if (updateError) {
          console.error("Failed to update post's upvote count:", updateError);
      } else {
         setUpvotes(Math.max(0, newUpvotesCount));
         setUpvoted(newUpvoteState);
      }

    } catch (error) {
      console.error('Error toggling upvote:', error);
      alert('Failed to update vote. Please try again.');
    } finally {
      setLoading(false); 
    }
  };

  const handleCommentClick = (e) => {
      e.stopPropagation(); 
      navigate(`/post/${id}`);
  };

  return (
    <div className="post-cards"> 
      <div className="post-header">
        <span className="post-author">
          <UserName userId={authorId} />
        </span>
        <span className="post-time">• Posted {time}</span>
      </div>

      <h3>{title}</h3>

      {content && <p className="post-content">{content}</p>}

      {image && (
        <div className="post-image">
          <img src={image} alt={title || 'Post image'} />
        </div>
      )}

      <div className="post-actions">
        <button
          className={`upvote-btn ${upvoted ? 'upvoted' : ''}`}
          onClick={handleUpvote}
          disabled={loading || !userId} 
          aria-pressed={upvoted} 
        >
          ↑ {upvotes}
        </button>
        
        <button className="comment-btn" onClick={handleCommentClick}>
          💬 {commentCount} Comments
        </button>
        {/* Share button - implement functionality later */}
        <button className="share-btn" onClick={(e) => { e.stopPropagation(); alert('Share functionality not implemented.'); }}>
          Share
        </button>
      </div>
    </div>
  );
};

export default PostCard;

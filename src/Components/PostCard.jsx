import React, { useState, useEffect } from 'react';
import supabase from '../Services/supabaseClient';
import UserName from './Username';
import '../App.css';

const PostCard = ({ id, title, content, image = null, upvotesNum = 0, userId = null, authorId = null, time = "just now" }) => {
  const [upvoted, setUpvoted] = useState(false);
  const [upvotes, setUpvotes] = useState(upvotesNum);
  const [loading, setLoading] = useState(false);

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
          .single();
        
        if (error && error.code !== 'PGRST116') {
          console.error('Error checking upvote status:', error);
        }
        
        setUpvoted(!!data);
      } catch (error) {
        console.error('Error checking upvote status:', error);
      }
    };
    
    checkUpvoteStatus();
  }, [id, userId]);

  const handleUpvote = async (e) => {
    e.stopPropagation();
    
    if (!userId) {
      alert('Please sign in to upvote posts');
      return; 
    }
    
    if (loading) return;
    setLoading(true);
    
    try {
      const { data: existingVote, error: checkError } = await supabase
        .from('post_votes')
        .select('*')
        .eq('post_id', id)
        .eq('user_id', userId)
        .single();
      
      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }
      
      const hasExistingVote = !!existingVote;
      const newUpvoteState = !hasExistingVote;
      
      if (newUpvoteState) {
        // Add upvote 
        const { error: insertError } = await supabase
          .from('post_votes')
          .insert([{ 
            post_id: id, 
            user_id: userId, 
            vote_type: 'upvote' 
          }]);
          
        if (insertError) throw insertError;
        
        // Increment the post's upvote count
        const { error: updateError } = await supabase
          .from('posts')
          .update({ upvotes: upvotes + 1 })
          .eq('id', id);
          
        if (updateError) throw updateError;
        
        setUpvotes(upvotes + 1);
      } else {
        // Remove upvote 
        const { error: deleteError } = await supabase
          .from('post_votes')
          .delete()
          .eq('post_id', id)
          .eq('user_id', userId);
          
        if (deleteError) throw deleteError;
        
        // Decrement the post's upvote count
        const { error: updateError } = await supabase
          .from('posts')
          .update({ upvotes: upvotes - 1 })
          .eq('id', id);
          
        if (updateError) throw updateError;
        
        setUpvotes(upvotes - 1);
      }
      
      setUpvoted(newUpvoteState);
    } catch (error) {
      console.error('Error toggling upvote:', error);
      alert('Failed to update vote. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="post-cards">
      <div className="post-header">
        <span className="post-author">
          <UserName userId={authorId} />
        </span>
        <span className="post-time">• Posted {time}</span>
      </div>
      
      <h4>{title}</h4>
      
      {content && <p className="post-content">{content}</p>}
      
      {image && (
        <div className="post-image">
          <img src={image} alt={title} />
        </div>
      )}
      
      <div className="post-actions">
        <button 
          className={`upvote-btn ${upvoted ? 'upvoted' : ''}`}
          onClick={handleUpvote}
          disabled={loading || !userId}
        >
          ↑ {upvotes}
        </button>
        <button className="comment-btn">
          💬 Comment
        </button>
        <button className="share-btn">
          Share
        </button>
      </div>
    </div>
  );
};

export default PostCard;
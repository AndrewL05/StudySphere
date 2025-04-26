import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import './Posts.css';
import supabase from '../../Services/supabaseClient';

const Create = () => {
  const [postData, setPostData] = useState({
    title: "",
    content: "",
    image_url: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [userId, setUserId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('Error getting user:', error);
        return;
      }
      
      if (user) {
        setUserId(user.id);
      } else {
        navigate('/signin');
      }
    };
    
    getCurrentUser();
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPostData({ ...postData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      if (!userId) {
        throw new Error('You must be logged in to create a post');
      }

      const submissionData = {
        title: postData.title,
        content: postData.content || null,
        image_url: postData.image_url || null,
        user_id: userId,      
        upvotes: 0
      };

      const { data, error: supabaseError } = await supabase
        .from('posts')
        .insert([submissionData]);

      if (supabaseError) {
        throw supabaseError;
      }

      console.log('Post created successfully:', data);
      setSuccess(true);
      setPostData({ title: "", content: "", image_url: "" });
      
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err) {
      console.error('Error creating post:', err);
      setError(err.message || 'Failed to create post');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="create-page">
      <h2>Create a New Post</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="title"
          placeholder="Title"
          value={postData.title}
          onChange={handleChange}
          required
        />
        <textarea
          name="content"
          placeholder="Content (Optional)"
          value={postData.content}
          onChange={handleChange}
          rows="5"
        />
        <input
          type="text"
          name="image_url"
          placeholder="Image URL (Optional)"
          value={postData.image_url}
          onChange={handleChange}
        />
        
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create Post'}
        </button>
        
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">Post created successfully! Redirecting...</div>}
      </form>
    </div>
  );
};

export default Create;
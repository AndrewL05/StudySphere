import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import supabase from '../Services/supabaseClient';
import '../App.css';

const Edit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [postData, setPostData] = useState({
    title: "",
    content: "",
    image_url: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const fetchPostAndUser = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) throw userError;
        setCurrentUser(user);

        // Fetch post data
        const { data: post, error: postError } = await supabase
          .from('posts')
          .select('*')
          .eq('id', id)
          .single();

        if (postError) throw postError;

        // Check if user is the author
        if (user.id !== post.user_id) {
          setError("You don't have permission to edit this post");
          return;
        }

        setPostData({
          title: post.title || "",
          content: post.content || "",
          image_url: post.image_url || "",
        });
      } catch (err) {
        console.error('Error fetching post:', err);
        setError('Failed to load post. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPostAndUser();
  }, [id, navigate]);

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
      if (!currentUser) {
        throw new Error('You must be logged in to update a post');
      }

      const { error: updateError } = await supabase
        .from('posts')
        .update({
          title: postData.title,
          content: postData.content || null,
          image_url: postData.image_url || null,
        })
        .eq('id', id);

      if (updateError) throw updateError;

      setSuccess(true);
      
      setTimeout(() => {
        navigate(`/post/${id}`);
      }, 1500);
    } catch (err) {
      console.error('Error updating post:', err);
      setError(err.message || 'Failed to update post');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    navigate(`/post/${id}`);
  };

  if (isLoading) return <div className="edit-page loading">Loading...</div>;
  if (error) return <div className="edit-page error">{error}</div>;

  return (
    <div className="edit-page">
      <h2>Edit Post</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Title</label>
          <input
            type="text"
            id="title"
            name="title"
            value={postData.title}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="content">Content</label>
          <textarea
            id="content"
            name="content"
            value={postData.content}
            onChange={handleChange}
            rows="8"
            placeholder="Write your post content here (optional)"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="image_url">Image URL (Optional)</label>
          <input
            type="text"
            id="image_url"
            name="image_url"
            value={postData.image_url}
            onChange={handleChange}
            placeholder="https://example.com/image.jpg"
          />
        </div>
        
        <div className="form-actions">
          <button type="button" onClick={handleCancel} className="cancel-btn">
            Cancel
          </button>
          <button type="submit" disabled={isLoading} className="submit-btn">
            {isLoading ? 'Updating...' : 'Update Post'}
          </button>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">Post updated successfully! Redirecting...</div>}
      </form>
    </div>
  );
};

export default Edit;
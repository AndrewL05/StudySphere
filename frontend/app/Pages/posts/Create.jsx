import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import './Posts.css';
import supabase from '../../Services/supabaseClient';

const Create = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const passedGroupInfo = location.state; 

  const [postData, setPostData] = useState({
    title: "",
    content: "",
    image_url: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.error('Error getting user:', authError);
        setError("Could not verify user session. Please sign in.");
        navigate('/signin');
        return;
      }
      if (user) {
        setUserId(user.id);
      } else {
        setError("You must be logged in to create a post.");
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
    if (!userId) {
      setError("User not identified. Please sign in again.");
      return;
    }
    if (!postData.title.trim()) {
        setError("Post title cannot be empty.");
        return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const submissionData = {
        title: postData.title.trim(),
        content: postData.content.trim() || null,
        image_url: postData.image_url.trim() || null,
        user_id: userId,
        upvotes: 0,
        source_group_id: passedGroupInfo?.groupId || null
      };

      const { data: newPost, error: postInsertError } = await supabase
        .from('posts')
        .insert([submissionData])
        .select()
        .single();

      if (postInsertError) throw postInsertError;
      if (!newPost || !newPost.id) throw new Error("Failed to create post or retrieve its ID.");

      const newPostId = newPost.id;
      console.log('Post created successfully:', newPostId, 'for group:', submissionData.source_group_id);

      if (passedGroupInfo && passedGroupInfo.groupId) {
        const { error: tagError } = await supabase
          .from('post_group_tags')
          .insert([{ post_id: newPostId, group_id: passedGroupInfo.groupId }]);
        if (tagError) {
          console.error(`Error tagging post ${newPostId} to group ${passedGroupInfo.groupId}:`, tagError);
          // setError(`Post created, but failed to initially tag to group: ${tagError.message}`);
        } else {
          console.log(`Post ${newPostId} explicitly tagged to group ${passedGroupInfo.groupId}`);
        }
      }
      

      setSuccess(true);
      setPostData({ title: "", content: "", image_url: "" });

      setTimeout(() => {
        if (passedGroupInfo && passedGroupInfo.groupId) {
          navigate(`/group/${passedGroupInfo.groupId}`);
        } else {
          navigate(`/post/${newPostId}`);
        }
      }, 1500);

    } catch (err) {
      console.error('Error creating post:', err);
      setError(err.message || 'Failed to create post. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="create-page">
      <h2>{passedGroupInfo ? `Create Post in ${passedGroupInfo.groupName}` : "Create a New Post"}</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Title</label>
          <input
            type="text"
            id="title"
            name="title"
            placeholder="Enter post title"
            value={postData.title}
            onChange={handleChange}
            required
            disabled={isLoading}
          />
        </div>
        <div className="form-group">
          <label htmlFor="content">Content (Optional)</label>
          <textarea
            id="content"
            name="content"
            placeholder="Write your post content here..."
            value={postData.content}
            onChange={handleChange}
            rows="8"
            disabled={isLoading}
          />
        </div>
        <div className="form-group">
          <label htmlFor="image_url">Image URL (Optional)</label>
          <input
            type="text"
            id="image_url"
            name="image_url"
            placeholder="https://example.com/image.jpg"
            value={postData.image_url}
            onChange={handleChange}
            disabled={isLoading}
          />
        </div>
        <div className="form-actions" style={{ justifyContent: 'flex-end' }}>
          <button type="button" onClick={() => navigate(passedGroupInfo ? `/group/${passedGroupInfo.groupId}` : '/')} className="cancel-btn" disabled={isLoading}>
            Cancel
          </button>
          <button type="submit" className="submit-btn" disabled={isLoading}>
            {isLoading ? 'Creating...' : 'Create Post'}
          </button>
        </div>
        {error && <div className="error-message" style={{ marginTop: '1rem' }}>{error}</div>}
        {success && <div className="success-message" style={{ marginTop: '1rem' }}>Post created successfully! Redirecting...</div>}
      </form>
    </div>
  );
};

export default Create;
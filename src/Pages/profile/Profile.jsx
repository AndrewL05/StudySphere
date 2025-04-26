import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router';
import supabase from '../../Services/supabaseClient';
import './Profile.css';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [profileData, setProfileData] = useState({
    display_name: '',
    full_name: '',
    avatar_url: ''
  });
  const [darkMode, setDarkMode] = useState(document.body.classList.contains('dark'));
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          navigate('/signin');
          return;
        }

        setUser(user);

        // Get profile data
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (!profileError && profile) {
          setProfileData({
            display_name: profile.display_name || user.user_metadata?.displayName || '',
            full_name: profile.full_name || user.user_metadata?.full_name || '',
            avatar_url: profile.avatar_url || user.user_metadata?.avatar_url || ''
          });
        }

        // Get user's posts
        const { data: postsData, error: postsError } = await supabase
          .from('posts') 
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (!postsError) {
          setPosts(postsData || []);
        } else {
          console.error("Error fetching posts:", postsError);
        }
      } catch (err) {
        console.error("Error in profile page:", err);
        setError("Failed to load profile data");
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData({ ...profileData, [name]: value });
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    try {
      // Update profile 
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          display_name: profileData.display_name,
          full_name: profileData.full_name,
          avatar_url: profileData.avatar_url,
          updated_at: new Date()
        });

      if (profileError) throw profileError;

      // Update user metadata
      const { error: metadataError } = await supabase.auth.updateUser({
        data: { 
          displayName: profileData.display_name,
          full_name: profileData.full_name,
          avatar_url: profileData.avatar_url
        }
      });

      if (metadataError) throw metadataError;

      setSuccess("Profile updated successfully");
      setEditMode(false);
    } catch (err) {
      console.error("Error updating profile:", err);
      setError("Failed to update profile. Please try again.");
    }
  };

  const handleDeletePost = async (postId) => {
    if (window.confirm("Are you sure you want to delete this post? This action cannot be undone.")) {
      try {
        // Delete all comments for this post
        await supabase
          .from('comments')
          .delete()
          .eq('post_id', postId);

        // Delete all votes for this post
        await supabase
          .from('post_votes')
          .delete()
          .eq('post_id', postId);

        // Delete the post
        const { error } = await supabase
          .from('posts')
          .delete()
          .eq('id', postId);

        if (error) throw error;

        // Update the posts list
        setPosts(posts.filter(post => post.id !== postId));
        setSuccess("Post deleted successfully");
      } catch (err) {
        console.error("Error deleting post:", err);
        setError("Failed to delete post. Please try again.");
      }
    }
  };

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    
    if (newDarkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
    
    // Optionally, save preference to localStorage
    localStorage.setItem('darkMode', newDarkMode ? 'true' : 'false');
  };

  const handleDeleteAccount = async () => {
    setDeleteModalOpen(false);
    
    try {
      // Delete all user's comments
      await supabase
        .from('comments')
        .delete()
        .eq('user_id', user.id);
      
      // Delete all user's post votes
      await supabase
        .from('post_votes')
        .delete()
        .eq('user_id', user.id);
      
      // Delete all user's posts
      await supabase
        .from('posts')
        .delete()
        .eq('user_id', user.id);
      
      // Delete profile
      await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);
      
      // Delete user account
      const { error } = await supabase.auth.admin.deleteUser(user.id);
      
      if (error) throw error;
      
      // Sign out
      await supabase.auth.signOut();
      
      alert("Your account has been deleted successfully.");
      navigate('/');
    } catch (err) {
      console.error("Error deleting account:", err);
      setError("Failed to delete account. Please try again or contact support.");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  if (loading) return <div className="profile-page">Loading...</div>;

  return (
    <div className="profile-page">
      <div className="profile-container">
        <h2>Profile Settings</h2>
        
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
        
        {editMode ? (
          <form onSubmit={handleUpdateProfile} className="profile-form">
            <div className="form-group">
              <label htmlFor="display_name">Display Name</label>
              <input
                type="text"
                id="display_name"
                name="display_name"
                value={profileData.display_name}
                onChange={handleInputChange}
                placeholder="Your display name"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="full_name">Full Name</label>
              <input
                type="text"
                id="full_name"
                name="full_name"
                value={profileData.full_name}
                onChange={handleInputChange}
                placeholder="Your full name"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="avatar_url">Profile Picture URL</label>
              <input
                type="text"
                id="avatar_url"
                name="avatar_url"
                value={profileData.avatar_url}
                onChange={handleInputChange}
                placeholder="https://example.com/avatar.jpg"
              />
            </div>
            
            <div className="profile-email">
              <strong>Email:</strong> {user?.email}
              <p className="email-note">Email cannot be changed directly. Contact support if needed.</p>
            </div>
            
            <div className="form-actions">
              <button type="button" onClick={() => setEditMode(false)} className="cancel-btn">
                Cancel
              </button>
              <button type="submit" className="save-btn">
                Save Changes
              </button>
            </div>
          </form>
        ) : (
          <div className="profile-info">
            <div className="profile-detail">
              <strong>Display Name:</strong> {profileData.display_name || 'Not set'}
            </div>
            <div className="profile-detail">
              <strong>Full Name:</strong> {profileData.full_name || 'Not set'}
            </div>
            <div className="profile-detail">
              <strong>Email:</strong> {user?.email}
            </div>
            {profileData.avatar_url && (
              <div className="profile-avatar">
                <img src={profileData.avatar_url} alt="Profile" />
              </div>
            )}
            <button onClick={() => setEditMode(true)} className="edit-profile-btn">
              Edit Profile
            </button>
          </div>
        )}
        
        <div className="appearance-section">
          <h3>Appearance</h3>
          <div className="dark-mode-toggle">
            <label htmlFor="dark-mode-switch">Dark Mode</label>
            <label className="switch">
              <input
                id="dark-mode-switch"
                type="checkbox"
                checked={darkMode}
                onChange={toggleDarkMode}
              />
              <span className="slider"></span>
            </label>
          </div>
        </div>
        
        <div className="danger-zone">
          <h3>Danger Zone</h3>
          <p>Permanently delete your account and all of your content.</p>
          <button onClick={() => setDeleteModalOpen(true)} className="delete-account-btn">
            Delete Account
          </button>
        </div>
      </div>

      <div className="profile-posts">
        <h3>Your Posts</h3>
        {posts.length === 0 ? (
          <p className="no-posts">You haven't created any posts yet.</p>
        ) : (
          <div className="posts-list">
            {posts.map(post => (
              <div key={post.id} className="profile-post-item">
                <div className="post-info">
                  <h4>{post.title}</h4>
                  <p className="post-date">Posted on {formatDate(post.created_at)}</p>
                  <p className="post-stats">
                    Upvotes: {post.upvotes || 0}
                  </p>
                </div>
                <div className="post-management">
                  <Link to={`/post/${post.id}`} className="view-post-btn">
                    View
                  </Link>
                  <Link to={`/edit/${post.id}`} className="edit-post-btn">
                    Edit
                  </Link>
                  <button 
                    onClick={() => handleDeletePost(post.id)} 
                    className="delete-post-btn"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {deleteModalOpen && (
        <div className="delete-account-modal">
          <div className="modal-content">
            <h3>Delete Account</h3>
            <p>Are you sure you want to delete your account? This action cannot be undone and will:</p>
            <ul>
              <li>Delete all your posts and comments</li>
              <li>Remove all your upvotes</li>
              <li>Delete your profile information</li>
              <li>Permanently delete your account</li>
            </ul>
            <div className="modal-actions">
              <button onClick={() => setDeleteModalOpen(false)} className="cancel-btn">
                Cancel
              </button>
              <button onClick={handleDeleteAccount} className="confirm-delete-btn">
                Yes, Delete My Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
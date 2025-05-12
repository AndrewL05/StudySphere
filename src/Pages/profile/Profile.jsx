import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router'; 
import supabase from '../../Services/supabaseClient';
import './Profile.css';
import { useTheme } from '../../Context/ThemeContext';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true); 
  const [actionLoading, setActionLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [profileData, setProfileData] = useState({ display_name: '', full_name: '', avatar_url: '' });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const navigate = useNavigate();

  const { isDarkMode, toggleDarkMode } = useTheme();

  useEffect(() => {
    const fetchProfileData = async () => {
      setLoading(true); 
      setError(null);
      setSuccess(null);
      try {
        const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
        if (userError || !authUser) {
          navigate('/signin');
          return;
        }
        setUser(authUser);

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') { 
          console.error("Error fetching profile:", profileError);
        }
        if (profile) {
          setProfileData({
            display_name: profile.display_name || authUser.user_metadata?.displayName || '',
            full_name: profile.full_name || authUser.user_metadata?.full_name || '',
            avatar_url: profile.avatar_url || authUser.user_metadata?.avatar_url || ''
          });
        } else {
           setProfileData({
            display_name: authUser.user_metadata?.displayName || '',
            full_name: authUser.user_metadata?.full_name || '',
            avatar_url: authUser.user_metadata?.avatar_url || ''
          });
        }


        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select('*')
          .eq('user_id', authUser.id)
          .order('created_at', { ascending: false });

        if (postsError) {
          console.error("Error fetching posts:", postsError);
        } else {
          setPosts(postsData || []);
        }

      } catch (err) {
        console.error("Error in profile page setup:", err);
        setError("Failed to load profile data. Please refresh."); 
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
    if (!user) return;

    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const { error: profileError } = await supabase.from('profiles').upsert(
        {
          id: user.id,
          display_name: profileData.display_name,
          full_name: profileData.full_name,
          avatar_url: profileData.avatar_url,
          updated_at: new Date().toISOString() 
        },
        { onConflict: 'id' } 
      );
      if (profileError) throw profileError;

      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          displayName: profileData.display_name,
          full_name: profileData.full_name,
          avatar_url: profileData.avatar_url
        }
      });
      if (metadataError) console.warn("Error updating auth metadata:", metadataError); 

      setSuccess("Profile updated successfully");
      setEditMode(false);
      const { data: { user: updatedUser } } = await supabase.auth.getUser();
      setUser(updatedUser);


    } catch (err) {
      console.error("Error updating profile:", err);
      setError(`Failed to update profile: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!user) return;
    if (window.confirm("Are you sure you want to delete this post? This action cannot be undone.")) {
      setActionLoading(true);
      setError(null);
      setSuccess(null);
      try {
        //await supabase.from('comments').delete().eq('post_id', postId);
        //await supabase.from('post_votes').delete().eq('post_id', postId);
        // await supabase.from('post_group_tags').delete().eq('post_id', postId);


        const { error } = await supabase.from('posts').delete().eq('id', postId).eq('user_id', user.id); 
        if (error) throw error;
        setPosts(posts.filter(post => post.id !== postId));
        setSuccess("Post deleted successfully");
      } catch (err) {
        console.error("Error deleting post:", err);
        setError(`Failed to delete post: ${err.message}`);
      } finally {
        setActionLoading(false);
      }
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteModalOpen(false);
    if (!user) {
      setError("User not found or not logged in.");
      return;
    }

    if (!window.confirm("FINAL WARNING: Are you absolutely sure you want to permanently delete your account and all associated data? This cannot be undone.")) {
        return;
    }

    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // console.log(`Invoking 'delete-user-account' Edge Function for user: ${user.id}`);
      const { data: functionResponse, error: functionError } = await supabase.functions.invoke(
        'delete-user-account' 
      );

      if (functionError) {
        console.error("Edge function invocation error:", functionError);
        throw new Error(`Server error during account deletion: ${functionError.message || 'Please try again.'}`);
      }

      if (functionResponse && functionResponse.error) {
        console.error("Error from delete-user-account function's response:", functionResponse.error);
        throw new Error(functionResponse.error.message || functionResponse.error || "Failed to delete account as reported by the server.");
      }
      
      console.log("Edge function 'delete-user-account' success:", functionResponse);
      setSuccess("Your account has been successfully deleted. You will now be signed out.");
      
      await supabase.auth.signOut();
      
      setTimeout(() => {
        navigate('/');
      }, 2000);

    } catch (err) {
      console.error("[Profile.jsx] Error during account deletion process:", err);
      setError(err.message || "An unexpected error occurred while trying to delete your account.");
    } finally {
      setActionLoading(false);
    }
  };


  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (loading) return <div className="profile-page">Loading profile...</div>;
  if (error && !user) return <div className="profile-page error-message">{error}</div>;
  if (!user) return <div className="profile-page">Please sign in to view your profile.</div>;


  return (
    <div className="profile-page">
      <div className="profile-container">
        <h2>Profile Settings</h2>

        {error && !actionLoading && <div className="error-message" style={{marginBottom: '1rem'}}>{error}</div>}
        {success && !actionLoading && <div className="success-message" style={{marginBottom: '1rem'}}>{success}</div>}


        {editMode ? (
          <form onSubmit={handleUpdateProfile} className="profile-form">
            <div className="form-group">
              <label htmlFor="display_name">Display Name</label>
              <input type="text" id="display_name" name="display_name" value={profileData.display_name} onChange={handleInputChange} placeholder="Your display name" disabled={actionLoading}/>
            </div>
            <div className="form-group">
              <label htmlFor="full_name">Full Name</label>
              <input type="text" id="full_name" name="full_name" value={profileData.full_name} onChange={handleInputChange} placeholder="Your full name" disabled={actionLoading}/>
            </div>
            <div className="form-group">
              <label htmlFor="avatar_url">Profile Picture URL</label>
              <input type="text" id="avatar_url" name="avatar_url" value={profileData.avatar_url} onChange={handleInputChange} placeholder="https://example.com/avatar.jpg" disabled={actionLoading}/>
            </div>
            <div className="profile-email"><strong>Email:</strong> {user?.email}<p className="email-note">Email cannot be changed here.</p></div>
            <div className="form-actions">
              <button type="button" onClick={() => { setEditMode(false); setError(null); setSuccess(null); }} className="cancel-btn" disabled={actionLoading}>Cancel</button>
              <button type="submit" className="save-btn" disabled={actionLoading}>
                {actionLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : (
          <div className="profile-info">
            <div className="profile-detail"><strong>Display Name:</strong> {profileData.display_name || 'Not set'}</div>
            <div className="profile-detail"><strong>Full Name:</strong> {profileData.full_name || 'Not set'}</div>
            <div className="profile-detail"><strong>Email:</strong> {user?.email}</div>
            {profileData.avatar_url && (<div className="profile-avatar"><img src={profileData.avatar_url} alt="Profile" onError={(e) => e.target.style.display='none'} /></div>)}
            <button onClick={() => { setEditMode(true); setError(null); setSuccess(null); }} className="edit-profile-btn">Edit Profile</button>
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
                checked={isDarkMode}
                onChange={toggleDarkMode}
              />
              <span className="slider round"></span> 
            </label>
          </div>
        </div>

        <div className="danger-zone">
          <h3>Danger Zone</h3>
          <p>Permanently delete your account and all of your content.</p>
          <button onClick={() => setDeleteModalOpen(true)} className="delete-account-btn" disabled={actionLoading}>
            Delete Account
          </button>
        </div>
      </div>

      <div className="profile-posts">
        <h3>Your Posts ({posts.length})</h3>
        {posts.length === 0 ? (<p className="no-posts">You haven't created any posts yet. <Link to="/create">Create one now?</Link></p>) : (
          <div className="posts-list">
            {posts.map(post => (
              <div key={post.id} className="profile-post-item">
                <div className="post-info"><h4>{post.title}</h4><p className="post-date">Posted on {formatDate(post.created_at)}</p><p className="post-stats">Upvotes: {post.upvotes || 0}</p></div>
                <div className="post-management">
                  <Link to={`/post/${post.id}`} className="view-post-btn">View</Link>
                  <Link to={`/edit/${post.id}`} className="edit-post-btn">Edit</Link>
                  <button onClick={() => handleDeletePost(post.id)} className="delete-post-btn" disabled={actionLoading}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {deleteModalOpen && (
        <div className="delete-account-modal">
          <div className="modal-content">
            <h3>Delete Account Confirmation</h3>
            <p>Are you absolutely sure you want to delete your account? This action is irreversible and will permanently remove all your posts, comments, votes, and profile information.</p>
            <ul>
                <li>All your posts will be deleted.</li>
                <li>All your comments will be deleted.</li>
                <li>All your upvotes/downvotes will be removed.</li>
                <li>Your profile information will be deleted.</li>
                <li>Your account login will be permanently removed.</li>
            </ul>
            <div className="modal-actions">
              <button onClick={() => setDeleteModalOpen(false)} className="cancel-btn" disabled={actionLoading}>Cancel</button>
              <button onClick={handleDeleteAccount} className="confirm-delete-btn" disabled={actionLoading}>
                {actionLoading ? 'Deleting Account...' : 'Yes, Delete My Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;

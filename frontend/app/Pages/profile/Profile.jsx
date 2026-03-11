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

  const initial = profileData.display_name
    ? profileData.display_name.charAt(0).toUpperCase()
    : user?.email
      ? user.email.charAt(0).toUpperCase()
      : '?';

  if (loading) return <div className="profile-page">Loading profile...</div>;
  if (error && !user) return <div className="profile-page profile-error">{error}</div>;
  if (!user) return <div className="profile-page">Please sign in to view your profile.</div>;


  return (
    <div className="profile-page">
      <div className="profile-container">

        {error && !actionLoading && <div className="profile-error">{error}</div>}
        {success && !actionLoading && <div className="profile-success">{success}</div>}

        {/* Profile header */}
        <div className="profile-header-card">
          <div className="profile-avatar">
            {profileData.avatar_url ? (
              <img src={profileData.avatar_url} alt="Avatar" onError={(e) => e.target.style.display='none'} />
            ) : (
              <span>{initial}</span>
            )}
          </div>
          <h2 className="profile-name">{profileData.display_name || 'Not set'}</h2>
          <p className="profile-email">{user?.email}</p>
        </div>

        {/* Profile settings */}
        <div className="profile-section">
          <h3 className="profile-section-title">Profile</h3>
          <form onSubmit={handleUpdateProfile} className="profile-form">
            <div className="form-field">
              <label htmlFor="display_name">Display Name</label>
              <input type="text" id="display_name" name="display_name" value={profileData.display_name} onChange={handleInputChange} placeholder="Your display name" disabled={actionLoading} />
            </div>
            <div className="form-field">
              <label htmlFor="full_name">Full Name</label>
              <input type="text" id="full_name" name="full_name" value={profileData.full_name} onChange={handleInputChange} placeholder="Your full name" disabled={actionLoading} />
            </div>
            <div className="form-field">
              <label htmlFor="avatar_url">Avatar URL</label>
              <input type="text" id="avatar_url" name="avatar_url" value={profileData.avatar_url} onChange={handleInputChange} placeholder="https://example.com/avatar.jpg" disabled={actionLoading} />
            </div>
            <button type="submit" className="form-submit-btn" disabled={actionLoading}>
              {actionLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Appearance */}
        <div className="profile-section">
          <h3 className="profile-section-title">Appearance</h3>
          <div className="profile-theme-toggle">
            <span>Dark Mode</span>
            <button
              type="button"
              className={`fc-toggle-switch ${isDarkMode ? 'active' : ''}`}
              onClick={toggleDarkMode}
              aria-label="Toggle dark mode"
            />
          </div>
        </div>

        {/* Your Posts */}
        <div className="profile-section">
          <h3 className="profile-section-title">Your Posts ({posts.length})</h3>
          {posts.length === 0 ? (
            <p className="profile-no-posts">You haven't created any posts yet. <Link to="/create">Create one now?</Link></p>
          ) : (
            posts.map(post => (
              <div key={post.id} className="profile-post-item">
                <Link to={`/post/${post.id}`} className="profile-post-title">{post.title}</Link>
                <div className="profile-post-actions">
                  <Link to={`/edit/${post.id}`} className="profile-post-edit-btn">Edit</Link>
                  <button onClick={() => handleDeletePost(post.id)} className="profile-post-delete-btn" disabled={actionLoading}>Delete</button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Danger Zone */}
        <div className="profile-section profile-danger-section">
          <h3 className="profile-section-title">Danger Zone</h3>
          <p>Permanently delete your account and all associated data.</p>
          <button className="profile-delete-btn" onClick={handleDeleteAccount} disabled={actionLoading}>
            {actionLoading ? 'Deleting...' : 'Delete Account'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;

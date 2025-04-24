import React, { useEffect, useState } from 'react';
import supabase from '../Services/supabaseClient';
import '../App.css';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfileData = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) return;

      setUser(user);

      const { data: postsData, error: postsError } = await supabase
        .from('posts') 
        .select('*')
        .eq('user_id', user.id);

      if (!postsError) setPosts(postsData);
      setLoading(false);
    };

    fetchProfileData();
  }, []);

  if (loading) return <div className="profile-page">Loading...</div>;

  return (
    <div className="profile-page">
      <h2>Profile</h2>
      <p><strong>Name:</strong> {user?.user_metadata?.username || 'N/A'}</p>
      <p><strong>Email:</strong> {user?.email}</p>

      <h3>Post History</h3>
      <ul> 
        {posts.length === 0 ? (
          <li>No posts yet.</li>
        ) : (
          posts.map(post => (
            <li key={post.id}>{post.title} ({new Date(post.created_at).toLocaleDateString()})</li>
          ))
        )}
      </ul>
    </div>
  );
};

export default Profile;

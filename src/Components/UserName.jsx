import React, { useState, useEffect } from 'react';
import supabase from '../Services/supabaseClient';

const UserName = ({ userId }) => {
  const [displayName, setDisplayName] = useState('Anonymous');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserName = async () => {
      if (!userId) {
        setDisplayName('Anonymous');
        setLoading(false);
        return;
      }

      try {
        // Try to get from profiles table
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('display_name, full_name')
          .eq('id', userId)
          .single();
          
        console.log("Profile query for user:", userId, { profile, profileError });
          
        if (!profileError && profile && (profile.display_name || profile.full_name)) {
          setDisplayName(profile.display_name || profile.full_name);
          setLoading(false);
          return;
        }
        
        // If no profile or error, try to get from current user
        const { data, error } = await supabase.auth.getUser();
        
        if (!error && data?.user && data.user.id === userId) {
          const metadata = data.user.user_metadata;
          setDisplayName(
            metadata?.displayName || 
            metadata?.full_name || 
            metadata?.name || 
            data.user.email || 
            'User-' + userId.substring(0, 6)
          );
        } else {
          // For other users, just use a placeholder with their ID
          setDisplayName(`User-${userId.substring(0, 6)}`);
        }
      } catch (error) {
        console.error('Error fetching user name:', error);
        setDisplayName(`User-${userId ? userId.substring(0, 6) : 'Anonymous'}`);
      } finally {
        setLoading(false);
      }
    };

    fetchUserName();
  }, [userId]);

  if (loading) return <span>...</span>;
  
  return <span className="user-name">{displayName}</span>;
};

export default UserName;
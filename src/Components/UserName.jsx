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
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, full_name')
          .eq('id', userId)
          .single();
          
        if (profile && (profile.display_name || profile.full_name)) {
          setDisplayName(profile.display_name || profile.full_name);
          setLoading(false);
          return;
        }
        
        const { data } = await supabase.auth.getUser();
        
        if (data?.user && data.user.id === userId) {
          const metadata = data.user.user_metadata;
          setDisplayName(
            metadata?.displayName || 
            metadata?.full_name || 
            metadata?.name || 
            data.user.email || 
            'Anonymous'
          );
        } else {
          setDisplayName(`User-${userId.substring(0, 6)}`);
        }
      } catch (error) {
        console.error('Error fetching user name:', error);
        setDisplayName('Anonymous');
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
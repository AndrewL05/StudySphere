import React, { useState, useEffect } from 'react';
import supabase from '../Services/supabaseClient';

const UserName = ({ userId }) => {
  const [displayName, setDisplayName] = useState('Anonymous');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true; 

    const fetchUserName = async () => {
      if (!userId) {
        if (isMounted) {
          setDisplayName('Anonymous');
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('display_name, full_name')
          .eq('id', userId)
          .single();

        if (!isMounted) return; 

        if (profile && (profile.display_name || profile.full_name)) {
          setDisplayName(profile.display_name || profile.full_name);
        } else {
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          if (!isMounted) return;

          if (currentUser && currentUser.id === userId && currentUser.user_metadata) {
            const metadata = currentUser.user_metadata;
            const nameFromMeta = metadata.displayName || metadata.name || metadata.full_name;
            if (nameFromMeta) {
              setDisplayName(nameFromMeta);
            } else {
              setDisplayName(`User-${userId.substring(0, 6)}`);
            }
          } else {
            setDisplayName(`User-${userId.substring(0, 6)}`);
          }
        }
        if (profileError && profileError.code !== 'PGRST116') {
            console.warn(`Error fetching profile for ${userId}:`, profileError.message);
        }

      } catch (error) {
        if (isMounted) {
          console.error('Error fetching user name:', error);
          setDisplayName(`User-${userId.substring(0, 6)}`); 
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchUserName();

    return () => {
      isMounted = false; 
    };
  }, [userId]); 

  if (loading) {
    return <span className="user-name-loading">...</span>;
  }

  return <span className="user-name">{displayName}</span>;
};

export default UserName;

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
        // Try fetching from 'profiles' table first
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('display_name, full_name')
          .eq('id', userId)
          .maybeSingle(); // <--- USE .maybeSingle() HERE

        if (!isMounted) return;

        if (profile && (profile.display_name || profile.full_name)) {
          setDisplayName(profile.display_name || profile.full_name);
        } else {
          // If not found in profiles or no display/full name, try auth metadata
          // This part of your logic is good for fallback
          const { data: { user: authUser }, error: authUserError } = await supabase.auth.getUser();

          if (!isMounted) return;

          if (authUserError) {
            console.warn(`Error fetching auth user for ${userId} in UserName:`, authUserError.message);
          }

          // Check if the current auth user is the one we are looking for,
          // or if we need to fetch another user's public metadata (if allowed by RLS)
          // For simplicity here, we assume we are primarily getting the current user's data
          // or relying on a previously fetched user object that might contain metadata.
          // Your original logic for fetching other user's metadata via admin might be needed if
          // `authUser.id !== userId` and you need to display names for users other than the currently logged-in one.

          let nameFromMeta = null;
          if (authUser && authUser.id === userId && authUser.user_metadata) {
            const metadata = authUser.user_metadata;
            nameFromMeta = metadata.displayName || metadata.name || metadata.full_name || metadata.email;
          }
          // If you have a way to get other users' metadata (e.g., if user_metadata is public or via an admin call)
          // you would add that logic here. Your `userAPI.js` `getUserDisplayName` has more complex logic for this.
          // For now, this simplified version focuses on the PGRST116 error.

          if (nameFromMeta) {
            setDisplayName(nameFromMeta);
          } else {
            // Fallback if no profile and no readily available metadata
            setDisplayName(`User-${userId.substring(0, 6)}`);
          }
        }

        // Log profileError only if it's not the "0 rows" error (which .maybeSingle() handles)
        if (profileError && profileError.code !== 'PGRST116') {
            console.warn(`Error fetching profile for ${userId} in UserName:`, profileError.message);
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
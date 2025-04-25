import supabase from './supabaseClient';

// Fetch user profile by ID
export async function getUserProfile(userId) {
  return await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
}

// Fetch user display name from auth.users
export async function getUserDisplayName(userId) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, full_name')
    .eq('id', userId)
    .single();
    
  if (profile && (profile.display_name || profile.full_name)) {
    return profile.display_name || profile.full_name;
  }
  
  // Otherwise get from auth metadata
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  
  if (error || !data?.user) {
    console.error('Error fetching user:', error);
    return 'Anonymous';
  }
  
  const user = data.user;
  return user.user_metadata?.displayName || 
         user.user_metadata?.full_name || 
         user.user_metadata?.name || 
         user.email || 
         'Anonymous';
}


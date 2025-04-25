import supabase from './supabaseClient';

// CREATE
export async function createPost({ title, content, image_url }) {
  return await supabase.from('posts').insert([{ title, content, image_url }]);
}

// READ ALL
export async function fetchPosts() {
  return await supabase.from('posts').select('*').order('created_at', { ascending: false });
}

// READ SINGLE
export async function fetchPostById(id) {
  return await supabase.from('posts').select('*').eq('id', id).single();
}

// UPDATE
export async function updatePost(id, data) {
  return await supabase.from('posts').update(data).eq('id', id);
}

// DELETE
export async function deletePost(id) {
  return await supabase.from('posts').delete().eq('id', id);
}

// Add/remove upvotes
export async function togglePostUpvote(postId, userId, isUpvoting) {
  // Checks if the user has already upvoted this post
  const { data: existingVote } = await supabase
    .from('post_votes')
    .select('*')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .single();

  if (existingVote) {
    if (!isUpvoting) {
      // Undo upvote
      await supabase
        .from('post_votes')
        .delete()
        .eq('id', existingVote.id);
        
      // Decrement the upvotes count 
      return await supabase
        .from('posts')
        .update({ upvotes: supabase.rpc('decrement', { x: 1 }) })
        .eq('id', postId);
    }
    return { data: null, error: null };
  } else if (isUpvoting) {
    // If user hasn't upvoted, increment upvote
    await supabase
      .from('post_votes')
      .insert([{ post_id: postId, user_id: userId, vote_type: 'upvote' }]);
      
    // Increment the upvotes count in the posts table
    return await supabase
      .from('posts')
      .update({ upvotes: supabase.rpc('increment', { x: 1 }) })
      .eq('id', postId);
  }
  
  return { data: null, error: null };
}

// Add a function to check if a user has already upvoted a post
export async function checkUserUpvoted(postId, userId) {
  const { data } = await supabase
    .from('post_votes')
    .select('*')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .single();
    
  return !!data; // Returns true if the user has upvoted, false otherwise
}
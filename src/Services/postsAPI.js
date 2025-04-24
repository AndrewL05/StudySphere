import { supabase } from '/supabaseClient';

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
const getApiBaseUrl = () => {
  if (import.meta.env.DEV) {
    return 'http://localhost:3001';
  }
  
  return import.meta.env.VITE_API_URL || '/.netlify/functions';
};

export const API_BASE_URL = getApiBaseUrl();

// Helper function for making authenticated API calls
export const apiCall = async (endpoint, options = {}) => {
  // For Netlify functions, adjust the endpoint
  const isNetlifyFunctions = API_BASE_URL.includes('/.netlify/functions');
  const url = isNetlifyFunctions 
    ? `${API_BASE_URL}${endpoint.replace('/api/', '/')}`  
    : `${API_BASE_URL}${endpoint}`;
  
  let token = null;
  try {
    const supabase = (await import('../Services/supabaseClient')).default;
    const { data: { session } } = await supabase.auth.getSession();
    token = session?.access_token;
  } catch (error) {
    console.warn('Could not get auth token:', error);
  }
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };
  
  const response = await fetch(url, defaultOptions);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Network error' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }
  
  return response.json();
};

export default { API_BASE_URL, apiCall }; 
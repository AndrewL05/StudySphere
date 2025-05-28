import supabaseAdmin from '../config/supabaseAdmin.js'; 

export const protectRoute = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error) {
      console.error('Token validation error:', error.message);
      return res.status(401).json({ error: 'Unauthorized: Invalid token.' });
    }

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: User not found for token.' });
    }

    req.user = user;
    next(); 

  } catch (error) {
    console.error('Auth middleware unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error during authentication.' });
  }
};

import supabaseAdmin from '../config/supabaseAdmin.js'; 

export const deleteCurrentUserAccount = async (req, res, next) => {
  try {
    const userIdToDelete = req.user?.id;

    if (!userIdToDelete) {
      return res.status(401).json({ error: 'User not authenticated or user ID not found in token.' });
    }

    console.log(`[Backend] Attempting to delete account for user: ${userIdToDelete}`);
    
    const { data: deleteAuthUserResponse, error: deleteAuthUserError } =
      await supabaseAdmin.auth.admin.deleteUser(userIdToDelete);

    if (deleteAuthUserError) {
      console.error(`[Backend] Error deleting user ${userIdToDelete} from auth.users:`, deleteAuthUserError);
      return next(deleteAuthUserError);
    }

    console.log(`[Backend] User ${userIdToDelete} successfully deleted from auth.users.`);
    res.status(200).json({ message: 'Account successfully deleted.' });

  } catch (error) {
    console.error('[Backend] Overall error in deleteCurrentUserAccount:', error);
    next(error); 
  }
};

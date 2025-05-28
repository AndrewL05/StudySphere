import supabaseAdmin from '../config/supabaseAdmin.js'; 

export const deleteCurrentUserAccount = async (req, res, next) => {
  try {
    // req.user is populated by your authMiddleware and contains the authenticated Supabase user object
    const userIdToDelete = req.user?.id;

    if (!userIdToDelete) {
      return res.status(401).json({ error: 'User not authenticated or user ID not found in token.' });
    }

    console.log(`[Backend] Attempting to delete account for user: ${userIdToDelete}`);

    // --- Data Deletion Logic (if not using ON DELETE CASCADE fully) ---
    // Example: If you need to manually delete from some tables before auth user deletion
    // const tablesToDeleteFrom = [
    //   { table: 'comments', column: 'user_id' },
    //   { table: 'post_votes', column: 'user_id' },
    //   { table: 'posts', column: 'user_id' },
    //   { table: 'group_members', column: 'user_id'},
    //   { table: 'bookmarked_posts', column: 'user_id'},
    //   { table: 'profiles', column: 'id' }, // 'id' in profiles matches user_id
    // ];
    // for (const item of tablesToDeleteFrom) {
    //   const { error: deleteDataError } = await supabaseAdmin
    //     .from(item.table)
    //     .delete()
    //     .eq(item.column, userIdToDelete);
    //   if (deleteDataError) {
    //     console.warn(`[Backend] Error deleting from ${item.table} for user ${userIdToDelete}:`, deleteDataError.message);
    //     // Decide if this is a critical failure or if you should continue
    //   }
    // }
    // --- End Data Deletion Logic ---


    // Delete the user from auth.users
    // The 'true' argument for hard delete is now the default in supabase-js v2 if not specified.
    // For clarity, using 'false' for hard delete was from older docs or specific versions.
    // The current `deleteUser` only takes `id`. If you want to soft delete, you'd use `updateUser` to mark as archived.
    // Let's assume hard delete.
    const { data: deleteAuthUserResponse, error: deleteAuthUserError } =
      await supabaseAdmin.auth.admin.deleteUser(userIdToDelete);

    if (deleteAuthUserError) {
      console.error(`[Backend] Error deleting user ${userIdToDelete} from auth.users:`, deleteAuthUserError);
      return next(deleteAuthUserError); // Pass to global error handler
    }

    console.log(`[Backend] User ${userIdToDelete} successfully deleted from auth.users.`);
    // Client will handle signOut. Server just confirms deletion.
    res.status(200).json({ message: 'Account successfully deleted.' });

  } catch (error) {
    console.error('[Backend] Overall error in deleteCurrentUserAccount:', error);
    next(error); // Pass to global error handler
  }
};

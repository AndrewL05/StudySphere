import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router'; 
import supabase from '../../Services/supabaseClient';
import './Groups.css'; 
import '../auth/Auth.css'; 

const CreateGroup = () => {
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const [currentUser, setCurrentUser] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      setIsLoading(true); // Start loading while checking auth
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError) {
          console.error('Error fetching user:', userError);
          throw new Error("Could not verify user session.");
        }

        if (!user) {
          // If no user is logged in, redirect to the sign-in page
          navigate('/signin');
          return; // Stop execution if not logged in
        }
        setCurrentUser(user); // Store the user object
      } catch (err) {
        setError(err.message || "An error occurred fetching user data.");
        navigate('/signin'); // Redirect on error as well
      } finally {
        setIsLoading(false); // Stop loading after check
      }
    };

    fetchUser();
  }, [navigate]); // Dependency array includes navigate

  // Handler for form submission
  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent default browser form submission
    setError(null); // Clear previous errors
    setSuccess(false); // Reset success state

    // Basic validation
    if (!groupName.trim()) {
      setError("Group name cannot be empty.");
      return;
    }
    if (!currentUser) {
        setError("You must be logged in to create a group.");
        return;
    }

    setIsLoading(true); // Set loading state

    try {
      // 1. Insert the new group into the 'study_groups' table
      const { data: groupData, error: groupError } = await supabase
        .from('study_groups')
        .insert([
          {
            name: groupName.trim(),
            description: description.trim() || null, // Use null if description is empty
            creator_id: currentUser.id, // Set the creator ID
          },
        ])
        .select() // Select the newly inserted row to get its ID
        .single(); // Expecting a single row back

      if (groupError) {
        console.error('Error inserting group:', groupError);
        throw groupError; // Throw error to be caught by catch block
      }

      if (!groupData || !groupData.id) {
          throw new Error("Failed to create group or retrieve its ID.");
      }

      const newGroupId = groupData.id;
      console.log('Group created successfully with ID:', newGroupId);

      // 2. Add the creator as the first member (and admin) in 'group_members'
      const { error: memberError } = await supabase
        .from('group_members')
        .insert([
          {
            group_id: newGroupId,
            user_id: currentUser.id,
            role: 'admin', // Assign the creator as admin
          },
        ]);

      if (memberError) {
        console.error('Error adding creator to group members:', memberError);
        // Optional: Consider deleting the created group if adding member fails (rollback logic)
        // await supabase.from('study_groups').delete().eq('id', newGroupId);
        throw new Error("Group created, but failed to add creator as member.");
      }

      console.log('Creator added as admin member.');
      setSuccess(true); // Set success state
      setGroupName(''); // Clear form fields
      setDescription('');

      // Redirect to the newly created group's page after a short delay
      setTimeout(() => {
        navigate(`/group/${newGroupId}`);
      }, 1500); // Redirect after 1.5 seconds

    } catch (err) {
      console.error('Error in handleSubmit:', err);
      setError(err.message || 'Failed to create study group. Please try again.');
    } finally {
      setIsLoading(false); // Reset loading state regardless of outcome
    }
  };

  // Render loading state if checking user or submitting
  if (isLoading && !currentUser) {
     return <div className="create-group-page loading">Verifying user...</div>; // Specific loading message
  }

  return (
    // Use existing CSS classes for structure and styling
    <div className="create-group-page"> {/* Main container class */}
      <h2>Create a New Study Group</h2>

      <form onSubmit={handleSubmit} className="create-group-form"> {/* Form specific class */}
        {/* Group Name Input */}
        <div className="form-group"> {/* Re-use form-group style */}
          <label htmlFor="groupName">Group Name</label>
          <input
            type="text"
            id="groupName"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="e.g., CS 101 Study Buddies"
            required // HTML5 required attribute
            disabled={isLoading} // Disable input while loading
          />
        </div>

        {/* Group Description Textarea */}
        <div className="form-group">
          <label htmlFor="description">Description (Optional)</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this group about?"
            rows="4" // Suggest a height
            disabled={isLoading}
          />
        </div>

        {/* Submit Button */}
        {/* Use auth-button style or create a specific one */}
        <button type="submit" className="auth-button" disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create Group'}
        </button>

        {/* Error Message Display */}
        {error && <div className="error-message">{error}</div>}

        {/* Success Message Display */}
        {success && <div className="success-message">Group created successfully! Redirecting...</div>}
      </form>
    </div>
  );
};

export default CreateGroup;

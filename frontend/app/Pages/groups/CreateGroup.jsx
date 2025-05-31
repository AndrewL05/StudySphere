import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import supabase from '../../Services/supabaseClient';
import './Groups.css';
import '../auth/Auth.css';

const availableTopicsList = [
    'Math', 'Science', 'History', 'Programming', 'Physics', 'Calculus',
    'Biology', 'Chemistry', 'Literature', 'Art', 'Music', 'Economics',
    'Philosophy', 'Languages', 'Engineering', 'Business', 'Medicine', 'Law'
];

const CreateGroup = () => {
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTopics, setSelectedTopics] = useState([]); 

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      setIsLoading(true);
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw new Error("Could not verify user session.");
        if (!user) { navigate('/signin'); return; }
        setCurrentUser(user);
      } catch (err) {
        setError(err.message || "An error occurred fetching user data.");
        navigate('/signin');
      } finally {
        setIsLoading(false);
      }
    };
    fetchUser();
  }, [navigate]);

  const handleTopicChange = (topic) => {
    setSelectedTopics(prevTopics =>
      prevTopics.includes(topic)
        ? prevTopics.filter(t => t !== topic)
        : [...prevTopics, topic]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!groupName.trim()) { setError("Group name cannot be empty."); return; }
    if (!currentUser) { setError("You must be logged in to create a group."); return; }

    setIsLoading(true);

    try {
      const { data: groupData, error: groupError } = await supabase
        .from('study_groups')
        .insert([
          {
            name: groupName.trim(),
            description: description.trim() || null,
            creator_id: currentUser.id,
            topics: selectedTopics, 
          },
        ])
        .select()
        .single();

      if (groupError) throw groupError;
      if (!groupData || !groupData.id) throw new Error("Failed to create group or retrieve its ID.");

      const newGroupId = groupData.id;
      console.log('Group created successfully with ID:', newGroupId, 'Topics:', selectedTopics);

       const { error: memberError } = await supabase
            .from('group_members')
            .insert([{ group_id: newGroupId, user_id: currentUser.id, role: 'admin' }]);

       if (memberError) {
            console.error('Error adding creator to group members:', memberError);
            console.log(`Attempting to delete group ${newGroupId} due to member insertion failure.`);
            await supabase.from('study_groups').delete().eq('id', newGroupId);
            throw new Error("Group created, but failed to add creator as member.");
       }

      console.log('Creator added as admin member.');
      setSuccess(true);
      setGroupName('');
      setDescription('');
      setSelectedTopics([]); 

      setTimeout(() => { navigate(`/group/${newGroupId}`); }, 1500);

    } catch (err) {
      console.error('Error in handleSubmit:', err);
      setError(err.message || 'Failed to create study group. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !currentUser) {
     return <div className="create-group-page loading">Verifying user...</div>;
  }

  return (
    <div className="create-group-page">
      <h2>Create a New Group</h2>

      <form onSubmit={handleSubmit} className="create-group-form">
        <div className="form-group">
          <label htmlFor="groupName">Group Name</label>
          <input
            type="text"
            id="groupName"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="e.g., CS 101 Study Buddies"
            required
            disabled={isLoading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description (Optional)</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this group about?"
            rows="4"
            disabled={isLoading}
          />
        </div>

        <div className="form-group">
          <label>Topics (Optional)</label>
          <div className="topics-checkbox-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', maxHeight: '150px', overflowY: 'auto', border: '1px solid var(--border-color-light)', padding: '10px', borderRadius: 'var(--radius-md)' }}>
            {availableTopicsList.map(topic => (
              <label key={topic} className="topic-checkbox-label" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer'}}>
                <input
                  type="checkbox"
                  value={topic}
                  checked={selectedTopics.includes(topic)}
                  onChange={() => handleTopicChange(topic)}
                  disabled={isLoading}
                  style={{ marginRight: '5px' }}
                />
                {topic}
              </label>
            ))}
          </div>
          <small className="topics-input-hint">Select one or more relevant topics for your group.</small>
        </div>

        <button type="submit" className="auth-button" disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create Group'}
        </button>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">Group created successfully! Redirecting...</div>}
      </form>
    </div>
  );
};

export default CreateGroup;
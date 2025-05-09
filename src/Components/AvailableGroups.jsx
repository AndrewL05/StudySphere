import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import supabase from '../Services/supabaseClient';
import '../App.css';

const AvailableGroups = ({
    title = "Discover Groups",
    maxGroups = 5,
    showCreateButton = false,
    showViewAllButton = false
}) => {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentUser, setCurrentUser] = useState(null); 
    const [joiningGroupId, setJoiningGroupId] = useState(null); 
    const navigate = useNavigate();

    useEffect(() => {
        const fetchInitialData = async () => {
            setLoading(true);
            setError(null);
            try {
                // Get current user
                const { data: { user } } = await supabase.auth.getUser();
                setCurrentUser(user);

                // Fetch groups
                const { data: groupData, error: fetchError } = await supabase
                    .from('study_groups')
                    .select('id, name')
                    .order('created_at', { ascending: false })
                    .limit(maxGroups);

                if (fetchError) throw fetchError;
                setGroups(groupData || []);

            } catch (err) {
                console.error("Error fetching data:", err);
                setError("Failed to load groups.");
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();
    }, [maxGroups]);

    const handleViewGroup = (groupId) => {
        navigate(`/group/${groupId}`);
    };

    const handleJoinGroup = async (e, groupId, groupName) => {
        e.stopPropagation();
        if (!currentUser) {
            alert("Please sign in to join groups.");
            navigate('/signin');
            return;
        }
        setJoiningGroupId(groupId); 
        setError(null);
        try {
            const { error: insertError } = await supabase
                .from('group_members')
                .insert({
                    group_id: groupId,
                    user_id: currentUser.id,
                    role: 'member'
                });

            if (insertError) {
                 if (insertError.code === '23505') {
                    alert(`You are already a member of "${groupName}".`);
                    navigate(`/group/${groupId}`);
                 } else {
                    throw insertError;
                 }
            } else {
                alert(`Successfully joined "${groupName}"!`);
                 navigate(`/group/${groupId}`); 
            }
        } catch (err) {
            console.error("Error joining group:", err);
            alert(`Failed to join "${groupName}". Please try again.`);
        } finally {
            setJoiningGroupId(null); 
        }
    };

    const handleCreateGroup = () => {
        navigate('/create-group');
    };

    const handleViewAllGroups = () => {
        navigate('/groups'); 
    };

    return (
        <div className="available-groups-sidebar">
            <h3>{title}</h3>
            {loading ? (
                <div className="loading">Loading...</div>
            ) : error ? (
                 <div className="error">{error}</div>
            ) : groups.length === 0 ? (
                <p>No groups found.</p>
            ) : (
                <ul className="group-list-sidebar">
                    {groups.map(group => (
                        <li key={group.id} onClick={() => handleViewGroup(group.id)} className="group-list-item-sidebar">
                            <span className="group-name-sidebar">{group.name}</span>
                            <button
                                onClick={(e) => handleJoinGroup(e, group.id, group.name)}
                                className="join-button-sidebar"
                                disabled={joiningGroupId === group.id} 
                            >
                                {joiningGroupId === group.id ? 'Joining...' : 'Join'}
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {showCreateButton && (
                <button onClick={handleCreateGroup} className="create-group-button-sidebar">
                    Create Group
                </button>
            )}

            {showViewAllButton && (
                <div className="view-all-container">
                    <button onClick={handleViewAllGroups} className="view-all-button">
                        View All Groups
                    </button>
                </div>
            )}
        </div>
    );
};

export default AvailableGroups;
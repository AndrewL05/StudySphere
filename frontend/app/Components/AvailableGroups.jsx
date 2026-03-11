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
                const { data: { user } } = await supabase.auth.getUser();
                setCurrentUser(user);

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
        <div className="available-groups-section">
            <h3 className="available-groups-title">{title}</h3>
            {loading ? (
                <div className="available-groups-loading">Loading...</div>
            ) : error ? (
                <div className="available-groups-error">{error}</div>
            ) : groups.length === 0 ? (
                <p className="available-groups-empty">No groups found.</p>
            ) : (
                <div className="available-groups-list">
                    {groups.map(group => (
                        <div key={group.id} className="available-group-item" onClick={() => handleViewGroup(group.id)}>
                            <span className="available-group-name">{group.name}</span>
                            <button
                                onClick={(e) => handleJoinGroup(e, group.id, group.name)}
                                className="available-group-join-btn"
                                disabled={joiningGroupId === group.id}
                            >
                                {joiningGroupId === group.id ? 'Joining...' : 'Join'}
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div className="available-groups-actions">
                {showCreateButton && (
                    <button onClick={handleCreateGroup} className="available-groups-create-btn">
                        Create Group
                    </button>
                )}

                {showViewAllButton && (
                    <button onClick={handleViewAllGroups} className="available-groups-viewall-btn">
                        View All Groups
                    </button>
                )}
            </div>
        </div>
    );
};

export default AvailableGroups;

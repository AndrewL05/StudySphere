import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import supabase from '../../Services/supabaseClient';
import UserName from '../../Components/Username'; 
import './Groups.css'; 
import '../profile/Profile.css'; 

const GroupSettings = () => {
    const { id: groupId } = useParams();
    const navigate = useNavigate();

    const [group, setGroup] = useState(null);
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState('');
    const [currentUser, setCurrentUser] = useState(null);
    const [isCreatorOrAdmin, setIsCreatorOrAdmin] = useState(false);

    const [groupName, setGroupName] = useState('');
    const [description, setDescription] = useState('');
    const [topicsInput, setTopicsInput] = useState('');

    const fetchGroupData = useCallback(async () => {
        setLoading(true);
        setError(null);
        setSuccess('');
        try {
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) {
                navigate('/signin');
                throw new Error("User not authenticated.");
            }
            setCurrentUser(user);

            const { data: groupData, error: groupError } = await supabase
                .from('study_groups')
                .select('*')
                .eq('id', groupId)
                .single();

            if (groupError) throw groupError;
            setGroup(groupData);
            setGroupName(groupData.name);
            setDescription(groupData.description || '');
            setTopicsInput((groupData.topics || []).join(', '));

            const { data: memberData, error: membersError } = await supabase
                .from('group_members')
                .select(`user_id, role, profiles (id, display_name, full_name, avatar_url)`)
                .eq('group_id', groupId);

            if (membersError) throw membersError;
            setMembers(memberData || []);

            const currentUserMembership = memberData.find(m => m.user_id === user.id);
            if (groupData.creator_id === user.id || (currentUserMembership && currentUserMembership.role === 'admin')) {
                setIsCreatorOrAdmin(true);
            } else {
                setError("You don't have permission to manage this group.");
                setIsCreatorOrAdmin(false); 
            }

        } catch (err) {
            console.error("Error fetching group settings data:", err);
            setError(err.message || "Failed to load group data.");
        } finally {
            setLoading(false);
        }
    }, [groupId, navigate]);

    useEffect(() => {
        fetchGroupData();
    }, [fetchGroupData]);

    const processTopics = (inputString) => {
        if (!inputString || !inputString.trim()) return [];
        return inputString.split(',').map(topic => topic.trim()).filter(topic => topic.length > 0);
    };

    const handleUpdateGroupInfo = async (e) => {
        e.preventDefault();
        if (!isCreatorOrAdmin) return;
        setLoading(true);
        setError(null);
        setSuccess('');

        const updatedTopics = processTopics(topicsInput);

        try {
            const { error: updateError } = await supabase
                .from('study_groups')
                .update({
                    name: groupName,
                    description: description,
                    topics: updatedTopics
                    // Add other fields later
                })
                .eq('id', groupId);

            if (updateError) throw updateError;
            setSuccess("Group information updated successfully!");
            // fetchGroupData();
        } catch (err) {
            console.error("Error updating group info:", err);
            setError(err.message || "Failed to update group information.");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteGroup = async () => {
        if (!currentUser || !group || currentUser.id !== group.creator_id) {
            setError("Only the group creator can delete the group.");
            return;
        }
        if (window.confirm(`Are you sure you want to PERMANENTLY DELETE the group "${group.name}"? This action cannot be undone.`)) {
            if (window.confirm(`FINAL WARNING: This will delete all members, posts associated (if you set up cascading deletes or handle it manually), and the group itself. Continue?`)) {
                setLoading(true);
                setError(null);
                try {
                    const { error: deleteError } = await supabase
                        .from('study_groups')
                        .delete()
                        .eq('id', groupId);

                    if (deleteError) throw deleteError;
                    alert("Group deleted successfully.");
                    navigate('/groups'); 
                } catch (err) {
                    console.error("Error deleting group:", err);
                    setError(err.message || "Failed to delete group.");
                    setLoading(false);
                }
            }
        }
    };

    const handleKickMember = async (memberUserId) => {
        if (!isCreatorOrAdmin || !group || memberUserId === group.creator_id) {
            setError("Cannot kick the group creator or insufficient permissions.");
            return;
        }
        const memberToKick = members.find(m => m.user_id === memberUserId);
        if (window.confirm(`Are you sure you want to kick ${memberToKick?.profiles?.display_name || 'this member'} from the group?`)) {
            setLoading(true);
            setError(null);
            setSuccess('');
            try {
                const { error: kickError } = await supabase
                    .from('group_members')
                    .delete()
                    .eq('group_id', groupId)
                    .eq('user_id', memberUserId);
                if (kickError) throw kickError;
                setSuccess("Member kicked successfully.");
                fetchGroupData(); 
            } catch (err) {
                console.error("Error kicking member:", err);
                setError(err.message || "Failed to kick member.");
            } finally {
                setLoading(false);
            }
        }
    };

     const handleUpdateMemberRole = async (memberUserId, newRole) => {
        if (!isCreatorOrAdmin || !group || memberUserId === group.creator_id) {
            setError("Cannot change role of the group creator or insufficient permissions.");
            return;
        }
        setLoading(true);
        setError(null);
        setSuccess('');
        try {
            const { error: roleError } = await supabase
                .from('group_members')
                .update({ role: newRole })
                .eq('group_id', groupId)
                .eq('user_id', memberUserId);
            if (roleError) throw roleError;
            setSuccess("Member role updated successfully.");
            fetchGroupData(); 
        } catch (err) {
            console.error("Error updating member role:", err);
            setError(err.message || "Failed to update member role.");
        } finally {
            setLoading(false);
        }
    };


    if (loading && !group) return <div className="profile-page">Loading group settings...</div>;
    if (error && !isCreatorOrAdmin) return <div className="profile-page error-message">{error} <Link to={`/group/${groupId}`}>Back to Group</Link></div>;
    if (!group || !currentUser) return null;


    return (
        <div className="profile-page create-group-page"> 
            <Link to={`/group/${groupId}`} className="back-link" style={{display: 'block', marginBottom: '1.5rem'}}>&larr; Back to Group</Link>
            <h2>Manage Group: {group.name}</h2>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            {isCreatorOrAdmin && (
                <>
                    <section className="profile-container" style={{marginBottom: '2rem'}}>
                        <h3>Group Information</h3>
                        <form onSubmit={handleUpdateGroupInfo} className="profile-form">
                            <div className="form-group">
                                <label htmlFor="groupName">Group Name</label>
                                <input type="text" id="groupName" value={groupName} onChange={(e) => setGroupName(e.target.value)} required disabled={loading} />
                            </div>
                            <div className="form-group">
                                <label htmlFor="description">Description</label>
                                <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows="4" disabled={loading}></textarea>
                            </div>
                            <div className="form-group">
                                <label htmlFor="topics">Topics (comma-separated)</label>
                                <input type="text" id="topics" value={topicsInput} onChange={(e) => setTopicsInput(e.target.value)} disabled={loading} />
                                <small className="topics-input-hint">Separate topics with a comma (,)</small>
                            </div>
                            <div className="form-actions">
                                <button type="submit" className="save-btn" disabled={loading}>
                                    {loading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </section>

                    <section className="profile-container" style={{marginBottom: '2rem'}}>
                        <h3>Manage Members ({members.length})</h3>
                        <div className="member-management-list">
                            {members.map(member => (
                                <div key={member.user_id} className="member-management-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid var(--border-color-light)'}}>
                                    <div>
                                        <UserName userId={member.user_id} /> ({member.role})
                                    </div>
                                    {member.user_id !== currentUser.id && member.role !== 'creator' && ( 
                                        <div style={{display: 'flex', gap: '0.5rem'}}>
                                            <select
                                                value={member.role}
                                                onChange={(e) => handleUpdateMemberRole(member.user_id, e.target.value)}
                                                disabled={loading || member.user_id === group.creator_id}
                                                style={{padding: '0.3rem', fontSize: '0.8rem'}}
                                            >
                                                <option value="member">Member</option>
                                                <option value="moderator">Moderator</option>
                                                {currentUser.id === group.creator_id && <option value="admin">Admin</option>}
                                            </select>
                                            <button onClick={() => handleKickMember(member.user_id)} className="delete-btn" style={{padding: '0.3rem 0.6rem', fontSize: '0.8rem'}} disabled={loading}>Kick</button>
                                            {/* Add ban button & function here later:
                                            <button onClick={() => handleBanMember(member.user_id)} className="delete-btn" style={{backgroundColor: 'orange'}} disabled={loading}>Ban</button>
                                            */}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>

                    {currentUser.id === group.creator_id && ( 
                        <section className="profile-container danger-zone">
                            <h3>Danger Zone</h3>
                            <p>Permanently delete this group and all its associated data.</p>
                            <button onClick={handleDeleteGroup} className="delete-account-btn" disabled={loading}>
                                {loading ? 'Deleting...' : 'Delete This Group'}
                            </button>
                        </section>
                    )}
                </>
            )}
        </div>
    );
};

export default GroupSettings;
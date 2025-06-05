import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import supabase from '../../Services/supabaseClient';
import GroupHeaderDisplay from '../../Components/GroupHeaderDisplay';
import MemberList from '../../Components/MemberList';
import GroupPostsList from '../../Components/GroupPostsList';
import GroupChat from '../../Components/GroupChat';
import './Groups.css';

const ChatBubbleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
);

const Group = () => {
    const { id: groupId } = useParams();
    const [group, setGroup] = useState(null);
    const [members, setMembers] = useState([]);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [isMember, setIsMember] = useState(false);
    const [isCreator, setIsCreator] = useState(false);
    const [currentUserRole, setCurrentUserRole] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const navigate = useNavigate();

    const [isChatVisible, setIsChatVisible] = useState(false);

    const fetchGroupData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            setCurrentUser(user);

            const { data: groupData, error: groupError } = await supabase
                .from('study_groups')
                .select('*, group_members(count)')
                .eq('id', groupId)
                .single();

            if (groupError) {
                if (groupError.code === 'PGRST116') throw new Error("Group not found");
                throw groupError;
            }
            const actualGroupData = {
                ...groupData,
                member_count: groupData.group_members?.[0]?.count ?? 0
            };
            setGroup(actualGroupData);
            setIsCreator(user && actualGroupData && user.id === actualGroupData.creator_id);

            const { data: memberData, error: membersError } = await supabase
                .from('group_members')
                .select(`
                    user_id,
                    role,
                    profiles ( display_name, full_name, avatar_url )
                `)
                .eq('group_id', groupId);

            if (membersError) throw membersError;
            setMembers(memberData || []);

            if (user && memberData) {
                const currentUserMembership = memberData.find(member => member.user_id === user.id);
                setIsMember(!!currentUserMembership);
                setCurrentUserRole(currentUserMembership ? currentUserMembership.role : null);
            } else {
                setIsMember(false);
                setCurrentUserRole(null);
            }

            const { data: postsData, error: postsError } = await supabase
                .from('posts')
                .select('*, comments(count)')
                .eq('source_group_id', groupId)
                .order('created_at', { ascending: false });

            if (postsError) {
                 console.error("Error fetching posts for group:", postsError);
                 setPosts([]);
            } else {
                setPosts(postsData || []);
            }

        } catch (err) {
            console.error("Error fetching group data:", err);
            setError(err.message || "Failed to load group data.");
            if (err.message === "Group not found") {
                navigate('/not-found');
            }
        } finally {
            setLoading(false);
        }
    }, [groupId, navigate]);

    useEffect(() => {
        fetchGroupData();
    }, [fetchGroupData]);

    const handleJoinGroup = async () => {
        if (!currentUser) {
            alert("Please sign in to join the group.");
            navigate('/signin');
            return;
        }
        setActionLoading(true);
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
                    console.warn("User already a member (insert failed). Refreshing data.");
                } else {
                    throw insertError;
                }
            }
            await fetchGroupData();
        } catch (err) {
            console.error("Error joining group:", err);
            setError("Failed to join group. Please try again.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleLeaveGroup = async () => {
        if (!currentUser) return;
        if (!window.confirm("Are you sure you want to leave this group?")) return;

        setActionLoading(true);
        setError(null);
        try {
            if (isCreator) {
                alert("Creators cannot leave their group. You can delete the group from settings.");
                setActionLoading(false);
                return;
            }
            const { error: deleteError } = await supabase
                .from('group_members')
                .delete()
                .eq('group_id', groupId)
                .eq('user_id', currentUser.id);

            if (deleteError) throw deleteError;
            await fetchGroupData();
        } catch (err) {
            console.error("Error leaving group:", err);
            setError("Failed to leave group. Please try again.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleNavigateToCreatePost = () => {
        navigate('/create', { state: { groupId: groupId, groupName: group?.name } });
    };

    const handleNavigateToSettings = () => {
        navigate(`/group/${groupId}/settings`);
    };

    const formatTimeAgo = (dateString) => {
        if (!dateString) return 'unknown time';
        const now = new Date();
        const postDate = new Date(dateString);
        const diffInSeconds = Math.floor((now - postDate) / 1000);
        if (diffInSeconds < 60) return 'just now';
        const minutes = Math.floor(diffInSeconds / 60);
        if (minutes < 60) return `${minutes} minutes ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} hours ago`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days} days ago`;
        const weeks = Math.floor(days / 7);
        if (weeks < 4) return `${weeks} weeks ago`;
        const months = Math.floor(days / 30);
        if (months < 12) return `${months} months ago`;
        return `${Math.floor(days / 365)} years ago`;
    };

    const toggleChatVisibility = () => {
        setIsChatVisible(prev => !prev);
    };

    if (loading) return <div className="Group-page-container loading">Loading group...</div>; 
    if (error && !group) return <div className="Group-page-container error">{error} <Link to="/groups">Back to All Groups</Link></div>;
    if (!group) return <div className="Group-page-container not-found">Group not found. <Link to="/groups">Back to All Groups</Link></div>;

    return (
        <div className="Group-page-container">
            <div className="Group-page-content">
                {error && !actionLoading && <div className="error-message action-error" style={{ marginBottom: '1rem' }}>{error}</div>}
                <GroupHeaderDisplay
                    group={group}
                    currentUser={currentUser}
                    isMember={isMember}
                    isCreator={isCreator}
                    currentUserRole={currentUserRole}
                    actionLoading={actionLoading}
                    onJoinGroup={handleJoinGroup}
                    onLeaveGroup={handleLeaveGroup}
                    onNavigateToSettings={handleNavigateToSettings}
                    onNavigateToCreatePost={handleNavigateToCreatePost}
                />
                <div className="group-content">
                    <div className="group-main">
                        <GroupPostsList
                            posts={posts}
                            currentUser={currentUser}
                            isMember={isMember}
                            formatTimeAgo={formatTimeAgo}
                        />
                    </div>
                    <div className="group-sidebar">
                        <MemberList members={members} />
                        {group.rules && group.rules.length > 0 && (
                            <div className="group-rules">
                                <h3>Group Rules</h3>
                                <ul className="rules-list">
                                    {group.rules.map((rule, index) => <li key={index}>{rule}</li>)}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {isChatVisible && (
                <GroupChat
                    groupId={groupId}
                    currentUser={currentUser}
                    groupName={group?.name || "Group Chat"}
                    onClose={toggleChatVisibility} 
                />
            )}

            {!isChatVisible && (
                <button
                    onClick={toggleChatVisibility}
                    className="chat-toggle-fab"
                    title="Open Chat"
                >
                    <ChatBubbleIcon />
                </button>
            )}
        </div>
    );
};

export default Group;
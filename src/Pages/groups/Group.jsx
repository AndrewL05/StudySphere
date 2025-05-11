import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router'; 
import supabase from '../../Services/supabaseClient';
import UserName from '../../Components/Username';
import PostCard from '../../Components/PostCard';
import './Groups.css';

const MemberItem = ({ member }) => {
    const displayName = member?.profiles?.display_name || member?.profiles?.full_name || `User-${member.user_id.substring(0, 6)}`;
    const avatarUrl = member?.profiles?.avatar_url;

    return (
        <li key={member.user_id} className="member-item">
            {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="member-avatar" />
            ) : (
                <span className="member-avatar-placeholder">{displayName.charAt(0).toUpperCase()}</span>
            )}
            <span className="member-name">{displayName}</span>
            {member.role === 'creator' && <span className="member-role">(Creator)</span>}
            {member.role === 'admin' && member.role !== 'creator' && <span className="member-role">(Admin)</span>}
        </li>
    );
};

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

    const fetchGroupData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError) console.error("Error fetching user:", userError);
            setCurrentUser(user);

            const { data: groupData, error: groupError } = await supabase
                .from('study_groups')
                .select('*')
                .eq('id', groupId)
                .single();

            if (groupError) {
                if (groupError.code === 'PGRST116') throw new Error("Group not found");
                throw groupError;
            }
            setGroup(groupData);
            setIsCreator(user && groupData && user.id === groupData.creator_id);

            const { data: memberData, error: membersError } = await supabase
                .from('group_members')
                .select(`
                    user_id,
                    role,
                    profiles (
                        display_name,
                        full_name,
                        avatar_url
                    )
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

            const { data: postTags, error: tagsError } = await supabase
                .from('post_group_tags')
                .select('post_id')
                .eq('group_id', groupId);

            if (tagsError) {
                console.warn("Could not fetch post tags for group:", tagsError.message); 
                setPosts([]); 
            } else if (postTags && postTags.length > 0) {
                const postIds = postTags.map(tag => tag.post_id);
                const { data: postsData, error: postsError } = await supabase
                    .from('posts')
                    .select('*, comments(count)') 
                    .in('id', postIds)
                    .order('created_at', { ascending: false });
                if (postsError) throw postsError;
                setPosts(postsData || []);
            } else {
                setPosts([]);
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
    }, [groupId]); 

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

    if (loading) return <div className="Group-page loading">Loading group...</div>;
    if (error && !group) return <div className="Group-page error">{error} <Link to="/groups">Back to All Groups</Link></div>; 
    if (!group) return <div className="Group-page not-found">Group not found. <Link to="/groups">Back to All Groups</Link></div>;


    return (
        <div className="Group-page">
            {error && <div className="error-message action-error" style={{marginBottom: '1rem'}}>{error}</div>} 

            <div className="group-header">
                <div className="group-info">
                    <h2 className="group-title">{group.name}</h2>
                    <p className="group-description">{group.description || "No description provided."}</p>
                    <div className="group-meta">
                        <span>Created by: <UserName userId={group.creator_id} /></span>
                        <span>Members: {members.length}</span>
                        <span>Created: {new Date(group.created_at).toLocaleDateString()}</span>
                         {group.topics && group.topics.length > 0 && (
                            <span>Topics: {group.topics.join(', ')}</span>
                         )}
                    </div>
                </div>
                <div className="group-actions">
                    {currentUser && (
                        isMember ? (
                            <button
                                onClick={handleLeaveGroup}
                                className="leave-group-btn"
                                disabled={actionLoading || isCreator}
                                title={isCreator ? "Creators must manage group via settings" : "Leave this group"}
                            >
                                {actionLoading ? 'Leaving...' : 'Leave Group'}
                            </button>
                        ) : (
                            <button
                                onClick={handleJoinGroup}
                                className="join-group-btn"
                                disabled={actionLoading}
                            >
                                {actionLoading ? 'Joining...' : 'Join Group'}
                            </button>
                        )
                    )}
                    {!currentUser && (
                        <button onClick={() => navigate('/signin')} className="join-group-btn">
                            Sign in to Join
                        </button>
                    )}
                    {(isCreator || currentUserRole === 'admin') && (
                        <Link to={`/group/${groupId}/settings`} className="settings-group-btn">
                            Settings
                        </Link>
                    )}
                </div>
            </div>

            <div className="group-content">
                <div className="group-main">
                    <h3>Posts in this Group</h3>
                    {posts.length === 0 ? (
                        <p className="no-posts-in-group">
                            No posts have been tagged to this group yet.
                            {isMember && " Why not create one?"}
                        </p>
                    ) : (
                        <div className="posts-list" style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
                            {posts.map((post) => (
                                <PostCard
                                    key={post.id}
                                    id={post.id}
                                    title={post.title}
                                    content={post.content || ''}
                                    image={post.image_url}
                                    authorId={post.user_id}
                                    time={formatTimeAgo(post.created_at)}
                                    upvotesNum={post.upvotes || 0}
                                    commentCount={post.comments?.[0]?.count ?? 0}
                                    userId={currentUser?.id}
                                />
                            ))}
                        </div>
                    )}
                </div>

                <div className="group-sidebar">
                    <div className="group-members">
                        <h3>Members ({members.length})</h3>
                        {members.length > 0 ? (
                            <ul className="member-list">
                                {members.map(member => (
                                    <MemberItem key={member.user_id} member={member} />
                                ))}
                            </ul>
                        ) : (
                            <p>No members yet.</p>
                        )}
                    </div>
                    {/* add more sections to the sidebar later */}
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
    );
};

export default Group;
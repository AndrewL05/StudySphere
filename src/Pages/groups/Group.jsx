import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router'; 
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
                <span className="member-avatar-placeholder">{displayName.charAt(0)}</span> // Placeholder Circle
            )}
            <span className="member-name">{displayName}</span>
            {member.role === 'admin' && <span className="member-role">(Admin)</span>}
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
    const [actionLoading, setActionLoading] = useState(false); 
    const navigate = useNavigate();

    const fetchGroupData = useCallback(async () => {
        setError(null);
        try {
            // Get current user first
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError) console.error("Error fetching user:", userError);
            setCurrentUser(user); 

            // Fetch group details
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

            // Fetch members and their profiles in one go using a join
            // Note: Ensure RLS allows logged-in users to read profiles
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

            // Check if the current user is a member
            if (user && memberData) {
                setIsMember(memberData.some(member => member.user_id === user.id));
            } else {
                setIsMember(false);
            }

            // Fetch posts associated with the group 
            const { data: postTags, error: tagsError } = await supabase
                .from('post_group_tags')
                .select('post_id')
                .eq('group_id', groupId);
            if (tagsError) throw tagsError;

            if (postTags && postTags.length > 0) {
                const postIds = postTags.map(tag => tag.post_id);
                const { data: postsData, error: postsError } = await supabase
                    .from('posts')
                    .select('*')
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
    }, [groupId, navigate]); 

    useEffect(() => {
        setLoading(true); 
        fetchGroupData();
    }, [groupId, fetchGroupData]); 

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

        if (!window.confirm("Are you sure you want to leave this group?")) {
            return;
        }

        setActionLoading(true);
        setError(null);
        try {
            const { error: deleteError } = await supabase
                .from('group_members')
                .delete()
                .eq('group_id', groupId)
                .eq('user_id', currentUser.id);

            if (deleteError) throw deleteError;

            // Refetch data to update member list and status
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
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
        if (diffInSeconds < 2629800) return `${Math.floor(diffInSeconds / 604800)} weeks ago`;
        if (diffInSeconds < 31557600) return `${Math.floor(diffInSeconds / 2629800)} months ago`;
        return `${Math.floor(diffInSeconds / 31557600)} years ago`;
    };

    if (loading) return <div className="Group-page loading">Loading group...</div>;
    if (error && !group) return <div className="Group-page error">{error}</div>;

    return (
        <div className="Group-page">
            {error && <div className="error-message action-error">{error}</div>}

            <div className="group-header">
                <div className="group-info">
                    <h2 className="group-title">{group?.name}</h2>
                    <p className="group-description">Description: {group?.description}</p>
                    <div className="group-meta">
                         <span>Created by: <UserName userId={group?.creator_id} /></span>
                         <span>Members: {members.length}</span>
                         <span>Created: {new Date(group?.created_at).toLocaleDateString()}</span> 
                    </div>
                </div>
                <div className="group-actions">
                    {currentUser && ( 
                        isMember ? (
                            <button
                                onClick={handleLeaveGroup}
                                className="leave-group-btn"
                                disabled={actionLoading || isCreator} 
                                title={isCreator ? "Creators cannot leave their group" : "Leave this group"}
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
                     {isCreator && (
                        <button onClick={() => alert('Group settings not implemented')} className="settings-group-btn">
                            Settings
                        </button>
                     )}
                </div>
            </div>

            <div className="group-content">
                <div className="group-main">
                    <h3>Posts in this Group</h3>
                    {posts.length === 0 ? (
                        <p className="no-posts-in-group">No posts have been added to this group yet.</p>
                    ) : (
                        <div className="posts-list">
                            {posts.map((post) => (
                                <div key={post.id} onClick={() => navigate(`/post/${post.id}`)} style={{ cursor: 'pointer' }}>
                                    <PostCard
                                        id={post.id}
                                        title={post.title}
                                        content={post.content || ''}
                                        image={post.image_url}
                                        authorId={post.user_id}
                                        time={formatTimeAgo(post.created_at)}
                                        upvotesNum={post.upvotes || 0}
                                        userId={currentUser?.id}
                                    />
                                </div>
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
                     {/* Add Group Rules Section (Example) */}
                     {/* <div className="group-rules">
                        <h3>Group Rules</h3>
                        <ul className="rules-list">
                           {group?.rules ? (
                                group.rules.map((rule, index) => <li key={index}>{rule}</li>)
                            ) : (
                                <li>Be respectful.</li>
                                <li>Stay on topic.</li>
                                // Add default rules or fetch from DB
                            )}
                        </ul>
                    </div> */}
                </div>
            </div>
        </div>
    );
};

export default Group;
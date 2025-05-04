import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router'; // Use react-router-dom
import supabase from '../../Services/supabaseClient';
import UserName from '../../Components/Username';
import PostCard from '../../Components/PostCard';
import './Groups.css';

const Group = () => {
    const { id } = useParams(); // Get group ID from route
    const [group, setGroup] = useState(null);
    const [members, setMembers] = useState([]);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentUser, setCurrentUser] = useState(null); // For PostCard userId prop
    const navigate = useNavigate(); // Added navigate hook

    // --- Helper function for time formatting (copy from Home.jsx or Post.jsx) ---
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
    // --- End Helper function ---


    useEffect(() => {
        const fetchGroupData = async () => {
            setLoading(true);
            setError(null);
            try {
                // Get current user for PostCard and checks
                const { data: { user }, error: userError } = await supabase.auth.getUser();
                 if (userError) {
                    console.error("Error fetching user:", userError);
                    // Handle appropriately, maybe redirect or show message
                 }
                setCurrentUser(user);

                // Fetch group details
                const { data: groupData, error: groupError } = await supabase
                    .from('study_groups')
                    .select('*')
                    .eq('id', id)
                    .single();
                if (groupError) {
                    // Handle case where group doesn't exist or other errors
                    if (groupError.code === 'PGRST116') { // Not found code
                         throw new Error("Group not found");
                    }
                    throw groupError;
                 }
                // No need for: if (!groupData) throw new Error("Group not found"); (handled by .single() error)
                setGroup(groupData);

                // Fetch members - *** FIX IS HERE ***
                // Select only columns from group_members directly
                const { data: memberLinks, error: membersError } = await supabase
                    .from('group_members')
                    .select('user_id, role') // REMOVED: profiles(...)
                    .eq('group_id', id);

                if (membersError) throw membersError;
                setMembers(memberLinks || []); // Set the members state with user_id and role

                // Fetch tagged posts (IDs first)
                const { data: postTags, error: tagsError } = await supabase
                    .from('post_group_tags')
                    .select('post_id')
                    .eq('group_id', id);
                if (tagsError) throw tagsError;

                if (postTags && postTags.length > 0) {
                    const postIds = postTags.map(tag => tag.post_id);
                    // Fetch post details for tagged posts
                    const { data: postsData, error: postsError } = await supabase
                        .from('posts')
                        .select('*')
                        .in('id', postIds)
                        .order('created_at', { ascending: false });
                    if (postsError) throw postsError;
                    setPosts(postsData || []);
                } else {
                    setPosts([]); // No posts tagged for this group
                }

            } catch (err) {
                console.error("Error fetching group data:", err); // Log the actual error object
                setError(err.message || "Failed to load group data.");
                 // Optional: Redirect if group not found
                 if (err.message === "Group not found") {
                    // Consider navigating away or showing a specific "Not Found" message
                    // navigate('/groups' or '/not-found'); // Example
                 }
            } finally {
                setLoading(false);
            }
        };

        fetchGroupData();
    }, [id, navigate]); // Added navigate to dependency array


    if (loading) return <div className="Group-page loading">Loading group...</div>;
    if (error) return <div className="Group-page error">{error}</div>; // Display specific error
    // Removed the !group check as it's handled by the error state now

    return (
        <div className="Group-page">
            <div className="group-header">
                <div className="group-info">
                    {/* Check if group exists before accessing properties */}
                    <h2 className="group-title">{group?.name}</h2>
                    <p className="group-description">{group?.description}</p>
                    {/* Add creator info if needed - requires fetching creator profile */}
                    {/* Example: {group && <p>Created by: <UserName userId={group.creator_id} /></p>} */}
                </div>
                {/* Add Join/Leave buttons here later */}
            </div>

            <div className="group-content">
                <div className="group-main">
                    <h3>Posts in this Group</h3>
                    {posts.length === 0 ? (
                        <p>No posts have been added to this group yet.</p>
                    ) : (
                        posts.map((post) => (
                            <div key={post.id} onClick={() => navigate(`/post/${post.id}`)} style={{ cursor: 'pointer' }}>
                                <PostCard
                                    id={post.id}
                                    title={post.title}
                                    content={post.content || ''}
                                    image={post.image_url}
                                    authorId={post.user_id}
                                    time={formatTimeAgo(post.created_at)}
                                    upvotesNum={post.upvotes || 0}
                                    userId={currentUser?.id} // Pass current user ID
                                />
                            </div>
                        ))
                    )}
                </div>

                <div className="group-sidebar">
                    <div className="group-members">
                         {/* Check if members array exists before accessing length */}
                        <h3>Members ({members?.length || 0})</h3>
                        <ul className="member-list">
                            {/* Check if members array exists before mapping */}
                            {members?.map(member => (
                                <li key={member.user_id} className="member-item">
                                    {/* UserName component handles fetching profile */}
                                    <UserName userId={member.user_id} />
                                    {/* Optionally display role */}
                                    {/* <span style={{fontSize: '0.8em', color: 'grey'}}> ({member.role})</span> */}
                                </li>
                            ))}
                        </ul>
                    </div>
                    {/* Add Group Rules or other sidebar content here */}
                </div>
            </div>

            {/* --- Optional Chat Component --- */}
            {/* <GroupChat groupId={id} currentUser={currentUser} /> */}

        </div>
    );
};

export default Group;

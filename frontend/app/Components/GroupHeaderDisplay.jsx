import React from 'react';
import { Link } from 'react-router'; 
import UserName from './Username'; 

const GroupHeaderDisplay = ({
    group,
    currentUser,
    isMember,
    isCreator,
    currentUserRole,
    actionLoading,
    onJoinGroup,
    onLeaveGroup,
    onNavigateToSettings,
    onNavigateToCreatePost
}) => {
    if (!group) return null;

    return (
        <div className="group-header">
            <div className="group-info">
                <h2 className="group-title">{group.name}</h2>
                <p className="group-description">{group.description || "No description provided."}</p>
                <div className="group-meta">
                    <span>Created by: <UserName userId={group.creator_id} /></span>
                    <span>Members: {group.member_count || 0}</span> 
                    <span>Created: {new Date(group.created_at).toLocaleDateString()}</span>
                    {group.topics && group.topics.length > 0 && (
                        <span>Topics: {group.topics.join(', ')}</span>
                    )}
                </div>
            </div>
            <div className="group-actions">
                {isMember && currentUser && (
                    <button
                        onClick={onNavigateToCreatePost}
                        className="create-post-in-group-btn"
                        style={{ backgroundColor: 'var(--primary-light)', color: 'var(--background-dark)', border: 'none' }}
                        disabled={actionLoading}
                    >
                        Create Post in Group
                    </button>
                )}
                {currentUser && (
                    isMember ? (
                        <button
                            onClick={onLeaveGroup}
                            className="leave-group-btn"
                            disabled={actionLoading || isCreator}
                            title={isCreator ? "Creators must manage group via settings" : "Leave this group"}
                        >
                            {actionLoading ? 'Leaving...' : 'Leave Group'}
                        </button>
                    ) : (
                        <button
                            onClick={onJoinGroup}
                            className="join-group-btn"
                            disabled={actionLoading}
                        >
                            {actionLoading ? 'Joining...' : 'Join Group'}
                        </button>
                    )
                )}
                {!currentUser && (
                    <Link to="/signin">
                        <button className="join-group-btn">
                            Sign in to Join
                        </button>
                    </Link>
                )}
                {(isCreator || currentUserRole === 'admin') && (
                    <button onClick={onNavigateToSettings} className="settings-group-btn">
                        Settings
                    </button>
                )}
            </div>
        </div>
    );
};

export default GroupHeaderDisplay;
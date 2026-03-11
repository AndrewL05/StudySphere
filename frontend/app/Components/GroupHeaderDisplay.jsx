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
            <h2 className="group-header-name">{group.name}</h2>
            <p className="group-header-desc">{group.description || "No description provided."}</p>
            <div className="group-header-meta">
                <span>Created by: <UserName userId={group.creator_id} /></span>
                <span>{group.member_count || 0} members</span>
                <span>Created: {new Date(group.created_at).toLocaleDateString()}</span>
            </div>
            {group.topics && group.topics.length > 0 && (
                <div className="group-header-topics">
                    {group.topics.map(topic => <span key={topic} className="topic-tag">{topic}</span>)}
                </div>
            )}
            <div className="group-header-actions">
                {isMember && currentUser && (
                    <button
                        onClick={onNavigateToCreatePost}
                        className="group-create-post-btn"
                        disabled={actionLoading}
                    >
                        Create Post in Group
                    </button>
                )}
                {currentUser && (
                    isMember ? (
                        <button
                            onClick={onLeaveGroup}
                            className="group-leave-btn"
                            disabled={actionLoading || isCreator}
                            title={isCreator ? "Creators must manage group via settings" : "Leave this group"}
                        >
                            {actionLoading ? 'Leaving...' : 'Leave Group'}
                        </button>
                    ) : (
                        <button
                            onClick={onJoinGroup}
                            className="group-join-btn"
                            disabled={actionLoading}
                        >
                            {actionLoading ? 'Joining...' : 'Join Group'}
                        </button>
                    )
                )}
                {!currentUser && (
                    <Link to="/signin">
                        <button className="group-join-btn">
                            Sign in to Join
                        </button>
                    </Link>
                )}
                {(isCreator || currentUserRole === 'admin') && (
                    <button onClick={onNavigateToSettings} className="group-settings-btn">
                        Settings
                    </button>
                )}
            </div>
        </div>
    );
};

export default GroupHeaderDisplay;

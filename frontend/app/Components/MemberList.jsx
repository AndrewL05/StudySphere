import React from 'react';
import UserName from './Username';
import '../Pages/groups/Groups.css'

const MemberItem = ({ member }) => {
    const displayName = member?.profiles?.display_name || member?.profiles?.full_name || `User-${member.user_id.substring(0, 6)}`;
    const avatarUrl = member?.profiles?.avatar_url;

    return (
        <li className="member-item">
            {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="member-avatar" />
            ) : (
                <span className="member-avatar-placeholder">{displayName.charAt(0).toUpperCase()}</span>
            )}
            <span className="member-name">{displayName}</span>
            {member.role === 'creator' && <span className="member-role">Creator</span>}
            {member.role === 'admin' && member.role !== 'creator' && <span className="member-role">Admin</span>}
        </li>
    );
};

const MemberList = ({ members }) => {
    return (
        <div className="members-section">
            <h3 className="members-title">Members ({members.length})</h3>
            {members.length > 0 ? (
                <ul className="members-list">
                    {members.map(member => (
                        <MemberItem key={member.user_id} member={member} />
                    ))}
                </ul>
            ) : (
                <p className="chat-system-message">No members yet.</p>
            )}
        </div>
    );
};

export default MemberList;

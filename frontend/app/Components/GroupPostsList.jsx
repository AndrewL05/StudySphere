import React from 'react';
import PostCard from './PostCard';

const GroupPostsList = ({ posts, currentUser, isMember, formatTimeAgo }) => {
    return (
        <div className="group-posts-section">
            <h3 className="group-posts-title">Posts in this Group</h3>
            {posts.length === 0 ? (
                <div className="feed-empty">
                    <p>No posts have been tagged to this group yet.{isMember && " Why not create one?"}</p>
                </div>
            ) : (
                <div className="group-posts-list">
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
    );
};

export default GroupPostsList;

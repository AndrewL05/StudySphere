import React from 'react';
import { useState } from 'react';
import '../App.css';

const PostCard = ({ title, content, image = null, upvotesNum = 0, author = "Anonymous", time = "just now" }) => { // pull upvotes, time, author/user, etc from database
    const [upvoted, setUpvoted] = useState(false);
    
    const handleUpvote = (e) => {
        e.stopPropagation();
        setUpvoted(!upvoted);
    };

    return (
        <div className="post-cards">
            <div className="post-header">
                <span className="post-author">{author}</span>
                <span className="post-time">• Posted {time} ago</span>
            </div>
            
            <h4>{title}</h4>
            
            {content && <p className="post-content">{content}</p>}
            
            {image && (
                <div className="post-image">
                    <img src={image} alt={title} />
                </div>
            )}
            
            <div className="post-actions">
                <button 
                    className={`upvote-btn ${upvoted ? 'upvoted' : ''}`}
                    onClick={handleUpvote}
                >
                    ↑ {upvotesNum + (upvoted ? 1 : 0)}
                </button>
                <button className="comment-btn">
                    💬 Comment
                </button>
                <button className="share-btn">
                    Share
                </button>
            </div>
        </div>
    );
};

export default PostCard;
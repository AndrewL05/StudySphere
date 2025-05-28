import React from 'react';
import { Link } from 'react-router';

const NotFound = () => {
    return (
        <div className="not-found">
            <h1>404</h1>
            <p>Oops! The page you're looking for doesn't exist.</p>
            <Link to="/">Go back to Home</Link>
        </div>
    );
};

export default NotFound;
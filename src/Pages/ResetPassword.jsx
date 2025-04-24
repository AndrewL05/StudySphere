import React, { useState } from 'react';
import { Link } from 'react-router';
import '../App.css';

const ResetPassword = () => {
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        // Add password reset logic 

        console.log('Reset password for:', email);
        setSubmitted(true);
    };

    if (submitted) {
        return (
            <div className="auth-page">
                <div className="auth-container">
                    <div className="auth-logo">
                        <h2>StudySphere</h2>
                        <p>Your academic community</p>
                    </div>
                    
                    <div className="reset-confirmation">
                        <h2>Check Your Email</h2>
                        <p>We've sent password reset instructions to <strong>{email}</strong></p>
                        <p>Didn't receive an email? Check your spam folder or <button onClick={() => setSubmitted(false)} className="text-button">try again</button>.</p>
                        
                        <div className="auth-links">
                            <Link to="/signin" className="back-to-signin">Back to Sign In</Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-logo">
                    <h2>StudySphere</h2>
                    <p>Your academic community</p>
                </div>
                
                <h2>Reset Password</h2>
                <p className="reset-instructions">Enter your email address and we'll send you instructions to reset your password.</p> 
                
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email"
                            required
                        />
                    </div>
                    
                    <button type="submit" className="auth-button">Send Reset Link</button>
                    
                    <div className="auth-links">
                        <Link to="/signin" className="back-to-signin">Back to Sign In</Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ResetPassword;
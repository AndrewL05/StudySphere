import React, { useState } from 'react';
import { Link } from 'react-router';
import supabase from '../../Services/supabaseClient';
import './Auth.css';

const ResetPassword = () => {
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + '/reset-password-confirm',
            });

            if (error) {
                throw error;
            }

            setSubmitted(true);
        } catch (err) {
            console.error('Error sending reset email:', err);
            setError(err.message || 'Failed to send reset email. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="auth-standalone">
                <div className="auth-card">
                    <div className="auth-card-logo">
                        <span className="logo-accent">S</span>tudySphere
                    </div>
                    <h2 className="auth-card-heading">Check Your Email</h2>
                    <p className="auth-card-text">We've sent password reset instructions to <strong>{email}</strong></p>
                    <p className="auth-card-text">Didn't receive an email? Check your spam folder or <button onClick={() => setSubmitted(false)} className="auth-link-accent" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>try again</button></p>
                    <div className="auth-card-links">
                        <Link to="/signin" className="auth-link-accent">Back to Sign In</Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-standalone">
            <div className="auth-card">
                <div className="auth-card-logo">
                    <span className="logo-accent">S</span>tudySphere
                </div>
                <h2 className="auth-card-heading">Reset Password</h2>
                <p className="auth-card-text">Enter your email address and we'll send you instructions to reset your password.</p>

                {error && <div className="auth-error">{error}</div>}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="auth-field">
                        <label htmlFor="email">Email</label>
                        <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" required />
                    </div>
                    <button type="submit" className="auth-submit-btn" disabled={loading}>
                        {loading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                </form>

                <div className="auth-card-links">
                    <Link to="/signin" className="auth-link-accent">Back to Sign In</Link>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
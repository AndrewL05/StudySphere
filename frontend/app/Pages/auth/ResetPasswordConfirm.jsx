import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import supabase from '../../Services/supabaseClient';
import './Auth.css';

const ResetPasswordConfirm = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const validateSession = async () => {
            const { data: { user }, error } = await supabase.auth.getUser();
            
            if (error || !user) {
                setError('Invalid password reset session. The link may have expired.');
            }
        };

        validateSession();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.updateUser({
                password,
            });

            if (error) {
                throw error;
            }

            setSuccess(true);
            
            setTimeout(() => {
                navigate('/signin');
            }, 3000);
        } catch (err) {
            console.error('Error updating password:', err);
            setError(err.message || 'Failed to update password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-standalone">
            <div className="auth-card">
                <div className="auth-card-logo">
                    <span className="logo-accent">S</span>tudySphere
                </div>
                <h2 className="auth-card-heading">Reset Your Password</h2>

                {error && <div className="auth-error">{error}</div>}
                {success && <div className="auth-success">Password successfully updated! Redirecting to login...</div>}

                {!success && (
                    <form onSubmit={handleSubmit} className="auth-form">
                        <div className="auth-field">
                            <label htmlFor="password">New Password</label>
                            <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your new password" required />
                        </div>
                        <div className="auth-field">
                            <label htmlFor="confirmPassword">Confirm Password</label>
                            <input type="password" id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm your new password" required />
                        </div>
                        <button type="submit" className="auth-submit-btn" disabled={loading}>
                            {loading ? 'Updating...' : 'Update Password'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ResetPasswordConfirm;
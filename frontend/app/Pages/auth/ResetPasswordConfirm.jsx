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
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-logo">
                    <h2>StudySphere</h2>
                    <p>Your academic community</p>
                </div>

                <h2>Reset Your Password</h2>
                
                {error && <div className="error-message">{error}</div>}
                {success && <div className="success-message">
                    Password successfully updated! Redirecting to login page...
                </div>}

                {!success && (
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="password">New Password</label>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your new password"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="confirmPassword">Confirm Password</label>
                            <input
                                type="password"
                                id="confirmPassword"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm your new password"
                                required
                            />
                        </div>

                        <button type="submit" className="auth-button" disabled={loading}>
                            {loading ? 'Updating...' : 'Update Password'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ResetPasswordConfirm;
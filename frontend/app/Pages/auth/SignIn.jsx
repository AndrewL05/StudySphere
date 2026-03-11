import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import supabase from '../../Services/supabaseClient';
import './Auth.css';

const SignIn = () => { 
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage("");
        setLoading(true);

        try {
            const {data, error} = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) {
                throw error;
            }
            
            navigate("/");
        } catch (err) {
            setMessage(err.message || "Login failed. Please check your credentials.");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
            });
            
            if (error) throw error;
        } catch (err) {
            console.error("Google Login Error:", err.message);
            setMessage("Failed to login with Google. Please try again.");
        }
    };

    return (
        <div className="auth-standalone">
            <div className="auth-card">
                <div className="auth-card-logo">
                    <span className="logo-accent">S</span>tudySphere
                </div>
                <h2 className="auth-card-heading">Sign In</h2>

                <button className="auth-google-btn" onClick={handleGoogleLogin} type="button">
                    <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google" width="18" height="18" />
                    Continue with Google
                </button>

                <div className="auth-divider"><span>or</span></div>

                {message && <div className="auth-error">{message}</div>}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="auth-field">
                        <label htmlFor="email">Email</label>
                        <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" required />
                    </div>
                    <div className="auth-field">
                        <label htmlFor="password">Password</label>
                        <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required />
                    </div>
                    <button type="submit" className="auth-submit-btn" disabled={loading}>
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <div className="auth-card-links">
                    <Link to="/reset-password" className="auth-link-muted">Forgot password?</Link>
                    <p className="auth-link-prompt">Don't have an account? <Link to="/signup" className="auth-link-accent">Sign Up</Link></p>
                </div>
            </div>
        </div>
    );
};

export default SignIn;
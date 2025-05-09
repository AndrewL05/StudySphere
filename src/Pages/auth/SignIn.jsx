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
        <div className="auth-page">
            <div className="auth-container">
                <Link to="/" className="back-to-home-link-corner">
                    &larr; Home 
                </Link>
                <div className="auth-logo">
                    <h2>StudySphere</h2>
                    <p>Your academic community</p>
                </div>
                
                <h2>Sign In</h2>
                
                <button className="google-login-btn" onClick={handleGoogleLogin}>
                    <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google logo" className='google-logo'/>
                    Log in with Google
                </button> 
                <br/>
                {message && <div className="error-message">{message}</div>}
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
                    
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            required
                        />
                    </div>
                    
                    <button type="submit" className="auth-button" disabled={loading}>
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                
                    <div className="auth-links">
                        <Link to="/reset-password" className="forgot-password">Forgot password?</Link>
                        <div className="signup-prompt">
                            Don't have an account? <Link to="/signup">Sign Up</Link>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SignIn;
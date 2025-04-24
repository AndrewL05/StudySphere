import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import supabase from '../Services/supabaseClient';
import '../App.css';

const SignIn = () => { 
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage("");

        const {data, error} = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            setMessage(error.message);
            return;
        } else {
            navigate("/");
            return null;
        }

        setEmail("");
        setPassword("");
    };

    const handleGoogleLogin = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
        });
        if (error) console.error("Google Login Error:", error.message);
    };

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-logo">
                    <h2>StudySphere</h2>
                    <p>Your academic community</p>
                </div>
                
                <h2>Sign In</h2>
                
                <button className="google-login-btn" onClick={handleGoogleLogin}>
                    <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google logo" className='google-logo'/>
                    Log in with Google
                </button> 

                {message && <span className='message'>{message}</span>}
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
                    
                    <button type="submit" className="auth-button">Sign In</button>
                
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
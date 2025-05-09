import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router'; 
import supabase from '../../Services/supabaseClient';
import './Auth.css';

const SignUp = () => {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false); 
    const navigate = useNavigate(); 

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage("");
        setLoading(true); 

        try {
            console.log("Signing up user:", { email, name });

            const { data, error: signUpError } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: { 
                        displayName: name,
                    }
                }
            });

            if (signUpError) {
                console.error("Signup error:", signUpError);
                setMessage(signUpError.message || "Failed to create account."); 
                setLoading(false);
                return;
            }

            console.log("User created successfully in auth.users:", data);

            setMessage("Account successfully created! Redirecting...");
            setName("");
            setEmail("");
            setPassword("");
            setTimeout(() => navigate('/'), 2000);
        } catch (err) {
            console.error("Signup process error:", err);
            setMessage("An unexpected error occurred. Please try again.");
        } finally {
            setLoading(false); 
        }
    };

    const handleGoogleLogin = async () => {
        setMessage(""); 
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
        });
        if (error) {
            console.error("Google Login Error:", error.message);
            setMessage("Failed to sign in with Google. Please try again.");
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

                <h2>Create Account</h2>

                <button className="google-login-btn" onClick={handleGoogleLogin} disabled={loading}>
                    <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google logo" className='google-logo'/>
                    Sign up with Google
                </button>

                <div className="auth-divider">OR</div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="name">Name</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter your name"
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email"
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Create a password (min. 6 characters)"
                            required
                            minLength={6} 
                            disabled={loading}
                        />
                    </div>

                {message && (
                    <div className={`message ${message.toLowerCase().includes("error") || message.toLowerCase().includes("failed") ? 'error-message' : 'success-message'}`}>
                        {message}
                    </div>
                )}

                    <button type="submit" className="auth-button" disabled={loading}>
                        {loading ? 'Creating Account...' : 'Sign Up'}
                    </button>

                    <div className="auth-links">
                        <div className="signin-prompt">
                            Already have an account? <Link to="/signin">Sign In</Link>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SignUp;

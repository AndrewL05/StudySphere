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
        <div className="auth-standalone">
            <div className="auth-card">
                <div className="auth-card-logo">
                    <span className="logo-accent">S</span>tudySphere
                </div>
                <h2 className="auth-card-heading">Create Account</h2>

                <button className="auth-google-btn" onClick={handleGoogleLogin} type="button" disabled={loading}>
                    <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google" width="18" height="18" />
                    Continue with Google
                </button>

                <div className="auth-divider"><span>or</span></div>

                {message && (
                    <div className={message.toLowerCase().includes('success') || message.toLowerCase().includes('created') ? 'auth-success' : 'auth-error'}>
                        {message}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="auth-field">
                        <label htmlFor="name">Name</label>
                        <input type="text" id="name" name="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name" required disabled={loading} />
                    </div>
                    <div className="auth-field">
                        <label htmlFor="email">Email</label>
                        <input type="email" id="email" name="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" required disabled={loading} />
                    </div>
                    <div className="auth-field">
                        <label htmlFor="password">Password</label>
                        <input type="password" id="password" name="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a password (min. 6 characters)" required minLength={6} disabled={loading} />
                    </div>
                    <button type="submit" className="auth-submit-btn" disabled={loading}>
                        {loading ? 'Creating Account...' : 'Sign Up'}
                    </button>
                </form>

                <div className="auth-card-links">
                    <p className="auth-link-prompt">Already have an account? <Link to="/signin" className="auth-link-accent">Sign In</Link></p>
                </div>
            </div>
        </div>
    );
};

export default SignUp;

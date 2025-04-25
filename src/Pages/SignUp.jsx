import React, { useState } from 'react';
import { Link } from 'react-router';
import supabase from '../Services/supabaseClient';
import '../App.css';

const SignUp = () => {
    const [name, setName] = useState(""); 
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage("");
    
        try {
            console.log("Signing up user:", { email, name });
            
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        displayName: name
                    }
                }
            });
    
            if (error) {
                console.error("Signup error:", error);
                setMessage(error.message);
                return;
            }
    
            console.log("User created successfully:", data);
    
            // Create the profile entry
            if (data && data.user) {
                console.log("Creating profile for user:", data.user.id);
                
                const { error: profileError } = await supabase
                    .from('profiles')
                    .insert([
                        { 
                            id: data.user.id,
                            display_name: name,
                            full_name: name,
                            avatar_url: null
                        }
                    ]);
    
                if (profileError) {
                    console.error("Error creating profile:", profileError);
                    setMessage("Account created but profile setup failed. Please update your profile later.");
                } else {
                    console.log("Profile created successfully");
                    setMessage("Account successfully created! Check your email to confirm your account.");
                }
            }
    
            setName("");
            setEmail("");
            setPassword("");
        } catch (err) {
            console.error("Signup process error:", err);
            setMessage("An unexpected error occurred. Please try again.");
        }
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
                
                <h2>Create Account</h2>
                
                <button className="google-login-btn" onClick={handleGoogleLogin}>
                    <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google logo" className='google-logo'/>
                    Log in with Google
                </button>
                <br/>
                {message && <span className='message'>{message}</span>}
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
                            placeholder="Create a password"
                            required
                        />
                    </div>
                    
                    <button type="submit" className="auth-button">Sign Up</button>
                    
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
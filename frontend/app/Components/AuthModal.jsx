import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import supabase from '../Services/supabaseClient';
import './AuthModal.css';

const AuthModal = ({ isOpen, onClose, initialTab = 'signin' }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(initialTab);

  // Sign In state
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signInMessage, setSignInMessage] = useState('');
  const [signInLoading, setSignInLoading] = useState(false);

  // Sign Up state
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpMessage, setSignUpMessage] = useState('');
  const [signUpLoading, setSignUpLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Close on ESC
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSignIn = async (e) => {
    e.preventDefault();
    setSignInMessage('');
    setSignInLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: signInEmail,
        password: signInPassword,
      });
      if (error) throw error;
      onClose();
      navigate('/');
    } catch (err) {
      setSignInMessage(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setSignInLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setSignUpMessage('');
    setSignUpLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: signUpEmail,
        password: signUpPassword,
        options: { data: { displayName: signUpName } },
      });
      if (error) throw error;
      setSignUpMessage('Account created! Redirecting...');
      setTimeout(() => {
        onClose();
        navigate('/');
      }, 2000);
    } catch (err) {
      setSignUpMessage(err.message || 'Failed to create account.');
    } finally {
      setSignUpLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) {
      const msg = 'Failed to sign in with Google. Please try again.';
      activeTab === 'signin' ? setSignInMessage(msg) : setSignUpMessage(msg);
    }
  };

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="auth-modal-close" onClick={onClose} aria-label="Close">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <div className="auth-modal-logo">
          <span className="logo-accent">S</span>tudySphere
        </div>

        <div className="auth-modal-tabs">
          <button
            className={`auth-tab ${activeTab === 'signin' ? 'active' : ''}`}
            onClick={() => setActiveTab('signin')}
          >
            Sign In
          </button>
          <button
            className={`auth-tab ${activeTab === 'signup' ? 'active' : ''}`}
            onClick={() => setActiveTab('signup')}
          >
            Sign Up
          </button>
        </div>

        {activeTab === 'signin' ? (
          <form onSubmit={handleSignIn} className="auth-modal-form">
            <button type="button" className="auth-google-btn" onClick={handleGoogleAuth}>
              <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google" width="18" height="18" />
              Continue with Google
            </button>

            <div className="auth-divider"><span>or</span></div>

            {signInMessage && <div className="auth-error">{signInMessage}</div>}

            <div className="auth-field">
              <label htmlFor="modal-signin-email">Email</label>
              <input
                id="modal-signin-email"
                type="email"
                value={signInEmail}
                onChange={(e) => setSignInEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="modal-signin-password">Password</label>
              <input
                id="modal-signin-password"
                type="password"
                value={signInPassword}
                onChange={(e) => setSignInPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>

            <button type="submit" className="auth-submit-btn" disabled={signInLoading}>
              {signInLoading ? 'Signing in...' : 'Sign In'}
            </button>

            <a href="/reset-password" className="auth-forgot-link">Forgot password?</a>
          </form>
        ) : (
          <form onSubmit={handleSignUp} className="auth-modal-form">
            <button type="button" className="auth-google-btn" onClick={handleGoogleAuth}>
              <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google" width="18" height="18" />
              Continue with Google
            </button>

            <div className="auth-divider"><span>or</span></div>

            {signUpMessage && (
              <div className={signUpMessage.includes('created') ? 'auth-success' : 'auth-error'}>
                {signUpMessage}
              </div>
            )}

            <div className="auth-field">
              <label htmlFor="modal-signup-name">Name</label>
              <input
                id="modal-signup-name"
                type="text"
                value={signUpName}
                onChange={(e) => setSignUpName(e.target.value)}
                placeholder="Enter your name"
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="modal-signup-email">Email</label>
              <input
                id="modal-signup-email"
                type="email"
                value={signUpEmail}
                onChange={(e) => setSignUpEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="modal-signup-password">Password</label>
              <input
                id="modal-signup-password"
                type="password"
                value={signUpPassword}
                onChange={(e) => setSignUpPassword(e.target.value)}
                placeholder="Create a password (min. 6 characters)"
                required
                minLength={6}
              />
            </div>

            <button type="submit" className="auth-submit-btn" disabled={signUpLoading}>
              {signUpLoading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default AuthModal;

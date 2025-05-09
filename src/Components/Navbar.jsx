import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import '../App.css';
import supabase from '../Services/supabaseClient';
import { useTheme } from '../Context/ThemeContext';

const SunIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="theme-icon">
    <circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
  </svg>
);
const MoonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="theme-icon">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
  </svg>
);
const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="theme-icon">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>
  </svg>
);


const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { isDarkMode, toggleDarkMode } = useTheme();
 
  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        setIsLoggedIn(!!user);
      } catch (error) {
        console.error('Error checking auth:', error);
        setIsLoggedIn(false);
      }
    };
    checkUser();

     const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
         if (event === 'SIGNED_OUT') {
            setIsLoggedIn(false);
         } else if (event === 'SIGNED_IN' && session) {
            setIsLoggedIn(true);
         }
      }
    );

     return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };

  }, []);

  useEffect(() => {
    const handleClickOutside = () => {
      setShowProfileMenu(false);
      setShowCreateMenu(false);
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const handleMenuClick = (e, menuSetter) => {
    e.stopPropagation();
    if (menuSetter === setShowProfileMenu) setShowCreateMenu(false);
    if (menuSetter === setShowCreateMenu) setShowProfileMenu(false);
    menuSetter(prev => !prev);
  };

  const handleProfileClick = (e) => {
    if (!isLoggedIn) {
      navigate('/signin');
    } else {
      handleMenuClick(e, setShowProfileMenu);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="navbar navbar-container">
      <div className="navbar-left">
        <Link to="/"><h2>StudySphere</h2></Link>
      </div>

      <div className="navbar-center">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Search posts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="search-button">
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </button>
        </form>
      </div>

      <div className="navbar-right">
        <div className="dropdown">
          <h3 onClick={(e) => handleMenuClick(e, setShowCreateMenu)} style={{ cursor: 'pointer' }}>
            Create +
          </h3>
          {showCreateMenu && (
            <div className="dropdown-menu">
              <Link to="/create" onClick={() => setShowCreateMenu(false)}>New Post</Link>
              <Link to="/create-group" onClick={() => setShowCreateMenu(false)}>New Group</Link>
            </div>
          )}
        </div>

        {isLoggedIn ? (
          <div className="dropdown">
            <button onClick={handleProfileClick} className="profile-icon-btn" aria-label="Profile menu">
              <UserIcon />
            </button>
            {showProfileMenu && (
              <div className="dropdown-menu">
                <Link to="/bookmarks">Bookmarks</Link>
                <Link to="/profile" onClick={() => setShowProfileMenu(false)}>Settings</Link>
                <button onClick={async () => {
                  setShowProfileMenu(false);
                  try {
                    const { error } = await supabase.auth.signOut();
                    if (error) throw error;
                    navigate('/');
                  } catch (error) {
                    console.error('Error signing out:', error);
                    alert("Failed to log out. Please try again.");
                  }
                }}>Log out</button>
              </div>
            )}
          </div>
        ) : (
          <div className="sign-in">
            <Link to="/signin"><button className="signin-button">Sign In</button></Link>
          </div>
        )}

        <button onClick={toggleDarkMode} className="theme-toggle-btn" aria-label="Toggle dark mode">
          {isDarkMode ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>
    </div>
  );
};

export default Navbar;

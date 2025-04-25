import { useState, useEffect } from 'react';
import { Link } from 'react-router'; 
import '../App.css';
import supabase from '../Services/supabaseClient';

const Navbar = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const {
          data: { user },
          error
        } = await supabase.auth.getUser();
  
        if (error) throw error;
  
        setIsLoggedIn(!!user);
      } catch (error) {
        console.error('Error checking auth:', error);
        setIsLoggedIn(false);
      }
    };
  
    checkUser();
  }, []);

  useEffect(() => {
    document.body.className = darkMode ? 'dark' : '';
  }, [darkMode]);

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
    menuSetter(prev => !prev);
  };

  /*
  const handleProfileClick = (e) => {
    e.preventDefault();
    if (!isLoggedIn) {
      navigate('/signin');
    } else {
      handleMenuClick(e, setShowProfileMenu);
    }
  };
  */
  
  return (
    <div className="navbar">
      <Link to="/"><h2>StudySphere</h2></Link>

      <input type="text" placeholder="Search..." />

      <div className="dropdown">
        <h3 onClick={(e) => handleMenuClick(e, setShowProfileMenu)} style={{ cursor: 'pointer' }}>
          Profile
        </h3>
        {showProfileMenu && (
          <div className="dropdown-menu">
            <Link to="/profile">Settings</Link>
            {/*<Link to="/history">History</Link>*/}
            <button onClick={async () => {
              try {
                const { error } = await supabase.auth.signOut();
                if (error) throw error;
                
                localStorage.removeItem('session');
                
                setIsLoggedIn(false);
                
                window.location.href = '/';
              } catch (error) {
                console.error('Error signing out:', error);
                alert("Failed to log out. Please try again.");
              }
            }}>Log out</button>
          </div>
        )}
      </div>

      <div className="dropdown">
        <h3 onClick={(e) => handleMenuClick(e, setShowCreateMenu)} style={{ cursor: 'pointer' }}>
          Create +
        </h3>
        {showCreateMenu && (
          <div className="dropdown-menu">
            <Link to="/create">New Post</Link>
            <Link to="/create-group">New Study Group</Link>
          </div>
        )}
      </div>

      <label className="switch">
        <input
          type="checkbox"
          checked={darkMode}
          onChange={() => setDarkMode(!darkMode)}
        />
        <span className="slider"></span>
      </label>

      {!isLoggedIn && (
        <div className="sign-in">
          <Link to="/signin"><button>Sign In</button></Link>
        </div>
      )}
    </div>
  );
};

export default Navbar;
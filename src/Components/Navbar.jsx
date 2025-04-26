import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
//import '../App.css';
import supabase from '../Services/supabaseClient';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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

  const handleProfileClick = (e) => {
    e.preventDefault();
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
    <div className="navbar">
      <Link to="/"><h2>StudySphere</h2></Link>

      <form onSubmit={handleSearch} className="search-form">
        <input
          type="text"
          placeholder="Search posts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button
          type="submit"
          style={{
            backgroundColor: '#3b82f6',
            border: 'none',
            padding: '7px',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </button>
      </form>

      <div className="dropdown">
        <h3 onClick={handleProfileClick} style={{ cursor: 'pointer' }}>
          Profile
        </h3>
        {showProfileMenu && isLoggedIn && (
          <div className="dropdown-menu">
            <Link to="/profile">Settings</Link>
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

      {!isLoggedIn && (
        <div className="sign-in">
          <Link to="/signin"><button>Sign In</button></Link>
        </div>
      )}
    </div>
  );
};

export default Navbar;

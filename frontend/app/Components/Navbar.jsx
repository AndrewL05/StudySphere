import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import '../App.css';
import supabase from '../Services/supabaseClient';
import { useTheme } from '../Context/ThemeContext';
import SearchOverlay from './SearchOverlay';

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const SunIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

const MenuIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="6" x2="21" y2="6"></line>
    <line x1="3" y1="12" x2="21" y2="12"></line>
    <line x1="3" y1="18" x2="21" y2="18"></line>
  </svg>
);

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const FlashcardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
    <line x1="8" y1="21" x2="16" y2="21"></line>
    <line x1="12" y1="17" x2="12" y2="21"></line>
  </svg>
);

const GroupIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="m22 21-3-3m3 3v-3m0 3h-3"></path>
  </svg>
);

const Navbar = ({ openAuthModal }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showSearchOverlay, setShowSearchOverlay] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const mobileMenuRef = useRef(null);

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
      setShowMobileMenu(false);
    }
  };

  const closeMobileMenu = () => {
    setShowMobileMenu(false);
  };

  // Disable/enable body scrolling when mobile menu is open
  useEffect(() => {
    if (showMobileMenu) {
      // Disable body scrolling
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${window.scrollY}px`;
      document.body.style.width = '100%';
    } else {
      // Re-enable body scrolling and restore scroll position
      const scrollY = document.body.style.top;
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }

    // Cleanup function to ensure we always restore scrolling
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
    };
  }, [showMobileMenu]);

  // Handle clicking outside mobile menu to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showMobileMenu && mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setShowMobileMenu(false);
      }
      // Existing code for closing dropdown menus
      setShowProfileMenu(false);
      setShowCreateMenu(false);
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showMobileMenu]);

  return (
    <>
      <nav className="navbar">
        <div className="navbar-left">
          <button
            className="mobile-menu-toggle nav-icon-btn"
            onClick={(e) => {
              e.stopPropagation();
              setShowMobileMenu(!showMobileMenu);
            }}
            aria-label="Toggle mobile menu"
          >
            {showMobileMenu ? <CloseIcon /> : <MenuIcon />}
          </button>
          <Link to="/" className="logo desktop-only">
            <span className="logo-accent">S</span>tudySphere
          </Link>
        </div>

        <Link to="/" className="logo mobile-logo">
          <span className="logo-accent">S</span>tudySphere
        </Link>

        <div className="nav-actions">
          {/* Search icon */}
          <button className="nav-icon-btn desktop-only" onClick={() => setShowSearchOverlay(true)} title="Search">
            <SearchIcon />
          </button>

          {/* Create dropdown */}
          <div className="nav-dropdown-wrapper desktop-only">
            <button className="nav-icon-btn" onClick={(e) => handleMenuClick(e, setShowCreateMenu)} title="Create">
              <PlusIcon />
            </button>
            {showCreateMenu && (
              <div className="nav-dropdown">
                <Link to="/create" className="nav-dropdown-item" onClick={() => setShowCreateMenu(false)}>New Post</Link>
                <Link to="/create-group" className="nav-dropdown-item" onClick={() => setShowCreateMenu(false)}>New Group</Link>
                <Link to="/flashcards/create" className="nav-dropdown-item" onClick={() => setShowCreateMenu(false)}>New Flashcard Set</Link>
              </div>
            )}
          </div>

          {/* Profile / Sign In */}
          {isLoggedIn ? (
            <div className="nav-dropdown-wrapper desktop-only">
              <button className="nav-icon-btn" onClick={handleProfileClick} title="Profile">
                <UserIcon />
              </button>
              {showProfileMenu && (
                <div className="nav-dropdown">
                  <Link to="/bookmarks" className="nav-dropdown-item" onClick={() => setShowProfileMenu(false)}>Bookmarks</Link>
                  <Link to="/flashcards" className="nav-dropdown-item" onClick={() => setShowProfileMenu(false)}>Flashcard Sets</Link>
                  <Link to="/profile" className="nav-dropdown-item" onClick={() => setShowProfileMenu(false)}>Settings</Link>
                  <button className="nav-dropdown-item" onClick={async () => {
                    setShowProfileMenu(false);
                    try {
                      const { error } = await supabase.auth.signOut();
                      if (error) throw error;
                      navigate('/');
                    } catch (error) {
                      console.error('Error signing out:', error);
                      alert("Failed to log out. Please try again.");
                    }
                  }}>Log Out</button>
                </div>
              )}
            </div>
          ) : (
            <button className="nav-signin-btn desktop-only" onClick={() => openAuthModal('signin')}>Sign In</button>
          )}

          {/* Theme toggle */}
          <button className="nav-icon-btn" onClick={toggleDarkMode} title={isDarkMode ? 'Light mode' : 'Dark mode'}>
            {isDarkMode ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </nav>

      <SearchOverlay isOpen={showSearchOverlay} onClose={() => setShowSearchOverlay(false)} />

      {/* Mobile Menu Overlay */}
      {showMobileMenu && (
        <div className="mobile-menu-overlay" onClick={closeMobileMenu}>
          <div className="mobile-menu" ref={mobileMenuRef} onClick={(e) => e.stopPropagation()}>
            <div className="mobile-menu-header">
              <h3>Menu</h3>
              <button onClick={closeMobileMenu} className="mobile-menu-close nav-icon-btn">
                <CloseIcon />
              </button>
            </div>

            {/* Search Section */}
            <div className="mobile-menu-section">
              <form onSubmit={handleSearch} className="mobile-search-form">
                <input
                  type="text"
                  placeholder="Search posts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button type="submit">Search</button>
              </form>
            </div>

            {/* Navigation Links */}
            <div className="mobile-menu-section">
              <h4>Navigation</h4>
              <Link to="/" onClick={closeMobileMenu} className="mobile-menu-link">
                Home
              </Link>
              <Link to="/groups" onClick={closeMobileMenu} className="mobile-menu-link">
                <GroupIcon />
                All Groups
              </Link>
              <Link to="/flashcards" onClick={closeMobileMenu} className="mobile-menu-link">
                <FlashcardIcon />
                Flashcard Sets
              </Link>
            </div>

            {/* Create Section */}
            <div className="mobile-menu-section">
              <h4>Create</h4>
              <Link to="/create" onClick={closeMobileMenu} className="mobile-menu-link">
                New Post
              </Link>
              <Link to="/create-group" onClick={closeMobileMenu} className="mobile-menu-link">
                New Group
              </Link>
              <Link to="/flashcards/create" onClick={closeMobileMenu} className="mobile-menu-link">
                New Flashcard Set
              </Link>
            </div>

            {/* Account Section */}
            <div className="mobile-menu-section">
              <h4>Account</h4>
              {isLoggedIn ? (
                <>
                  <Link to="/bookmarks" onClick={closeMobileMenu} className="mobile-menu-link">
                    Bookmarks
                  </Link>
                  <Link to="/profile" onClick={closeMobileMenu} className="mobile-menu-link">
                    Settings
                  </Link>
                  <button
                    onClick={async () => {
                      closeMobileMenu();
                      try {
                        const { error } = await supabase.auth.signOut();
                        if (error) throw error;
                        navigate('/');
                      } catch (error) {
                        console.error('Error signing out:', error);
                        alert("Failed to log out. Please try again.");
                      }
                    }}
                    className="mobile-menu-link logout-btn"
                  >
                    Log out
                  </button>
                </>
              ) : (
                <Link to="/signin" onClick={closeMobileMenu} className="mobile-menu-link signin-link">
                  Sign In
                </Link>
              )}
            </div>

            {/* Settings Section */}
            <div className="mobile-menu-section">
              <h4>Settings</h4>
              <div className="mobile-theme-toggle">
                <span>Dark Mode</span>
                <button onClick={toggleDarkMode} className="mobile-theme-toggle-btn" aria-label="Toggle dark mode">
                  {isDarkMode ? <SunIcon /> : <MoonIcon />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;

import { useState } from 'react';
import './App.css';
import Navbar from './Components/Navbar';
import AuthModal from './Components/AuthModal';
import { Outlet, useLocation } from 'react-router';
import { ThemeProvider } from './Context/ThemeContext';

const App = () => {
  const location = useLocation();
  const [authModal, setAuthModal] = useState({ isOpen: false, tab: 'signin' });

  const authRoutes = ['/signin', '/signup', '/reset-password', '/reset-password-confirm'];
  const isAuthPage = authRoutes.includes(location.pathname);

  const openAuthModal = (tab = 'signin') => {
    setAuthModal({ isOpen: true, tab });
  };

  const closeAuthModal = () => {
    setAuthModal({ isOpen: false, tab: 'signin' });
  };

  return (
    <ThemeProvider>
      <div className="app">
        {!isAuthPage && <Navbar openAuthModal={openAuthModal} />}
        <main className={isAuthPage ? "auth-layout" : "main-content"}>
          <Outlet />
        </main>
        <AuthModal
          isOpen={authModal.isOpen}
          onClose={closeAuthModal}
          initialTab={authModal.tab}
        />
      </div>
    </ThemeProvider>
  );
};

export default App;

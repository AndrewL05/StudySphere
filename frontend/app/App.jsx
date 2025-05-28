import React from 'react'; 
import './App.css';
import Navbar from './Components/Navbar';
import { Outlet, useLocation } from 'react-router'; 
import { ThemeProvider } from './Context/ThemeContext'; 

const App = () => {
  const location = useLocation();

  const authRoutes = ['/signin', '/signup', '/reset-password', '/reset-password-confirm'];
  const isAuthPage = authRoutes.includes(location.pathname);

  return (
    <ThemeProvider>
      <div className="app">
        {!isAuthPage && <Navbar />}
        <main className={isAuthPage ? "auth-layout" : "main-content"}>
          <Outlet />
        </main>
      </div>
    </ThemeProvider>
  );
};

export default App;

import { useState } from 'react'
import './App.css'
import Navbar from './Components/Navbar';
import { Outlet, useLocation } from 'react-router';

const App = () => {
  const location = useLocation();
  
  // List of auth routes where navbar will be hidden
  const authRoutes = ['/signin', '/signup', '/reset-password'];
  const isAuthPage = authRoutes.includes(location.pathname);
  
  return (
    <div className="app">
      {!isAuthPage && <Navbar />}
      <main className={isAuthPage ? "auth-layout" : "main-content"}>
        <Outlet />
      </main>
    </div>
  );
};

export default App;
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { BrowserRouter, Routes, Route } from 'react-router';

import App from './App.jsx';
import Home from './Pages/Home';
import Create from './Pages/Create';
import Edit from './Pages/Edit';
import Group from './Pages/Group.jsx';
import CreateGroup from './Pages/CreateGroup.jsx';
import Post from './Pages/Post';
import Profile from './Pages/Profile';
import ResetPassword from './Pages/ResetPassword';
import ResetPasswordConfirm from './Pages/ResetPasswordConfirm';
import SignIn from './Pages/SignIn.jsx';
import SignUp from './Pages/SignUp';
import Search from './Pages/Search.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<Home />} />
          <Route path="create" element={<Create />} />
          <Route path="edit/:id" element={<Edit />} />
          <Route path="group/:id" element={<Group />} />
          <Route path="create-group" element={<CreateGroup/>} />
          <Route path="post/:id" element={<Post />} />
          <Route path="search" element={<Search />} />
          <Route path="profile" element={<Profile />} />
          <Route path="reset-password" element={<ResetPassword />} />
          <Route path="reset-password-confirm" element={<ResetPasswordConfirm />} />
          <Route path="signin" element={<SignIn />} />
          <Route path="signup" element={<SignUp />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
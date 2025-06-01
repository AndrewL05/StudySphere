import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { BrowserRouter, Routes, Route } from 'react-router';

import App from './App.jsx';
import Home from './Pages/home/Home';
import Create from './Pages/posts/Create';
import Edit from './Pages/posts/Edit';
import Group from './Pages/groups/Group.jsx';
import CreateGroup from './Pages/groups/CreateGroup.jsx';
import AllGroups from './Pages/groups/AllGroups.jsx';
import GroupSettings from './Pages/groups/GroupSettings';
import Post from './Pages/posts/Post';
import Profile from './Pages/profile/Profile';
import ResetPassword from './Pages/auth/ResetPassword';
import ResetPasswordConfirm from './Pages/auth/ResetPasswordConfirm';
import SignIn from './Pages/auth/SignIn.jsx';
import SignUp from './Pages/auth/SignUp';
import Search from './Pages/search/Search.jsx';
import Bookmarks from './Pages/bookmarks/Bookmarks.jsx';
import FlashcardSets from './Pages/flashcards/FlashcardSets';
import CreateFlashcardSet from './Pages/flashcards/CreateFlashcardSet';
import FlashcardSet from './Pages/flashcards/FlashcardSet';
import StudyMode from './Pages/flashcards/StudyMode';
import CreateQuiz from './Pages/flashcards/CreateQuiz';
import TakeQuiz from './Pages/quizzes/TakeQuiz';
import QuizResults from './Pages/quizzes/QuizResults';
import Error from './Pages/NotFound.jsx';

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
          <Route path="groups" element={<AllGroups/>} />
          <Route path="group/:id/settings" element={<GroupSettings />} />
          <Route path="post/:id" element={<Post />} />
          <Route path="search" element={<Search />} />
          <Route path="profile" element={<Profile />} />
          <Route path="reset-password" element={<ResetPassword />} />
          <Route path="reset-password-confirm" element={<ResetPasswordConfirm />} />
          <Route path="signin" element={<SignIn />} />
          <Route path="signup" element={<SignUp />} />
          <Route path="bookmarks" element={<Bookmarks />} />
          <Route path="flashcards" element={<FlashcardSets />} />
          <Route path="flashcards/create" element={<CreateFlashcardSet />} />
          <Route path="flashcards/:id" element={<FlashcardSet />} />
          <Route path="flashcards/:id/study" element={<StudyMode />} />
          <Route path="flashcards/:id/create-quiz" element={<CreateQuiz />} />
          <Route path="quizzes/:id" element={<TakeQuiz />} />
          <Route path="quizzes/:quizId/results/:attemptId" element={<QuizResults />} />
          <Route path="*" element={<Error/>} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
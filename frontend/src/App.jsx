import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Home from './pages/home.jsx';
import Login from './pages/login.jsx';
import Register from './pages/register.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import Discover from './pages/Discover.jsx';
import Dashboard from './pages/Dashboar.jsx';
import AddSkill from './pages/AddSkill.jsx';
import Requests from './pages/Request.jsx';
import Sessions from './pages/Sessions.jsx';
import Messages from './pages/Messages.jsx';
import Navbar from './components/Navbar.jsx';
import Profile from './pages/Profile.jsx';
import EditProfile from './pages/EditProfile.jsx';
import Notifications from './pages/Notification.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import ScheduleSession from './pages/ScheduleSession.jsx';
import PreJoinSession from './pages/PreJionSession.jsx';
import LiveSessionRoom from './pages/LiveSessionRoom.jsx';
import SessionReview from './pages/SessionReview.jsx';

import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/discover" element={<Discover />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/add-skill" element={<AddSkill />} />
        <Route path="/requests" element={<Requests />} />
        <Route path="/sessions" element={<Sessions />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/profile/:id" element={<Profile />} />
        <Route path="/edit-profile" element={<EditProfile />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/schedule-session" element={<ScheduleSession />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/pre-join-session" element={<PreJoinSession />} />
        <Route path="/session-room" element={<LiveSessionRoom />} />
        <Route path="/session-review" element={<SessionReview />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

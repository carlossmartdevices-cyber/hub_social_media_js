import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Posts from './pages/Posts';
import CreatePost from './pages/CreatePost';
import Settings from './pages/Settings';
import Calendar from './pages/Calendar';
import Analytics from './pages/Analytics';
import VideoUpload from './pages/VideoUpload';
import BulkVideoUpload from './pages/BulkVideoUpload';
import EnglishLearning from './pages/EnglishLearning';
import TelegramBroadcast from './pages/TelegramBroadcast';
import MultiPlatformPublish from './pages/MultiPlatformPublish';
import Layout from './components/Layout';

function App() {
  const { token } = useAuthStore();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {token ? (
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="posts" element={<Posts />} />
          <Route path="posts/create" element={<CreatePost />} />
          <Route path="videos/upload" element={<VideoUpload />} />
          <Route path="videos/bulk-upload" element={<BulkVideoUpload />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="english-learning" element={<EnglishLearning />} />
          <Route path="telegram-broadcast" element={<TelegramBroadcast />} />
          <Route path="multi-platform-publish" element={<MultiPlatformPublish />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      ) : (
        <Route path="*" element={<Navigate to="/login" replace />} />
      )}
    </Routes>
  );
}

export default App;

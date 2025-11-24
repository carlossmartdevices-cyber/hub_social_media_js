import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
    const { accessToken } = useAuthStore();
    return (_jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(Login, {}) }), _jsx(Route, { path: "/register", element: _jsx(Register, {}) }), accessToken ? (_jsxs(Route, { path: "/", element: _jsx(Layout, {}), children: [_jsx(Route, { index: true, element: _jsx(Dashboard, {}) }), _jsx(Route, { path: "posts", element: _jsx(Posts, {}) }), _jsx(Route, { path: "posts/create", element: _jsx(CreatePost, {}) }), _jsx(Route, { path: "videos/upload", element: _jsx(VideoUpload, {}) }), _jsx(Route, { path: "videos/bulk-upload", element: _jsx(BulkVideoUpload, {}) }), _jsx(Route, { path: "calendar", element: _jsx(Calendar, {}) }), _jsx(Route, { path: "analytics", element: _jsx(Analytics, {}) }), _jsx(Route, { path: "english-learning", element: _jsx(EnglishLearning, {}) }), _jsx(Route, { path: "telegram-broadcast", element: _jsx(TelegramBroadcast, {}) }), _jsx(Route, { path: "multi-platform-publish", element: _jsx(MultiPlatformPublish, {}) }), _jsx(Route, { path: "settings", element: _jsx(Settings, {}) })] })) : (_jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/login", replace: true }) }))] }));
}
export default App;

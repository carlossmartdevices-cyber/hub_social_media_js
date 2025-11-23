import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Posts from './pages/Posts';
import CreatePost from './pages/CreatePost';
import Settings from './pages/Settings';
import Layout from './components/Layout';
function App() {
    const { accessToken } = useAuthStore();
    return (_jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(Login, {}) }), _jsx(Route, { path: "/register", element: _jsx(Register, {}) }), accessToken ? (_jsxs(Route, { path: "/", element: _jsx(Layout, {}), children: [_jsx(Route, { index: true, element: _jsx(Dashboard, {}) }), _jsx(Route, { path: "posts", element: _jsx(Posts, {}) }), _jsx(Route, { path: "posts/create", element: _jsx(CreatePost, {}) }), _jsx(Route, { path: "settings", element: _jsx(Settings, {}) })] })) : (_jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/login", replace: true }) }))] }));
}
export default App;

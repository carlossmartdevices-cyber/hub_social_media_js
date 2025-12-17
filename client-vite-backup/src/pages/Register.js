import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
export default function Register() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await api.post('/auth/register', formData);
            navigate('/login');
        }
        catch (err) {
            setError(err.response?.data?.error || 'Registration failed');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx("div", { className: "min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4", children: _jsxs("div", { className: "max-w-md w-full space-y-8", children: [_jsx("h2", { className: "text-center text-3xl font-extrabold text-gray-900", children: "Create your account" }), _jsxs("form", { className: "mt-8 space-y-6", onSubmit: handleSubmit, children: [error && (_jsx("div", { className: "rounded-md bg-red-50 p-4", children: _jsx("p", { className: "text-sm text-red-800", children: error }) })), _jsxs("div", { className: "space-y-4", children: [_jsx("input", { type: "text", required: true, className: "w-full px-3 py-2 border border-gray-300 rounded-md", placeholder: "Full name", value: formData.name, onChange: (e) => setFormData({ ...formData, name: e.target.value }) }), _jsx("input", { type: "email", required: true, className: "w-full px-3 py-2 border border-gray-300 rounded-md", placeholder: "Email address", value: formData.email, onChange: (e) => setFormData({ ...formData, email: e.target.value }) }), _jsx("input", { type: "password", required: true, className: "w-full px-3 py-2 border border-gray-300 rounded-md", placeholder: "Password", value: formData.password, onChange: (e) => setFormData({ ...formData, password: e.target.value }) })] }), _jsx("button", { type: "submit", disabled: loading, className: "w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md", children: loading ? 'Creating account...' : 'Register' }), _jsx("div", { className: "text-center", children: _jsx(Link, { to: "/login", className: "text-indigo-600 hover:text-indigo-500", children: "Already have an account? Sign in" }) })] })] }) }));
}

import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { PlusIcon, TrashIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import api from '../lib/api';
export function PlatformAccounts() {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedPlatform, setSelectedPlatform] = useState('twitter');
    const [testingAccount, setTestingAccount] = useState(null);
    // Form state
    const [accountName, setAccountName] = useState('');
    const [accountIdentifier, setAccountIdentifier] = useState('');
    const [credentials, setCredentials] = useState({
        apiKey: '',
        apiSecret: '',
        accessToken: '',
        accessTokenSecret: '',
    });
    useEffect(() => {
        fetchAccounts();
    }, []);
    const fetchAccounts = async () => {
        try {
            setLoading(true);
            const response = await api.get('/platform-accounts');
            setAccounts(response.data.accounts);
        }
        catch (error) {
            console.error('Failed to fetch accounts:', error);
        }
        finally {
            setLoading(false);
        }
    };
    const handleAddAccount = async (e) => {
        e.preventDefault();
        try {
            await api.post('/platform-accounts', {
                platform: selectedPlatform,
                accountName,
                accountIdentifier,
                credentials,
            });
            // Reset form
            setAccountName('');
            setAccountIdentifier('');
            setCredentials({
                apiKey: '',
                apiSecret: '',
                accessToken: '',
                accessTokenSecret: '',
            });
            setShowAddModal(false);
            // Refresh accounts list
            fetchAccounts();
            alert('Account added successfully!');
        }
        catch (error) {
            alert(error.response?.data?.error || 'Failed to add account');
        }
    };
    const handleDeleteAccount = async (accountId) => {
        if (!confirm('Are you sure you want to delete this account?')) {
            return;
        }
        try {
            await api.delete(`/platform-accounts/${accountId}`);
            fetchAccounts();
            alert('Account deleted successfully!');
        }
        catch (error) {
            alert(error.response?.data?.error || 'Failed to delete account');
        }
    };
    const handleTestAccount = async (accountId) => {
        try {
            setTestingAccount(accountId);
            await api.post(`/platform-accounts/${accountId}/test`);
            alert('✅ Credentials are valid!');
            fetchAccounts(); // Refresh to update last_validated
        }
        catch (error) {
            alert(`❌ ${error.response?.data?.error || 'Credentials test failed'}`);
        }
        finally {
            setTestingAccount(null);
        }
    };
    const platformColors = {
        twitter: '#1DA1F2',
        instagram: '#E4405F',
        facebook: '#4267B2',
        linkedin: '#0077B5',
        telegram: '#0088CC',
    };
    if (loading) {
        return (_jsx("div", { className: "flex items-center justify-center h-64", children: _jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" }) }));
    }
    return (_jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow p-6", children: [_jsxs("div", { className: "flex justify-between items-center mb-6", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-2xl font-bold text-gray-900 dark:text-white", children: "Platform Accounts" }), _jsx("p", { className: "text-gray-600 dark:text-gray-400 mt-1", children: "Manage multiple accounts for each social media platform" })] }), _jsxs("button", { onClick: () => setShowAddModal(true), className: "flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors", children: [_jsx(PlusIcon, { className: "h-5 w-5" }), "Add Account"] })] }), _jsx("div", { className: "space-y-4", children: accounts.length === 0 ? (_jsx("div", { className: "text-center py-12 text-gray-500 dark:text-gray-400", children: "No accounts configured yet. Click \"Add Account\" to get started." })) : (accounts.map(account => (_jsxs("div", { className: "border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsx("div", { className: "w-12 h-12 rounded-full flex items-center justify-center text-white font-bold", style: { backgroundColor: platformColors[account.platform] || '#6B7280' }, children: account.platform.charAt(0).toUpperCase() }), _jsxs("div", { children: [_jsx("h3", { className: "font-semibold text-gray-900 dark:text-white", children: account.account_name }), _jsxs("p", { className: "text-sm text-gray-600 dark:text-gray-400", children: [account.account_identifier, " \u2022 ", account.platform] }), account.last_validated && (_jsxs("p", { className: "text-xs text-gray-500 dark:text-gray-500 mt-1", children: ["Last validated: ", new Date(account.last_validated).toLocaleString()] }))] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [account.is_active ? (_jsx(CheckCircleIcon, { className: "h-6 w-6 text-green-500", title: "Active" })) : (_jsx(XCircleIcon, { className: "h-6 w-6 text-gray-400", title: "Inactive" })), _jsx("button", { onClick: () => handleTestAccount(account.id), disabled: testingAccount === account.id, className: "px-3 py-1 text-sm bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 rounded hover:bg-blue-200 dark:hover:bg-blue-800 disabled:opacity-50", children: testingAccount === account.id ? 'Testing...' : 'Test' }), _jsx("button", { onClick: () => handleDeleteAccount(account.id), className: "p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded transition-colors", title: "Delete account", children: _jsx(TrashIcon, { className: "h-5 w-5" }) })] })] }, account.id)))) }), showAddModal && (_jsx("div", { className: "fixed inset-0 z-50 overflow-y-auto", children: _jsxs("div", { className: "flex items-center justify-center min-h-screen px-4", children: [_jsx("div", { className: "fixed inset-0 bg-black opacity-50", onClick: () => setShowAddModal(false) }), _jsxs("div", { className: "relative bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full p-6 z-10", children: [_jsx("h3", { className: "text-xl font-bold text-gray-900 dark:text-white mb-4", children: "Add Platform Account" }), _jsxs("form", { onSubmit: handleAddAccount, className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Platform" }), _jsxs("select", { value: selectedPlatform, onChange: e => setSelectedPlatform(e.target.value), className: "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white", children: [_jsx("option", { value: "twitter", children: "Twitter (X)" }), _jsx("option", { value: "instagram", children: "Instagram" }), _jsx("option", { value: "facebook", children: "Facebook" }), _jsx("option", { value: "telegram", children: "Telegram" }), _jsx("option", { value: "linkedin", children: "LinkedIn" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Account Name (for your reference)" }), _jsx("input", { type: "text", value: accountName, onChange: e => setAccountName(e.target.value), placeholder: "e.g., My Personal Account", required: true, className: "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Account Identifier (username/handle)" }), _jsx("input", { type: "text", value: accountIdentifier, onChange: e => setAccountIdentifier(e.target.value), placeholder: "e.g., @myhandle", required: true, className: "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white" })] }), selectedPlatform === 'twitter' && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded p-3", children: [_jsx("p", { className: "text-sm text-blue-800 dark:text-blue-200", children: _jsx("strong", { children: "How to get Twitter credentials:" }) }), _jsxs("ol", { className: "text-sm text-blue-700 dark:text-blue-300 mt-2 list-decimal list-inside space-y-1", children: [_jsxs("li", { children: ["Go to ", _jsx("a", { href: "https://developer.twitter.com", target: "_blank", rel: "noopener noreferrer", className: "underline", children: "developer.twitter.com" })] }), _jsx("li", { children: "Create or select your app" }), _jsx("li", { children: "Go to \"Keys and tokens\" tab" }), _jsx("li", { children: "Copy all the credentials below" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "API Key (Consumer Key)" }), _jsx("input", { type: "text", value: credentials.apiKey, onChange: e => setCredentials({ ...credentials, apiKey: e.target.value }), required: true, className: "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "API Secret (Consumer Secret)" }), _jsx("input", { type: "password", value: credentials.apiSecret, onChange: e => setCredentials({ ...credentials, apiSecret: e.target.value }), required: true, className: "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Access Token" }), _jsx("input", { type: "text", value: credentials.accessToken, onChange: e => setCredentials({ ...credentials, accessToken: e.target.value }), required: true, className: "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Access Token Secret" }), _jsx("input", { type: "password", value: credentials.accessTokenSecret, onChange: e => setCredentials({ ...credentials, accessTokenSecret: e.target.value }), required: true, className: "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm" })] })] })), _jsxs("div", { className: "flex justify-end gap-2 mt-6", children: [_jsx("button", { type: "button", onClick: () => setShowAddModal(false), className: "px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md", children: "Cancel" }), _jsx("button", { type: "submit", className: "px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700", children: "Add Account" })] })] })] })] }) }))] }));
}

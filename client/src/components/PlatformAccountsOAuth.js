import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { TrashIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import api from '../lib/api';
export function PlatformAccountsOAuth() {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [testingAccount, setTestingAccount] = useState(null);
    const [connectingPlatform, setConnectingPlatform] = useState(false);
    useEffect(() => {
        fetchAccounts();
        // Check for OAuth callback result
        const params = new URLSearchParams(window.location.search);
        const oauthSuccess = params.get('oauth_success');
        const oauthError = params.get('oauth_error');
        const account = params.get('account');
        if (oauthSuccess && account) {
            alert(`✅ Successfully connected Twitter account: ${account}`);
            fetchAccounts();
            // Clean URL
            window.history.replaceState({}, '', window.location.pathname);
        }
        else if (oauthError) {
            alert(`❌ Failed to connect account: ${oauthError}`);
            // Clean URL
            window.history.replaceState({}, '', window.location.pathname);
        }
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
    const handleConnectTwitter = async () => {
        try {
            setConnectingPlatform(true);
            // Get OAuth authorization URL
            const response = await api.get('/oauth/twitter/authorize', {
                params: {
                    returnUrl: window.location.pathname,
                },
            });
            // Redirect to Twitter for authorization
            window.location.href = response.data.authUrl;
        }
        catch (error) {
            alert(error.response?.data?.error || 'Failed to start OAuth flow');
            setConnectingPlatform(false);
        }
    };
    const handleDeleteAccount = async (accountId) => {
        if (!confirm('Are you sure you want to disconnect this account?')) {
            return;
        }
        try {
            await api.delete(`/platform-accounts/${accountId}`);
            fetchAccounts();
            alert('Account disconnected successfully!');
        }
        catch (error) {
            alert(error.response?.data?.error || 'Failed to disconnect account');
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
    const platformNames = {
        twitter: 'Twitter (X)',
        instagram: 'Instagram',
        facebook: 'Facebook',
        linkedin: 'LinkedIn',
        telegram: 'Telegram',
    };
    if (loading) {
        return (_jsx("div", { className: "flex items-center justify-center h-64", children: _jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" }) }));
    }
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-2xl font-bold text-gray-900 dark:text-white", children: "Connected Accounts" }), _jsx("p", { className: "text-gray-600 dark:text-gray-400 mt-1", children: "Connect multiple accounts for each social media platform. Click \"Connect\" to authorize via OAuth." })] }), _jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow p-6", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900 dark:text-white mb-4", children: "Quick Connect" }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", children: [_jsxs("button", { onClick: handleConnectTwitter, disabled: connectingPlatform, className: "flex items-center gap-3 px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors disabled:opacity-50", children: [_jsx("div", { className: "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold", style: { backgroundColor: platformColors.twitter }, children: "\uD835\uDD4F" }), _jsxs("div", { className: "text-left", children: [_jsx("div", { className: "font-semibold text-gray-900 dark:text-white", children: "Twitter (X)" }), _jsx("div", { className: "text-sm text-gray-500 dark:text-gray-400", children: connectingPlatform ? 'Connecting...' : 'Connect via OAuth 2.0' })] })] }), _jsxs("div", { className: "flex items-center gap-3 px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-lg opacity-50", children: [_jsx("div", { className: "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold", style: { backgroundColor: platformColors.instagram }, children: "\uD83D\uDCF7" }), _jsxs("div", { className: "text-left", children: [_jsx("div", { className: "font-semibold text-gray-900 dark:text-white", children: "Instagram" }), _jsx("div", { className: "text-sm text-gray-500 dark:text-gray-400", children: "Coming soon" })] })] }), _jsxs("div", { className: "flex items-center gap-3 px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-lg opacity-50", children: [_jsx("div", { className: "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold", style: { backgroundColor: platformColors.facebook }, children: "f" }), _jsxs("div", { className: "text-left", children: [_jsx("div", { className: "font-semibold text-gray-900 dark:text-white", children: "Facebook" }), _jsx("div", { className: "text-sm text-gray-500 dark:text-gray-400", children: "Coming soon" })] })] })] })] }), _jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow p-6", children: [_jsxs("h3", { className: "text-lg font-semibold text-gray-900 dark:text-white mb-4", children: ["Your Connected Accounts (", accounts.length, ")"] }), _jsx("div", { className: "space-y-4", children: accounts.length === 0 ? (_jsx("div", { className: "text-center py-12 text-gray-500 dark:text-gray-400", children: "No accounts connected yet. Click \"Connect\" above to get started." })) : (accounts.map(account => (_jsxs("div", { className: "border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsx("div", { className: "w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl", style: { backgroundColor: platformColors[account.platform] || '#6B7280' }, children: account.platform === 'twitter' ? '𝕏' : account.platform.charAt(0).toUpperCase() }), _jsxs("div", { children: [_jsx("h4", { className: "font-semibold text-gray-900 dark:text-white", children: account.account_name }), _jsx("p", { className: "text-sm text-gray-600 dark:text-gray-400", children: account.account_identifier }), _jsxs("p", { className: "text-xs text-gray-500 dark:text-gray-500 mt-1", children: [platformNames[account.platform] || account.platform, account.last_validated && (_jsxs(_Fragment, { children: [" \u2022 Last verified: ", new Date(account.last_validated).toLocaleDateString()] }))] })] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [account.is_active ? (_jsx(CheckCircleIcon, { className: "h-6 w-6 text-green-500", title: "Active" })) : (_jsx(XCircleIcon, { className: "h-6 w-6 text-gray-400", title: "Inactive" })), _jsx("button", { onClick: () => handleTestAccount(account.id), disabled: testingAccount === account.id, className: "px-3 py-1 text-sm bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 rounded hover:bg-blue-200 dark:hover:bg-blue-800 disabled:opacity-50 transition-colors", children: testingAccount === account.id ? 'Testing...' : 'Test' }), _jsx("button", { onClick: () => handleDeleteAccount(account.id), className: "p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded transition-colors", title: "Disconnect account", children: _jsx(TrashIcon, { className: "h-5 w-5" }) })] })] }, account.id)))) })] }), _jsxs("div", { className: "bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-4", children: [_jsx("h4", { className: "font-semibold text-blue-900 dark:text-blue-100 mb-2", children: "\u2139\uFE0F How it works" }), _jsxs("ul", { className: "text-sm text-blue-800 dark:text-blue-200 space-y-1", children: [_jsx("li", { children: "\u2022 Click \"Connect\" for any platform" }), _jsx("li", { children: "\u2022 You'll be redirected to authorize the connection" }), _jsx("li", { children: "\u2022 After authorization, the account will be saved securely" }), _jsx("li", { children: "\u2022 You can connect multiple accounts for the same platform" }), _jsx("li", { children: "\u2022 When creating a post, you'll be able to select which account to use" })] })] })] }));
}

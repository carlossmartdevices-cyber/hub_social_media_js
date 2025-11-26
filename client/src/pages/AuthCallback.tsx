import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [error, setError] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      // Check for error from backend
      const errorParam = searchParams.get('error');
      if (errorParam) {
        setError(getErrorMessage(errorParam));
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      // Get tokens from URL params
      const accessToken = searchParams.get('accessToken');
      const refreshToken = searchParams.get('refreshToken');
      const username = searchParams.get('username');

      if (!accessToken || !refreshToken) {
        setError('Missing authentication tokens');
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      // Create user object (minimal info, will be fetched later if needed)
      const user = {
        name: username || 'User',
        email: `${username}@x.temp`,
      };

      // Set auth in store
      setAuth(user as any, accessToken, refreshToken);

      // Redirect to dashboard
      navigate('/', { replace: true });
    };

    handleCallback();
  }, [searchParams, navigate, setAuth]);

  const getErrorMessage = (error: string): string => {
    switch (error) {
      case 'missing_parameters':
        return 'Missing required parameters from X';
      case 'account_disabled':
        return 'Your account has been disabled';
      case 'oauth_failed':
        return 'Failed to authenticate with X. Please try again.';
      default:
        return 'Authentication failed. Please try again.';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
        {error ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-red-600 dark:text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Authentication Failed
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Redirecting to login...
            </p>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="animate-spin h-8 w-8 text-indigo-600 dark:text-indigo-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Completing Sign In
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Please wait while we complete your authentication...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

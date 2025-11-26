'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuthStore();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');
    const username = searchParams.get('username');
    const error = searchParams.get('error');

    if (error) {
      setStatus('error');
      setTimeout(() => {
        router.push(`/login?error=${error}`);
      }, 2000);
      return;
    }

    if (accessToken && refreshToken) {
      // Fetch user profile with the token
      api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      api.get('/auth/profile')
        .then((response) => {
          const user = response.data.user;
          setAuth(user, accessToken, refreshToken);
          setStatus('success');
          setTimeout(() => {
            router.push('/');
          }, 1500);
        })
        .catch(() => {
          // If profile fetch fails, still try to use the tokens
          const user = {
            id: '',
            email: username ? `${username}@x.temp` : '',
            name: username || 'User',
            role: 'user',
          };
          setAuth(user, accessToken, refreshToken);
          setStatus('success');
          setTimeout(() => {
            router.push('/');
          }, 1500);
        });
    } else {
      setStatus('error');
      setTimeout(() => {
        router.push('/login?error=missing_tokens');
      }, 2000);
    }
  }, [searchParams, setAuth, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
        {status === 'loading' && (
          <>
            <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Completing login...
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              Please wait while we set up your account
            </p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Login successful!
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              Redirecting to dashboard...
            </p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Login failed
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              Redirecting to login page...
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Loading...
        </h2>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AuthCallbackContent />
    </Suspense>
  );
}

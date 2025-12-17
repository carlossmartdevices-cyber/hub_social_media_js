'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Layout from '@/components/Layout';

export default function PostsPage() {
  const { accessToken } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!accessToken) {
      router.push('/login');
    }
  }, [accessToken, router]);

  if (!accessToken) return null;

  return (
    <Layout>
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Posts</h1>
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6">
          <p className="text-gray-500 dark:text-gray-400">No posts yet. Create your first post!</p>
        </div>
      </div>
    </Layout>
  );
}

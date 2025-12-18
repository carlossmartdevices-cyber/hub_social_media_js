import { PlatformAccountsOAuthEnhanced } from '../components/PlatformAccountsOAuthEnhanced';

export default function Settings() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage your social media accounts and preferences
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <PlatformAccountsOAuthEnhanced />
        </div>
      </div>
    </div>
  );
}

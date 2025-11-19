import { PlatformAccountsOAuth } from '../components/PlatformAccountsOAuth';

export default function Settings() {
  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage your social media accounts and preferences
        </p>
      </div>

      <PlatformAccountsOAuth />
    </div>
  );
}

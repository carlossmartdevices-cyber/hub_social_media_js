import { EnglishLearningAssistant } from '../components/EnglishLearningAssistant';

export default function EnglishLearning() {
  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">English Learning Assistant</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          AI-powered English learning specifically designed for content creators
        </p>
      </div>

      <EnglishLearningAssistant />
    </div>
  );
}

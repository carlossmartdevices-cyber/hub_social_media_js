import { useState } from 'react';
import api from '../lib/api';

interface VocabularyItem {
  word: string;
  definition: string;
  example: string;
}

interface LearningResponse {
  answer: string;
  examples: string[];
  tips: string[];
  vocabulary: VocabularyItem[];
  culturalNotes?: string;
}

export function EnglishLearningAssistant() {
  const [question, setQuestion] = useState('');
  const [context, setContext] = useState('');
  const [level, setLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [response, setResponse] = useState<LearningResponse | null>(null);
  const [suggestedTopics, setSuggestedTopics] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!question.trim()) {
      alert('Please enter a question');
      return;
    }

    setIsLoading(true);
    setResponse(null);

    try {
      const result = await api.post('/english-learning/ask', {
        question,
        context: context || undefined,
        level,
      });

      if (result.data.success) {
        setResponse(result.data.response);
      }
    } catch (error: any) {
      alert('Error: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  const loadSuggestedTopics = async () => {
    try {
      const result = await api.get('/english-learning/topics');
      if (result.data.success) {
        setSuggestedTopics(result.data.topics);
        setShowSuggestions(true);
      }
    } catch (error: any) {
      alert('Error loading topics: ' + (error.response?.data?.error || error.message));
    }
  };

  const selectTopic = (topic: string) => {
    setQuestion(topic);
    setShowSuggestions(false);
  };

  return (
    <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          📚 English Learning Assistant
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Specialized English help for content creators on social media
        </p>
      </div>

      {/* Question Form */}
      <form onSubmit={handleSubmit} className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Your English Level
          </label>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value as any)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Your Question
            </label>
            <button
              type="button"
              onClick={loadSuggestedTopics}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              💡 Need ideas?
            </button>
          </div>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Example: How do I write a professional thank you message to my subscribers?"
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Additional Context (Optional)
          </label>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Provide more details about your situation..."
            rows={2}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !question.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold"
        >
          {isLoading ? 'Asking Grok AI...' : 'Ask English Question'}
        </button>
      </form>

      {/* Suggested Topics */}
      {showSuggestions && suggestedTopics.length > 0 && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-3">
            Suggested Topics for Content Creators:
          </h3>
          <div className="space-y-2">
            {suggestedTopics.map((topic, idx) => (
              <button
                key={idx}
                onClick={() => selectTopic(topic)}
                className="block w-full text-left px-3 py-2 bg-white dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-gray-600 rounded text-sm text-gray-700 dark:text-gray-300 transition-colors"
              >
                {topic}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowSuggestions(false)}
            className="mt-3 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800"
          >
            Close suggestions
          </button>
        </div>
      )}

      {/* Response */}
      {response && (
        <div className="space-y-6">
          {/* Answer */}
          <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <h3 className="font-semibold text-lg text-green-900 dark:text-green-300 mb-3 flex items-center gap-2">
              <span className="text-2xl">✓</span> Answer
            </h3>
            <p className="text-gray-800 dark:text-gray-200 whitespace-pre-line">{response.answer}</p>
          </div>

          {/* Examples */}
          {response.examples.length > 0 && (
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="font-semibold text-lg text-blue-900 dark:text-blue-300 mb-3 flex items-center gap-2">
                <span className="text-2xl">📝</span> Examples
              </h3>
              <ul className="space-y-3">
                {response.examples.map((example, idx) => (
                  <li key={idx} className="p-3 bg-white dark:bg-gray-700 rounded text-gray-800 dark:text-gray-200">
                    {example}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Tips */}
          {response.tips.length > 0 && (
            <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <h3 className="font-semibold text-lg text-yellow-900 dark:text-yellow-300 mb-3 flex items-center gap-2">
                <span className="text-2xl">💡</span> Professional Tips
              </h3>
              <ul className="list-disc list-inside space-y-2">
                {response.tips.map((tip, idx) => (
                  <li key={idx} className="text-gray-800 dark:text-gray-200">
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Vocabulary */}
          {response.vocabulary.length > 0 && (
            <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <h3 className="font-semibold text-lg text-purple-900 dark:text-purple-300 mb-3 flex items-center gap-2">
                <span className="text-2xl">📖</span> Key Vocabulary
              </h3>
              <div className="space-y-3">
                {response.vocabulary.map((item, idx) => (
                  <div key={idx} className="p-3 bg-white dark:bg-gray-700 rounded">
                    <p className="font-semibold text-purple-700 dark:text-purple-300">
                      {item.word}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {item.definition}
                    </p>
                    <p className="text-sm text-gray-800 dark:text-gray-200 mt-1 italic">
                      Example: "{item.example}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cultural Notes */}
          {response.culturalNotes && (
            <div className="p-4 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <h3 className="font-semibold text-lg text-red-900 dark:text-red-300 mb-3 flex items-center gap-2">
                <span className="text-2xl">🌍</span> Cultural Notes
              </h3>
              <p className="text-gray-800 dark:text-gray-200">{response.culturalNotes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

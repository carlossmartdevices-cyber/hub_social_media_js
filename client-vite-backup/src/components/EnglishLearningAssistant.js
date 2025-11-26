import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import api from '../lib/api';
export function EnglishLearningAssistant() {
    const [question, setQuestion] = useState('');
    const [context, setContext] = useState('');
    const [level, setLevel] = useState('intermediate');
    const [response, setResponse] = useState(null);
    const [suggestedTopics, setSuggestedTopics] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const handleSubmit = async (e) => {
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
        }
        catch (error) {
            alert('Error: ' + (error.response?.data?.error || error.message));
        }
        finally {
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
        }
        catch (error) {
            alert('Error loading topics: ' + (error.response?.data?.error || error.message));
        }
    };
    const selectTopic = (topic) => {
        setQuestion(topic);
        setShowSuggestions(false);
    };
    return (_jsxs("div", { className: "max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6", children: [_jsxs("div", { className: "mb-6", children: [_jsx("h2", { className: "text-3xl font-bold text-gray-900 dark:text-white mb-2", children: "\uD83D\uDCDA English Learning Assistant" }), _jsx("p", { className: "text-gray-600 dark:text-gray-400", children: "Specialized English help for content creators on social media" })] }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4 mb-6", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2", children: "Your English Level" }), _jsxs("select", { value: level, onChange: (e) => setLevel(e.target.value), className: "w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white", children: [_jsx("option", { value: "beginner", children: "Beginner" }), _jsx("option", { value: "intermediate", children: "Intermediate" }), _jsx("option", { value: "advanced", children: "Advanced" })] })] }), _jsxs("div", { children: [_jsxs("div", { className: "flex justify-between items-center mb-2", children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300", children: "Your Question" }), _jsx("button", { type: "button", onClick: loadSuggestedTopics, className: "text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400", children: "\uD83D\uDCA1 Need ideas?" })] }), _jsx("textarea", { value: question, onChange: (e) => setQuestion(e.target.value), placeholder: "Example: How do I write a professional thank you message to my subscribers?", rows: 3, className: "w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2", children: "Additional Context (Optional)" }), _jsx("textarea", { value: context, onChange: (e) => setContext(e.target.value), placeholder: "Provide more details about your situation...", rows: 2, className: "w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" })] }), _jsx("button", { type: "submit", disabled: isLoading || !question.trim(), className: "w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold", children: isLoading ? 'Asking Grok AI...' : 'Ask English Question' })] }), showSuggestions && suggestedTopics.length > 0 && (_jsxs("div", { className: "mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800", children: [_jsx("h3", { className: "font-semibold text-blue-900 dark:text-blue-300 mb-3", children: "Suggested Topics for Content Creators:" }), _jsx("div", { className: "space-y-2", children: suggestedTopics.map((topic, idx) => (_jsx("button", { onClick: () => selectTopic(topic), className: "block w-full text-left px-3 py-2 bg-white dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-gray-600 rounded text-sm text-gray-700 dark:text-gray-300 transition-colors", children: topic }, idx))) }), _jsx("button", { onClick: () => setShowSuggestions(false), className: "mt-3 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800", children: "Close suggestions" })] })), response && (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800", children: [_jsxs("h3", { className: "font-semibold text-lg text-green-900 dark:text-green-300 mb-3 flex items-center gap-2", children: [_jsx("span", { className: "text-2xl", children: "\u2713" }), " Answer"] }), _jsx("p", { className: "text-gray-800 dark:text-gray-200 whitespace-pre-line", children: response.answer })] }), response.examples.length > 0 && (_jsxs("div", { className: "p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800", children: [_jsxs("h3", { className: "font-semibold text-lg text-blue-900 dark:text-blue-300 mb-3 flex items-center gap-2", children: [_jsx("span", { className: "text-2xl", children: "\uD83D\uDCDD" }), " Examples"] }), _jsx("ul", { className: "space-y-3", children: response.examples.map((example, idx) => (_jsx("li", { className: "p-3 bg-white dark:bg-gray-700 rounded text-gray-800 dark:text-gray-200", children: example }, idx))) })] })), response.tips.length > 0 && (_jsxs("div", { className: "p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800", children: [_jsxs("h3", { className: "font-semibold text-lg text-yellow-900 dark:text-yellow-300 mb-3 flex items-center gap-2", children: [_jsx("span", { className: "text-2xl", children: "\uD83D\uDCA1" }), " Professional Tips"] }), _jsx("ul", { className: "list-disc list-inside space-y-2", children: response.tips.map((tip, idx) => (_jsx("li", { className: "text-gray-800 dark:text-gray-200", children: tip }, idx))) })] })), response.vocabulary.length > 0 && (_jsxs("div", { className: "p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-800", children: [_jsxs("h3", { className: "font-semibold text-lg text-purple-900 dark:text-purple-300 mb-3 flex items-center gap-2", children: [_jsx("span", { className: "text-2xl", children: "\uD83D\uDCD6" }), " Key Vocabulary"] }), _jsx("div", { className: "space-y-3", children: response.vocabulary.map((item, idx) => (_jsxs("div", { className: "p-3 bg-white dark:bg-gray-700 rounded", children: [_jsx("p", { className: "font-semibold text-purple-700 dark:text-purple-300", children: item.word }), _jsx("p", { className: "text-sm text-gray-600 dark:text-gray-400 mt-1", children: item.definition }), _jsxs("p", { className: "text-sm text-gray-800 dark:text-gray-200 mt-1 italic", children: ["Example: \"", item.example, "\""] })] }, idx))) })] })), response.culturalNotes && (_jsxs("div", { className: "p-4 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 rounded-lg border border-red-200 dark:border-red-800", children: [_jsxs("h3", { className: "font-semibold text-lg text-red-900 dark:text-red-300 mb-3 flex items-center gap-2", children: [_jsx("span", { className: "text-2xl", children: "\uD83C\uDF0D" }), " Cultural Notes"] }), _jsx("p", { className: "text-gray-800 dark:text-gray-200", children: response.culturalNotes })] }))] }))] }));
}

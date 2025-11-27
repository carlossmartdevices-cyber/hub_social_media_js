'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { 
  BookOpen, GraduationCap, MessageCircle, Sparkles, 
  RefreshCw, Check, X, ChevronRight, Trophy,
  Lightbulb, AlertTriangle, Volume2, Send
} from 'lucide-react';

interface Lesson {
  title: string;
  introduction: string;
  keyPoints: string[];
  examples: { english: string; spanish: string; explanation: string }[];
  practiceExercises: { question: string; answer: string; hint?: string }[];
  contentCreatorTips: string[];
  commonMistakes: { wrong: string; correct: string; explanation: string }[];
}

interface Quiz {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const TOPICS = [
  { id: 'social_media_captions', name: 'Social Media Captions', icon: '📱' },
  { id: 'engagement_phrases', name: 'Engagement Phrases', icon: '💬' },
  { id: 'call_to_action', name: 'Call to Action', icon: '🎯' },
  { id: 'professional_bio', name: 'Professional Bio Writing', icon: '✍️' },
  { id: 'hashtag_strategy', name: 'Hashtag Strategy', icon: '#️⃣' },
  { id: 'video_scripts', name: 'Video Script Writing', icon: '🎬' },
  { id: 'brand_voice', name: 'Brand Voice & Tone', icon: '🎤' },
  { id: 'storytelling', name: 'Storytelling Basics', icon: '📖' },
];

const LEVELS = [
  { id: 'beginner', name: 'Beginner', color: 'text-green-600' },
  { id: 'intermediate', name: 'Intermediate', color: 'text-yellow-600' },
  { id: 'advanced', name: 'Advanced', color: 'text-red-600' },
];

const FOCUS_AREAS = [
  { id: 'vocabulary', name: 'Vocabulary' },
  { id: 'grammar', name: 'Grammar' },
  { id: 'phrases', name: 'Phrases' },
  { id: 'writing', name: 'Writing' },
];

export default function EnglishLearningPage() {
  const { accessToken } = useAuthStore();
  const router = useRouter();
  
  const [selectedTopic, setSelectedTopic] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('intermediate');
  const [selectedFocus, setSelectedFocus] = useState('vocabulary');
  
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [quiz, setQuiz] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Quiz state
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [quizComplete, setQuizComplete] = useState(false);
  
  // Chat state
  const [chatMode, setChatMode] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  
  // Practice state
  const [practiceAnswers, setPracticeAnswers] = useState<{ [key: number]: string }>({});
  const [showPracticeResults, setShowPracticeResults] = useState(false);

  useEffect(() => {
    if (!accessToken) {
      router.push('/login');
    }
  }, [accessToken, router]);

  const generateLesson = async () => {
    if (!selectedTopic) return;
    
    setLoading(true);
    setLesson(null);
    setQuiz([]);
    setQuizComplete(false);
    setCurrentQuizIndex(0);
    setQuizScore(0);
    
    try {
      const topicName = TOPICS.find(t => t.id === selectedTopic)?.name || selectedTopic;
      const response = await api.post('/ai/english-lesson', {
        topic: topicName,
        level: selectedLevel,
        focusArea: selectedFocus
      });
      
      setLesson(response.data.lesson);
      setQuiz(response.data.quiz || []);
    } catch (err) {
      console.error('Failed to generate lesson:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuizAnswer = (index: number) => {
    if (showResult) return;
    setSelectedAnswer(index);
    setShowResult(true);
    
    if (index === quiz[currentQuizIndex].correctIndex) {
      setQuizScore(prev => prev + 1);
    }
  };

  const nextQuestion = () => {
    if (currentQuizIndex < quiz.length - 1) {
      setCurrentQuizIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      setQuizComplete(true);
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;
    
    const userMessage = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatLoading(true);
    
    try {
      const response = await api.post('/ai/chat', {
        message: userMessage,
        history: chatMessages,
        context: 'english_learning'
      });
      
      setChatMessages(prev => [...prev, { role: 'assistant', content: response.data.response }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I had trouble understanding. Please try again.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  if (!accessToken) return null;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <GraduationCap className="w-8 h-8 text-purple-500" />
              English for Content Creators
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Learn English with PNP 🤖 - Tu tutor de inglés para creadores
            </p>
          </div>
          
          <button
            onClick={() => setChatMode(!chatMode)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              chatMode 
                ? 'bg-purple-600 text-white' 
                : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
            }`}
          >
            <MessageCircle className="w-5 h-5" />
            {chatMode ? 'Back to Lessons' : 'Chat with PNP 🤖'}
          </button>
        </div>

        {chatMode ? (
          /* Chat Mode */
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white">
              <h2 className="font-semibold flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                PNP English Tutor 🚀
              </h2>
              <p className="text-sm opacity-80">¡Pregúntame lo que quieras, crack! I'm here to help! ✨</p>
            </div>
            
            <div className="h-96 overflow-y-auto p-4 space-y-4">
              {chatMessages.length === 0 && (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Start a conversation! Ask about:</p>
                  <ul className="text-sm mt-2 space-y-1">
                    <li>• How to write better captions</li>
                    <li>• Grammar questions</li>
                    <li>• Translate your content</li>
                    <li>• Improve your English writing</li>
                  </ul>
                </div>
              )}
              
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-lg ${
                    msg.role === 'user' 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
                    <RefreshCw className="w-5 h-5 animate-spin text-purple-500" />
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                  placeholder="Ask your English tutor..."
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <button
                  onClick={sendChatMessage}
                  disabled={!chatInput.trim() || chatLoading}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Topic Selection */}
            {!lesson && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Choose a Topic</h2>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  {TOPICS.map(topic => (
                    <button
                      key={topic.id}
                      onClick={() => setSelectedTopic(topic.id)}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        selectedTopic === topic.id
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                          : 'border-gray-200 dark:border-gray-600 hover:border-purple-300'
                      }`}
                    >
                      <span className="text-2xl">{topic.icon}</span>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-2">{topic.name}</p>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Level</label>
                    <select
                      value={selectedLevel}
                      onChange={(e) => setSelectedLevel(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      {LEVELS.map(level => (
                        <option key={level.id} value={level.id}>{level.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Focus Area</label>
                    <select
                      value={selectedFocus}
                      onChange={(e) => setSelectedFocus(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      {FOCUS_AREAS.map(area => (
                        <option key={area.id} value={area.id}>{area.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  onClick={generateLesson}
                  disabled={!selectedTopic || loading}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Sparkles className="w-5 h-5" />
                  )}
                  Generate Lesson
                </button>
              </div>
            )}

            {/* Lesson Content */}
            {lesson && (
              <div className="space-y-6">
                <button
                  onClick={() => setLesson(null)}
                  className="text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                >
                  ← Choose another topic
                </button>

                {/* Lesson Header */}
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-6 text-white">
                  <h2 className="text-2xl font-bold mb-2">{lesson.title}</h2>
                  <p className="opacity-90">{lesson.introduction}</p>
                </div>

                {/* Key Points */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-yellow-500" />
                    Key Points
                  </h3>
                  <ul className="space-y-2">
                    {lesson.keyPoints.map((point, i) => (
                      <li key={i} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                        <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Examples */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-blue-500" />
                    Examples
                  </h3>
                  <div className="space-y-4">
                    {lesson.examples.map((example, i) => (
                      <div key={i} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <p className="font-medium text-gray-900 dark:text-white">{example.english}</p>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">🇪🇸 {example.spanish}</p>
                        <p className="text-sm text-purple-600 dark:text-purple-400 mt-2">💡 {example.explanation}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Content Creator Tips */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    Creator Tips
                  </h3>
                  <ul className="space-y-2">
                    {lesson.contentCreatorTips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                        <span className="text-purple-500">•</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Common Mistakes */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    Common Mistakes
                  </h3>
                  <div className="space-y-3">
                    {lesson.commonMistakes.map((mistake, i) => (
                      <div key={i} className="flex items-start gap-4">
                        <div className="flex-1 p-2 bg-red-50 dark:bg-red-900/20 rounded text-red-700 dark:text-red-300 line-through">
                          {mistake.wrong}
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 mt-2" />
                        <div className="flex-1 p-2 bg-green-50 dark:bg-green-900/20 rounded text-green-700 dark:text-green-300">
                          {mistake.correct}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quiz */}
                {quiz.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-purple-500" />
                      Quick Quiz
                    </h3>
                    
                    {quizComplete ? (
                      <div className="text-center py-8">
                        <Trophy className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
                        <h4 className="text-2xl font-bold text-gray-900 dark:text-white">
                          Quiz Complete!
                        </h4>
                        <p className="text-lg text-gray-600 dark:text-gray-400 mt-2">
                          You scored {quizScore} out of {quiz.length}
                        </p>
                        <button
                          onClick={() => {
                            setCurrentQuizIndex(0);
                            setQuizScore(0);
                            setQuizComplete(false);
                            setSelectedAnswer(null);
                            setShowResult(false);
                          }}
                          className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                        >
                          Try Again
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-sm text-gray-500">
                            Question {currentQuizIndex + 1} of {quiz.length}
                          </span>
                          <span className="text-sm text-purple-600">
                            Score: {quizScore}
                          </span>
                        </div>
                        
                        <p className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                          {quiz[currentQuizIndex].question}
                        </p>
                        
                        <div className="space-y-2">
                          {quiz[currentQuizIndex].options.map((option, i) => (
                            <button
                              key={i}
                              onClick={() => handleQuizAnswer(i)}
                              disabled={showResult}
                              className={`w-full p-3 text-left rounded-lg border-2 transition-all ${
                                showResult
                                  ? i === quiz[currentQuizIndex].correctIndex
                                    ? 'border-green-500 bg-green-50 dark:bg-green-900/30'
                                    : selectedAnswer === i
                                    ? 'border-red-500 bg-red-50 dark:bg-red-900/30'
                                    : 'border-gray-200 dark:border-gray-600'
                                  : selectedAnswer === i
                                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                                  : 'border-gray-200 dark:border-gray-600 hover:border-purple-300'
                              }`}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                        
                        {showResult && (
                          <div className="mt-4">
                            <p className={`text-sm ${
                              selectedAnswer === quiz[currentQuizIndex].correctIndex
                                ? 'text-green-600'
                                : 'text-red-600'
                            }`}>
                              {quiz[currentQuizIndex].explanation}
                            </p>
                            <button
                              onClick={nextQuestion}
                              className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                            >
                              {currentQuizIndex < quiz.length - 1 ? 'Next Question' : 'See Results'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

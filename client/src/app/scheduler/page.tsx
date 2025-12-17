'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { 
  Calendar, Clock, Plus, Trash2, Edit2, Send, 
  Sparkles, RefreshCw, ChevronLeft, ChevronRight,
  X, Check, AlertCircle
} from 'lucide-react';

interface ScheduledPost {
  id: string;
  content: string;
  contentEs?: string;
  platforms: string[];
  hashtags: string[];
  scheduledAt: string;
  status: 'scheduled' | 'published' | 'failed';
  mediaUrls?: string[];
}

interface TimeSlot {
  time: string;
  posts: ScheduledPost[];
}

const TIMES = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'
];

export default function SchedulerPage() {
  const { accessToken } = useAuthStore();
  const router = useRouter();
  
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState(getWeekStart(new Date()));
  const [selectedSlot, setSelectedSlot] = useState<{ date: Date; time: string } | null>(null);
  const [showQuickPost, setShowQuickPost] = useState(false);
  const [quickPostContent, setQuickPostContent] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!accessToken) {
      router.push('/login');
      return;
    }
    fetchScheduledPosts();
  }, [accessToken, router, currentWeekStart]);

  function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  function getWeekDays(): Date[] {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(currentWeekStart);
      day.setDate(day.getDate() + i);
      days.push(day);
    }
    return days;
  }

  const fetchScheduledPosts = async () => {
    try {
      setLoading(true);
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      
      const response = await api.get('/posts/scheduled', {
        params: {
          startDate: currentWeekStart.toISOString(),
          endDate: weekEnd.toISOString()
        }
      });
      setScheduledPosts(response.data.posts || []);
    } catch (err) {
      console.error('Failed to fetch scheduled posts:', err);
      setScheduledPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeekStart(newStart);
  };

  const getPostsForSlot = (date: Date, time: string): ScheduledPost[] => {
    return scheduledPosts.filter(post => {
      const postDate = new Date(post.scheduledAt);
      const postTime = postDate.toTimeString().slice(0, 5);
      return (
        postDate.toDateString() === date.toDateString() &&
        postTime === time
      );
    });
  };

  const handleSlotClick = (date: Date, time: string) => {
    setSelectedSlot({ date, time });
    setShowQuickPost(true);
  };

  const generateAIContent = async () => {
    setAiGenerating(true);
    try {
      const response = await api.post('/ai/generate-caption', {
        prompt: 'Create an engaging social media post',
        options: {
          platform: 'twitter',
          tone: 'professional',
          includeHashtags: true,
          includeEmojis: true
        }
      });
      setQuickPostContent(response.data.caption);
    } catch (err) {
      setError('Failed to generate content');
    } finally {
      setAiGenerating(false);
    }
  };

  const scheduleQuickPost = async () => {
    if (!selectedSlot || !quickPostContent) return;

    try {
      const scheduledAt = new Date(selectedSlot.date);
      const [hours, minutes] = selectedSlot.time.split(':');
      scheduledAt.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      await api.post('/posts', {
        content: { text: quickPostContent },
        platforms: ['twitter'],
        scheduledAt: scheduledAt.toISOString()
      });

      setShowQuickPost(false);
      setQuickPostContent('');
      setSelectedSlot(null);
      fetchScheduledPosts();
    } catch (err) {
      setError('Failed to schedule post');
    }
  };

  const deleteScheduledPost = async (postId: string) => {
    try {
      await api.delete(`/posts/${postId}`);
      fetchScheduledPosts();
    } catch (err) {
      setError('Failed to delete post');
    }
  };

  const weekDays = getWeekDays();
  const totalScheduled = scheduledPosts.length;
  const remainingSlots = 24 - totalScheduled;

  if (!accessToken) return null;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Post Scheduler</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {totalScheduled}/24 posts scheduled • {remainingSlots} slots available
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigateWeek('prev')}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[200px] text-center">
              {currentWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - 
              {new Date(currentWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <button
              onClick={() => navigateWeek('next')}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
            <p className="text-sm text-gray-500 dark:text-gray-400">Scheduled</p>
            <p className="text-2xl font-bold text-blue-600">{totalScheduled}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
            <p className="text-sm text-gray-500 dark:text-gray-400">Available</p>
            <p className="text-2xl font-bold text-green-600">{remainingSlots}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
            <p className="text-sm text-gray-500 dark:text-gray-400">This Week</p>
            <p className="text-2xl font-bold text-purple-600">{scheduledPosts.filter(p => p.status === 'scheduled').length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
            <p className="text-sm text-gray-500 dark:text-gray-400">Published</p>
            <p className="text-2xl font-bold text-gray-600">{scheduledPosts.filter(p => p.status === 'published').length}</p>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700">
                    <th className="p-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400 w-20">Time</th>
                    {weekDays.map((day, i) => (
                      <th key={i} className="p-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                        <div className={`${day.toDateString() === new Date().toDateString() ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                          <div>{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                          <div className="text-lg font-bold">{day.getDate()}</div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TIMES.map(time => (
                    <tr key={time} className="border-t border-gray-100 dark:border-gray-700">
                      <td className="p-2 text-sm text-gray-500 dark:text-gray-400">{time}</td>
                      {weekDays.map((day, i) => {
                        const posts = getPostsForSlot(day, time);
                        const isPast = new Date(`${day.toISOString().split('T')[0]}T${time}`) < new Date();
                        
                        return (
                          <td 
                            key={i} 
                            className={`p-1 border-l border-gray-100 dark:border-gray-700 ${isPast ? 'bg-gray-50 dark:bg-gray-800/50' : ''}`}
                          >
                            {posts.length > 0 ? (
                              <div className="space-y-1">
                                {posts.map(post => (
                                  <div
                                    key={post.id}
                                    className={`p-2 rounded text-xs ${
                                      post.status === 'published' 
                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                        : post.status === 'failed'
                                        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                    }`}
                                  >
                                    <p className="truncate">{post.content.slice(0, 30)}...</p>
                                    <div className="flex items-center justify-between mt-1">
                                      <span className="opacity-60">{post.platforms.join(', ')}</span>
                                      {post.status === 'scheduled' && (
                                        <button
                                          onClick={() => deleteScheduledPost(post.id)}
                                          className="text-red-500 hover:text-red-700"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : !isPast && remainingSlots > 0 ? (
                              <button
                                onClick={() => handleSlotClick(day, time)}
                                className="w-full h-12 rounded border-2 border-dashed border-gray-200 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center justify-center"
                              >
                                <Plus className="w-4 h-4 text-gray-400" />
                              </button>
                            ) : (
                              <div className="w-full h-12" />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Post Modal */}
        {showQuickPost && selectedSlot && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Schedule Post
                </h3>
                <button
                  onClick={() => setShowQuickPost(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {selectedSlot.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at {selectedSlot.time}
              </p>

              <textarea
                value={quickPostContent}
                onChange={(e) => setQuickPostContent(e.target.value)}
                placeholder="What do you want to share?"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 resize-none"
                rows={4}
              />

              <div className="flex gap-3 mt-4">
                <button
                  onClick={generateAIContent}
                  disabled={aiGenerating}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50"
                >
                  {aiGenerating ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  AI Generate
                </button>
                
                <button
                  onClick={scheduleQuickPost}
                  disabled={!quickPostContent}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <Calendar className="w-4 h-4" />
                  Schedule
                </button>
              </div>

              {error && (
                <p className="mt-3 text-sm text-red-500">{error}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

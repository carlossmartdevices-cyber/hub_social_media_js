import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { EventDropArg, EventClickArg } from '@fullcalendar/interaction';
import api from '../lib/api';

interface Post {
  id: string;
  platforms: string[];
  content: {
    text: string;
  };
  scheduled_at: string;
  status: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  backgroundColor: string;
  borderColor: string;
  extendedProps: {
    platforms: string[];
    status: string;
  };
}

export function PostCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Platform colors
  const platformColors: Record<string, string> = {
    twitter: '#1DA1F2',
    instagram: '#E4405F',
    facebook: '#4267B2',
    linkedin: '#0077B5',
    telegram: '#0088CC',
    youtube: '#FF0000',
    tiktok: '#000000',
  };

  const statusColors: Record<string, string> = {
    scheduled: '#10B981',
    draft: '#6B7280',
    published: '#3B82F6',
    failed: '#EF4444',
    cancelled: '#9CA3AF',
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/posts?limit=200');
      const posts: Post[] = response.data.posts;

      const calendarEvents: CalendarEvent[] = posts
        .filter(post => post.scheduled_at)
        .map(post => ({
          id: post.id,
          title: `${post.platforms.join(', ')}: ${post.content.text.substring(0, 50)}...`,
          start: new Date(post.scheduled_at),
          backgroundColor: statusColors[post.status] || '#6B7280',
          borderColor: platformColors[post.platforms[0]] || '#6B7280',
          extendedProps: {
            platforms: post.platforms,
            status: post.status,
          },
        }));

      setEvents(calendarEvents);
    } catch (error: any) {
      console.error('Failed to fetch posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEventDrop = async (info: EventDropArg) => {
    try {
      const postId = info.event.id;
      const newDate = info.event.start;

      if (!newDate) return;

      // Update the post's scheduled date
      await api.patch(`/posts/${postId}/reschedule`, {
        scheduledAt: newDate.toISOString(),
      });

      // Show success message (you can add a toast notification here)
      console.log('Post rescheduled successfully');
    } catch (error: any) {
      console.error('Failed to reschedule post:', error);
      // Revert the event position
      info.revert();
      alert('Failed to reschedule post. Please try again.');
    }
  };

  const handleEventClick = async (info: EventClickArg) => {
    try {
      const response = await api.get(`/posts/${info.event.id}`);
      setSelectedPost(response.data.post);
      setShowModal(true);
    } catch (error: any) {
      console.error('Failed to fetch post details:', error);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedPost(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Post Calendar</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Drag and drop posts to reschedule them
        </p>
      </div>

      {/* Legend */}
      <div className="mb-4 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-700 dark:text-gray-300">Status:</span>
          {Object.entries(statusColors).map(([status, color]) => (
            <div key={status} className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: color }}></div>
              <span className="text-gray-600 dark:text-gray-400 capitalize">{status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar */}
      <div className="calendar-container">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          events={events}
          editable={true}
          droppable={true}
          eventDrop={handleEventDrop}
          eventClick={handleEventClick}
          height="auto"
          eventTimeFormat={{
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          }}
        />
      </div>

      {/* Post Detail Modal */}
      {showModal && selectedPost && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black opacity-50" onClick={handleCloseModal}></div>

            <div className="relative bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full p-6 z-10">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Post Details</h3>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Platforms:</span>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {selectedPost.platforms.map(platform => (
                      <span
                        key={platform}
                        className="px-2 py-1 rounded text-white text-sm"
                        style={{ backgroundColor: platformColors[platform] || '#6B7280' }}
                      >
                        {platform}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Status:</span>
                  <span
                    className="ml-2 px-2 py-1 rounded text-white text-sm capitalize"
                    style={{ backgroundColor: statusColors[selectedPost.status] || '#6B7280' }}
                  >
                    {selectedPost.status}
                  </span>
                </div>

                <div>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Scheduled:</span>
                  <p className="mt-1 text-gray-600 dark:text-gray-400">
                    {new Date(selectedPost.scheduled_at).toLocaleString()}
                  </p>
                </div>

                <div>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Content:</span>
                  <p className="mt-1 text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                    {selectedPost.content.text}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .calendar-container .fc {
          font-family: inherit;
        }

        .calendar-container .fc-toolbar-title {
          color: var(--tw-prose-headings);
        }

        .dark .fc {
          --fc-border-color: #374151;
          --fc-button-bg-color: #4F46E5;
          --fc-button-border-color: #4F46E5;
          --fc-button-hover-bg-color: #4338CA;
          --fc-button-hover-border-color: #4338CA;
          --fc-button-active-bg-color: #3730A3;
          --fc-button-active-border-color: #3730A3;
          --fc-today-bg-color: rgba(99, 102, 241, 0.1);
        }

        .dark .fc-theme-standard td,
        .dark .fc-theme-standard th {
          border-color: #374151;
        }

        .dark .fc-col-header-cell {
          background-color: #1F2937;
          color: #D1D5DB;
        }

        .dark .fc-daygrid-day-number {
          color: #D1D5DB;
        }

        .dark .fc-toolbar-title {
          color: #F9FAFB;
        }

        .fc-event {
          cursor: pointer;
        }

        .fc-event:hover {
          opacity: 0.8;
        }
      `}</style>
    </div>
  );
}

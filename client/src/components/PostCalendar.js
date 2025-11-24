import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import api from '../lib/api';
export function PostCalendar() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPost, setSelectedPost] = useState(null);
    const [showModal, setShowModal] = useState(false);
    // Platform colors
    const platformColors = {
        twitter: '#1DA1F2',
        instagram: '#E4405F',
        facebook: '#4267B2',
        linkedin: '#0077B5',
        telegram: '#0088CC',
        youtube: '#FF0000',
        tiktok: '#000000',
    };
    const statusColors = {
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
            const posts = response.data.posts;
            const calendarEvents = posts
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
        }
        catch (error) {
            console.error('Failed to fetch posts:', error);
        }
        finally {
            setLoading(false);
        }
    };
    const handleEventDrop = async (info) => {
        try {
            const postId = info.event.id;
            const newDate = info.event.start;
            if (!newDate)
                return;
            // Update the post's scheduled date
            await api.patch(`/posts/${postId}/reschedule`, {
                scheduledAt: newDate.toISOString(),
            });
            // Show success message (you can add a toast notification here)
            console.log('Post rescheduled successfully');
        }
        catch (error) {
            console.error('Failed to reschedule post:', error);
            // Revert the event position
            info.revert();
            alert('Failed to reschedule post. Please try again.');
        }
    };
    const handleEventClick = async (info) => {
        try {
            const response = await api.get(`/posts/${info.event.id}`);
            setSelectedPost(response.data.post);
            setShowModal(true);
        }
        catch (error) {
            console.error('Failed to fetch post details:', error);
        }
    };
    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedPost(null);
    };
    if (loading) {
        return (_jsx("div", { className: "flex items-center justify-center h-96", children: _jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" }) }));
    }
    return (_jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow p-6", children: [_jsxs("div", { className: "mb-4", children: [_jsx("h2", { className: "text-2xl font-bold text-gray-900 dark:text-white", children: "Post Calendar" }), _jsx("p", { className: "text-gray-600 dark:text-gray-400 mt-1", children: "Drag and drop posts to reschedule them" })] }), _jsx("div", { className: "mb-4 flex flex-wrap gap-4 text-sm", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "font-semibold text-gray-700 dark:text-gray-300", children: "Status:" }), Object.entries(statusColors).map(([status, color]) => (_jsxs("div", { className: "flex items-center gap-1", children: [_jsx("div", { className: "w-3 h-3 rounded", style: { backgroundColor: color } }), _jsx("span", { className: "text-gray-600 dark:text-gray-400 capitalize", children: status })] }, status)))] }) }), _jsx("div", { className: "calendar-container", children: _jsx(FullCalendar, { plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin], initialView: "dayGridMonth", headerToolbar: {
                        left: 'prev,next today',
                        center: 'title',
                        right: 'dayGridMonth,timeGridWeek,timeGridDay',
                    }, events: events, editable: true, droppable: true, eventDrop: handleEventDrop, eventClick: handleEventClick, height: "auto", eventTimeFormat: {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                    } }) }), showModal && selectedPost && (_jsx("div", { className: "fixed inset-0 z-50 overflow-y-auto", children: _jsxs("div", { className: "flex items-center justify-center min-h-screen px-4", children: [_jsx("div", { className: "fixed inset-0 bg-black opacity-50", onClick: handleCloseModal }), _jsxs("div", { className: "relative bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full p-6 z-10", children: [_jsxs("div", { className: "flex justify-between items-start mb-4", children: [_jsx("h3", { className: "text-xl font-bold text-gray-900 dark:text-white", children: "Post Details" }), _jsx("button", { onClick: handleCloseModal, className: "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200", children: _jsx("svg", { className: "w-6 h-6", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }) }) })] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("span", { className: "font-semibold text-gray-700 dark:text-gray-300", children: "Platforms:" }), _jsx("div", { className: "mt-1 flex flex-wrap gap-2", children: selectedPost.platforms.map(platform => (_jsx("span", { className: "px-2 py-1 rounded text-white text-sm", style: { backgroundColor: platformColors[platform] || '#6B7280' }, children: platform }, platform))) })] }), _jsxs("div", { children: [_jsx("span", { className: "font-semibold text-gray-700 dark:text-gray-300", children: "Status:" }), _jsx("span", { className: "ml-2 px-2 py-1 rounded text-white text-sm capitalize", style: { backgroundColor: statusColors[selectedPost.status] || '#6B7280' }, children: selectedPost.status })] }), _jsxs("div", { children: [_jsx("span", { className: "font-semibold text-gray-700 dark:text-gray-300", children: "Scheduled:" }), _jsx("p", { className: "mt-1 text-gray-600 dark:text-gray-400", children: new Date(selectedPost.scheduled_at).toLocaleString() })] }), _jsxs("div", { children: [_jsx("span", { className: "font-semibold text-gray-700 dark:text-gray-300", children: "Content:" }), _jsx("p", { className: "mt-1 text-gray-600 dark:text-gray-400 whitespace-pre-wrap", children: selectedPost.content.text })] })] }), _jsx("div", { className: "mt-6 flex justify-end", children: _jsx("button", { onClick: handleCloseModal, className: "px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700", children: "Close" }) })] })] }) })), _jsx("style", { children: `
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
      ` })] }));
}

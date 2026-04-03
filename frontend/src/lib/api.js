import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_URL = `${BACKEND_URL}/api`;

// Create axios instance
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle auth errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authAPI = {
    register: (data) => api.post('/auth/register', data),
    login: (data) => api.post('/auth/login', data),
    getMe: () => api.get('/auth/me'),
    getOnboardingStatus: () => api.get('/auth/onboarding-status'),
    completeOnboarding: () => api.post('/auth/onboarding-complete'),
    completeOnboardingStep: (step) => api.post(`/auth/onboarding-step?step=${step}`),
};

// Users API
export const usersAPI = {
    getAll: () => api.get('/users'),
    getPending: () => api.get('/users/pending'),
    getUnassigned: () => api.get('/users/unassigned'),
    approve: (userId) => api.put(`/users/${userId}/approve`),
    updateRole: (userId, role) => api.put(`/users/${userId}/role?role=${role}`),
    assignGroup: (userId, groupId) => api.put(`/users/${userId}/assign-group?group_id=${groupId}`),
    mute: (userId, muted) => api.put(`/users/${userId}/mute?muted=${muted}`),
    delete: (userId) => api.delete(`/users/${userId}`),
    getTeachers: () => api.get('/teachers'),
};

// Courses API
export const coursesAPI = {
    getAll: () => api.get('/courses'),
    getOne: (id) => api.get(`/courses/${id}`),
    create: (data) => api.post('/courses', data),
    update: (id, data) => api.put(`/courses/${id}`, data),
    delete: (id) => api.delete(`/courses/${id}`),
    enroll: (id) => api.post(`/courses/${id}/enroll`),
    unenroll: (id) => api.delete(`/courses/${id}/enroll`),
    getEnrollments: (id) => api.get(`/courses/${id}/enrollments`),
    publish: (id) => api.post(`/courses/${id}/publish`),
    unpublish: (id) => api.post(`/courses/${id}/unpublish`),
    getProgress: (id) => api.get(`/courses/${id}/progress`),
    uploadCover: (id, file) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post(`/courses/${id}/cover`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },
};

// Lessons API
export const lessonsAPI = {
    getByCourse: (courseId) => api.get(`/courses/${courseId}/lessons`),
    getAll: () => api.get('/lessons/all'),
    getOne: (id) => api.get(`/lessons/${id}`),
    getNext: () => api.get('/lessons/next/upcoming'),
    create: (data) => api.post('/lessons', data),
    update: (id, data) => api.put(`/lessons/${id}`, data),
    delete: (id) => api.delete(`/lessons/${id}`),
    markComplete: (id) => api.post(`/lessons/${id}/complete`),
    unmarkComplete: (id) => api.delete(`/lessons/${id}/complete`),
};

// Enrollments API
export const enrollmentsAPI = {
    getMy: () => api.get('/enrollments/my'),
};

// Comments API
export const commentsAPI = {
    getByLesson: (lessonId) => api.get(`/lessons/${lessonId}/comments`),
    create: (lessonId, content) => api.post(`/lessons/${lessonId}/comments`, { content }),
    hide: (commentId, hidden) => api.put(`/comments/${commentId}/hide?hidden=${hidden}`),
    delete: (commentId) => api.delete(`/comments/${commentId}`),
};

// Chat API
export const chatAPI = {
    getMessages: (limit = 100) => api.get(`/chat?limit=${limit}`),
    send: (content) => api.post('/chat', { content }),
    hide: (messageId, hidden) => api.put(`/chat/${messageId}/hide?hidden=${hidden}`),
    delete: (messageId) => api.delete(`/chat/${messageId}`),
};

// Private Messages API
export const messagesAPI = {
    getInbox: () => api.get('/messages/inbox'),
    send: (teacherId, content) => api.post('/messages', { teacher_id: teacherId, content }),
    markRead: (messageId) => api.put(`/messages/${messageId}/read`),
};

// Resources API
export const resourcesAPI = {
    upload: (lessonId, file) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post(`/lessons/${lessonId}/resources`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },
    download: (resourceId) => `${API_URL}/resources/${resourceId}/download`,
    delete: (resourceId) => api.delete(`/resources/${resourceId}`),
    setPrimary: (resourceId) => api.put(`/resources/${resourceId}/primary`),
    updateOrder: (resourceId, order) => api.put(`/resources/${resourceId}/order?order=${order}`),
    reorder: (items) => api.put('/resources/reorder', items),
    replace: (resourceId, file) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.put(`/resources/${resourceId}/replace`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },
};

// Attendance API
export const attendanceAPI = {
    record: (lessonId, action) => api.post('/attendance', { lesson_id: lessonId, action }),
    getByLesson: (lessonId) => api.get(`/attendance/lesson/${lessonId}`),
    getMy: (lessonId) => api.get(`/attendance/my/${lessonId}`),
};

// Video Room API (Daily.co)
export const videoRoomAPI = {
    join: (lessonId) => api.post(`/lessons/${lessonId}/video/join`),
    getStatus: (lessonId) => api.get(`/lessons/${lessonId}/video/status`),
    getRecordings: (lessonId) => api.get(`/lessons/${lessonId}/recordings`),
    // Recording controls (teacher/admin only)
    startRecording: (lessonId) => api.post(`/lessons/${lessonId}/recording/start`),
    stopRecording: (lessonId, recordingId) => api.post(`/lessons/${lessonId}/recording/stop?recording_id=${recordingId}`),
    getRecordingStatus: (lessonId) => api.get(`/lessons/${lessonId}/recording/status`),
};

// Prompt Responses API (legacy)
export const promptAPI = {
    respond: (lessonId, content) => api.post(`/lessons/${lessonId}/respond`, { content }),
    getResponses: (lessonId) => api.get(`/lessons/${lessonId}/responses`),
};

// Teacher Prompts API (new lesson-centric)
export const teacherPromptsAPI = {
    getByLesson: (lessonId) => api.get(`/lessons/${lessonId}/prompts`),
    create: (lessonId, question, order = 0) => api.post(`/lessons/${lessonId}/prompts`, { question, order }),
    update: (promptId, question, order) => api.put(`/prompts/${promptId}`, { question, order }),
    delete: (promptId) => api.delete(`/prompts/${promptId}`),
    // Replies
    getReplies: (promptId) => api.get(`/prompts/${promptId}/replies`),
    getAllReplies: (lessonId) => api.get(`/lessons/${lessonId}/all-replies`),
    reply: (promptId, content) => api.post(`/prompts/${promptId}/reply`, { content }),
    pinReply: (replyId, pinned) => api.put(`/replies/${replyId}/pin?pinned=${pinned}`),
    updateReplyStatus: (replyId, status) => api.put(`/replies/${replyId}/status?status=${status}`),
    deleteReply: (replyId) => api.delete(`/replies/${replyId}`),
    // Private Feedback
    createFeedback: (replyId, content) => api.post(`/replies/${replyId}/feedback`, { content }),
    getFeedbackForReply: (replyId) => api.get(`/replies/${replyId}/feedback`),
};

// Analytics API
export const analyticsAPI = {
    getOverview: () => api.get('/analytics'),
    getParticipation: () => api.get('/analytics/participation'),
};

// Progress API
export const progressAPI = {
    getMyProgress: () => api.get('/my-progress'),
    getStudentProgress: () => api.get('/teacher/student-progress'),
};

// Search API
export const searchAPI = {
    search: (query) => api.get('/search', { params: { q: query } }),
};

// Attendance API
export const attendanceReportsAPI = {
    getReport: (courseId, lessonId) => api.get('/attendance/report', { 
        params: { course_id: courseId, lesson_id: lessonId } 
    }),
    getSummary: () => api.get('/attendance/summary'),
    reset: (courseId) => api.delete('/attendance/reset', { params: { course_id: courseId } }),
    deleteUserAttendance: (userId) => api.delete(`/attendance/user/${userId}`),
};

// Profile API
export const profileAPI = {
    updateName: (name) => api.put('/auth/update-name', { name }),
    changePassword: (currentPassword, newPassword) => api.put('/auth/change-password', { current_password: currentPassword, new_password: newPassword }),
};

// Certificates API
export const certificatesAPI = {
    download: (courseId) => `${BACKEND_URL}/api/courses/${courseId}/certificate`,
};

// Feedback API
export const feedbackAPI = {
    getMyFeedback: () => api.get('/my-feedback'),
    getUnreadCount: () => api.get('/my-feedback/unread-count'),
    markRead: (feedbackId) => api.put(`/feedback/${feedbackId}/read`),
};

// Notifications API
export const notificationsAPI = {
    sendLessonReminders: () => api.post('/notifications/send-lesson-reminders'),
};

// Seed API
export const seedAPI = {
    seed: () => api.post('/seed'),
};

// Groups API (multi-tenant)
export const groupsAPI = {
    getAll: () => api.get('/groups/all'),
    getMy: () => api.get('/groups/my'),
    create: (data) => api.post('/groups', data),
    update: (groupId, data) => api.put(`/groups/${groupId}`, data),
    delete: (groupId) => api.delete(`/groups/${groupId}`),
    getMembers: (groupId) => api.get(`/groups/${groupId}/members`),
    getInviteCode: (groupId) => api.get(`/groups/${groupId}/invite-code`),
    regenerateCode: (groupId) => api.post(`/groups/${groupId}/regenerate-code`),
    join: (inviteCode) => api.post(`/groups/join?invite_code=${inviteCode}`),
    lookup: (inviteCode) => api.get(`/groups/lookup?invite_code=${inviteCode}`),
    migrate: () => api.post('/admin/migrate-to-multi-tenant'),
};

export default api;

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
};

// Users API
export const usersAPI = {
    getAll: () => api.get('/users'),
    getPending: () => api.get('/users/pending'),
    approve: (userId) => api.put(`/users/${userId}/approve`),
    updateRole: (userId, role) => api.put(`/users/${userId}/role?role=${role}`),
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
};

// Attendance API
export const attendanceAPI = {
    record: (lessonId, action) => api.post('/attendance', { lesson_id: lessonId, action }),
    getByLesson: (lessonId) => api.get(`/attendance/lesson/${lessonId}`),
    getMy: (lessonId) => api.get(`/attendance/my/${lessonId}`),
};

// Prompt Responses API
export const promptAPI = {
    respond: (lessonId, content) => api.post(`/lessons/${lessonId}/respond`, { content }),
    getResponses: (lessonId) => api.get(`/lessons/${lessonId}/responses`),
};

// Analytics API
export const analyticsAPI = {
    getOverview: () => api.get('/analytics'),
    getParticipation: () => api.get('/analytics/participation'),
};

// Seed API
export const seedAPI = {
    seed: () => api.post('/seed'),
};

export default api;

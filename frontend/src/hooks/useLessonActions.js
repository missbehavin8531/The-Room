import { useState, useRef } from 'react';
import { lessonsAPI, commentsAPI, resourcesAPI, attendanceAPI, coursesAPI, teacherPromptsAPI, videoRoomAPI } from '../lib/api';
import { toast } from 'sonner';

/**
 * Custom hook encapsulating all lesson detail state and handlers.
 * Extracted from LessonDetail.jsx to reduce component complexity.
 */
export function useLessonActions(lessonId, user, navigate) {
    const isTeacherOrAdmin = user?.role === 'teacher' || user?.role === 'admin';
    const isGuest = user?.role === 'guest';

    // Core state
    const [lesson, setLesson] = useState(null);
    const [course, setCourse] = useState(null);
    const [activeTab, setActiveTab] = useState('lesson');
    const [loading, setLoading] = useState(true);

    // Discussion
    const [prompts, setPrompts] = useState([]);
    const [activePromptId, setActivePromptId] = useState(null);
    const [promptReplies, setPromptReplies] = useState({});
    const [newReply, setNewReply] = useState('');
    const [submittingReply, setSubmittingReply] = useState(false);

    // Resources
    const [uploading, setUploading] = useState(false);
    const [previewResource, setPreviewResource] = useState(null);
    const fileInputRef = useRef(null);
    const [draggedResource, setDraggedResource] = useState(null);
    const [dragOverResource, setDragOverResource] = useState(null);

    // Attendance
    const [completedActions, setCompletedActions] = useState([]);

    // Delete confirmation
    const [deleteItem, setDeleteItem] = useState(null);

    // Video / Recordings
    const [showVideoRoom, setShowVideoRoom] = useState(false);
    const [roomStatus, setRoomStatus] = useState(null);
    const [recordings, setRecordings] = useState([]);
    const [uploadedRecordings, setUploadedRecordings] = useState([]);
    const [loadingRecordings, setLoadingRecordings] = useState(false);
    const [uploadingVideo, setUploadingVideo] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [showLinkForm, setShowLinkForm] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [linkTitle, setLinkTitle] = useState('Zoom Recording');
    const videoInputRef = useRef(null);

    // --- Data Fetching ---

    const fetchRoomStatus = async () => {
        try {
            const res = await videoRoomAPI.getStatus(lessonId);
            setRoomStatus(res.data);
        } catch (error) {
            console.error('Failed to fetch room status:', error);
        }
    };

    const fetchRecordings = async () => {
        setLoadingRecordings(true);
        try {
            const [dailyRes, uploadedRes] = await Promise.all([
                videoRoomAPI.getRecordings(lessonId).catch(() => ({ data: { recordings: [] } })),
                videoRoomAPI.getUploadedRecordings(lessonId).catch(() => ({ data: [] }))
            ]);
            setRecordings(dailyRes.data.recordings || []);
            setUploadedRecordings(uploadedRes.data || []);
        } catch (error) {
            console.error('Failed to fetch recordings:', error);
            setRecordings([]);
            setUploadedRecordings([]);
        } finally {
            setLoadingRecordings(false);
        }
    };

    const fetchLessonData = async () => {
        try {
            const lessonRes = await lessonsAPI.getOne(lessonId);
            setLesson(lessonRes.data);
            const courseRes = await coursesAPI.getOne(lessonRes.data.course_id);
            setCourse(courseRes.data);
            const attendanceRes = await attendanceAPI.getMy(lessonId);
            setCompletedActions(attendanceRes.data.actions || []);
            const promptsRes = await teacherPromptsAPI.getByLesson(lessonId);
            setPrompts(promptsRes.data);
            if (promptsRes.data.length > 0) {
                setActivePromptId(promptsRes.data[0].id);
                const repliesRes = await teacherPromptsAPI.getReplies(promptsRes.data[0].id);
                setPromptReplies({ [promptsRes.data[0].id]: repliesRes.data });
            }
        } catch (error) {
            toast.error('Failed to load lesson');
            navigate('/courses');
        } finally {
            setLoading(false);
        }
    };

    const fetchPromptReplies = async (promptId) => {
        try {
            const res = await teacherPromptsAPI.getReplies(promptId);
            setPromptReplies(prev => ({ ...prev, [promptId]: res.data }));
        } catch (error) {
            console.error('Failed to fetch replies:', error);
        }
    };

    // --- Attendance ---

    const handleJoinLive = async () => {
        const zoomLink = lesson?.zoom_link || course?.zoom_link;
        if (zoomLink) {
            try {
                await attendanceAPI.record(lessonId, 'joined_live');
                setCompletedActions(prev => [...new Set([...prev, 'joined_live'])]);
                toast.success('Attendance recorded!');
            } catch (error) {
                console.error('Failed to record attendance:', error);
            }
            window.open(zoomLink, '_blank');
        } else {
            toast.info('No Zoom link available for this lesson');
        }
    };

    const handleWatchReplay = async () => {
        try {
            await attendanceAPI.record(lessonId, 'watched_replay');
            setCompletedActions(prev => [...new Set([...prev, 'watched_replay'])]);
        } catch (error) {
            console.error('Failed to record attendance:', error);
        }
    };

    const handleMarkAttended = async () => {
        setCompletedActions(prev => [...new Set([...prev, 'marked_attended'])]);
        toast.success('Marked as attended!');
        try {
            await attendanceAPI.record(lessonId, 'marked_attended');
        } catch (error) {
            setCompletedActions(prev => prev.filter(a => a !== 'marked_attended'));
            toast.error('Failed to mark attendance');
        }
    };

    const handleViewSlides = async () => {
        try {
            await attendanceAPI.record(lessonId, 'viewed_slides');
            setCompletedActions(prev => [...new Set([...prev, 'viewed_slides'])]);
        } catch (error) {
            console.error('Failed to record:', error);
        }
    };

    // --- Recordings ---

    const handleVideoUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const ext = file.name.split('.').pop().toLowerCase();
        if (!['mp4', 'mov', 'webm', 'avi', 'mkv', 'mpeg', 'mpg'].includes(ext)) {
            toast.error('Unsupported format. Use MP4, MOV, or WebM.');
            return;
        }
        if (file.size > 125 * 1024 * 1024) {
            toast.error('File too large. Maximum size is 125MB.');
            return;
        }
        setUploadingVideo(true);
        setUploadProgress(0);
        try {
            await videoRoomAPI.uploadRecording(lessonId, file, (progressEvent) => {
                const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                setUploadProgress(pct);
            });
            toast.success('Recording uploaded!');
            fetchRecordings();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to upload recording');
        } finally {
            setUploadingVideo(false);
            setUploadProgress(0);
            if (videoInputRef.current) videoInputRef.current.value = '';
        }
    };

    const handleAddRecordingLink = async () => {
        if (!linkUrl.trim()) { toast.error('Please enter a URL'); return; }
        try {
            await videoRoomAPI.addRecordingLink(lessonId, linkUrl.trim(), linkTitle.trim() || 'Recording');
            toast.success('Recording link added!');
            setLinkUrl('');
            setLinkTitle('Zoom Recording');
            setShowLinkForm(false);
            fetchRecordings();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to add link');
        }
    };

    const handleDeleteUploadedRecording = async (recordingId) => {
        try {
            await videoRoomAPI.deleteUploadedRecording(recordingId);
            toast.success('Recording deleted');
            setUploadedRecordings(prev => prev.filter(r => r.id !== recordingId));
        } catch (error) {
            toast.error('Failed to delete recording');
        }
    };

    // --- Prompts / Discussion ---

    const handlePromptChange = async (promptId) => {
        setActivePromptId(promptId);
        if (promptId && !promptReplies[promptId]) {
            await fetchPromptReplies(promptId);
        }
    };

    const handleSubmitReply = async (e) => {
        e.preventDefault();
        if (!newReply.trim() || !activePromptId) return;
        const replyContent = newReply.trim();
        const tempId = `temp-${Date.now()}`;
        const optimisticReply = { id: tempId, content: replyContent, user_name: user?.name || 'You', created_at: new Date().toISOString(), _sending: true };
        setPromptReplies(prev => ({ ...prev, [activePromptId]: [...(prev[activePromptId] || []), optimisticReply] }));
        setNewReply('');
        setCompletedActions(prev => [...new Set([...prev, 'responded'])]);
        toast.success('Response submitted!');
        setSubmittingReply(true);
        try {
            const res = await teacherPromptsAPI.reply(activePromptId, replyContent);
            setPromptReplies(prev => ({ ...prev, [activePromptId]: (prev[activePromptId] || []).map(r => r.id === tempId ? { ...res.data, _sending: false } : r) }));
            await attendanceAPI.record(lessonId, 'responded');
        } catch (error) {
            setPromptReplies(prev => ({ ...prev, [activePromptId]: (prev[activePromptId] || []).filter(r => r.id !== tempId) }));
            setCompletedActions(prev => prev.filter(a => a !== 'responded'));
            toast.error(error.response?.data?.detail || 'Failed to submit response');
        } finally {
            setSubmittingReply(false);
        }
    };

    const handlePinReply = async (replyId, pinned) => {
        try {
            await teacherPromptsAPI.pinReply(replyId, pinned);
            setPromptReplies(prev => ({ ...prev, [activePromptId]: prev[activePromptId].map(r => r.id === replyId ? { ...r, is_pinned: pinned } : r) }));
            toast.success(pinned ? 'Reply pinned' : 'Reply unpinned');
        } catch (error) { toast.error('Failed to update reply'); }
    };

    const handleStatusChange = async (replyId, status) => {
        try {
            await teacherPromptsAPI.updateReplyStatus(replyId, status);
            setPromptReplies(prev => ({ ...prev, [activePromptId]: prev[activePromptId].map(r => r.id === replyId ? { ...r, status } : r) }));
            toast.success('Status updated');
        } catch (error) { toast.error('Failed to update status'); }
    };

    const handleDeleteReply = async () => {
        if (!deleteItem) return;
        try {
            await teacherPromptsAPI.deleteReply(deleteItem.id);
            setPromptReplies(prev => ({ ...prev, [activePromptId]: prev[activePromptId].filter(r => r.id !== deleteItem.id) }));
            toast.success('Reply deleted');
        } catch (error) { toast.error('Failed to delete reply'); }
        setDeleteItem(null);
    };

    // --- Resources ---

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 25 * 1024 * 1024) { toast.error('File too large. Maximum size is 25MB'); return; }
        setUploading(true);
        try {
            const res = await resourcesAPI.upload(lessonId, file);
            setLesson(prev => ({ ...prev, resources: [...(prev.resources || []), res.data] }));
            toast.success('File uploaded!');
        } catch (error) { toast.error(error.response?.data?.detail || 'Failed to upload file'); }
        finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
    };

    const handleDeleteResource = async (resourceId) => {
        try {
            await resourcesAPI.delete(resourceId);
            setLesson(prev => ({ ...prev, resources: prev.resources.filter(r => r.id !== resourceId) }));
            toast.success('Resource deleted');
        } catch (error) { toast.error('Failed to delete resource'); }
    };

    const handleSetPrimary = async (resourceId) => {
        try {
            await resourcesAPI.setPrimary(resourceId);
            setLesson(prev => ({ ...prev, resources: prev.resources.map(r => ({ ...r, is_primary: r.id === resourceId })) }));
            toast.success('Set as primary deck');
        } catch (error) { toast.error('Failed to set primary'); }
    };

    const handleResourceDragStart = (e, resource) => {
        setDraggedResource(resource);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', resource.id);
    };

    const handleResourceDragOver = (e, resource) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (resource.id !== draggedResource?.id) setDragOverResource(resource);
    };

    const handleResourceDrop = async (e, targetResource) => {
        e.preventDefault();
        if (!draggedResource || draggedResource.id === targetResource.id) {
            setDraggedResource(null);
            setDragOverResource(null);
            return;
        }
        const currentResources = [...(lesson.resources || [])];
        const dragIdx = currentResources.findIndex(r => r.id === draggedResource.id);
        const dropIdx = currentResources.findIndex(r => r.id === targetResource.id);
        if (dragIdx === -1 || dropIdx === -1) return;
        const moved = currentResources.splice(dragIdx, 1)[0];
        currentResources.splice(dropIdx, 0, moved);
        const reordered = currentResources.map((r, i) => ({ ...r, order: i }));
        setLesson(prev => ({ ...prev, resources: reordered }));
        setDraggedResource(null);
        setDragOverResource(null);
        try { await resourcesAPI.reorder(reordered.map((r, i) => ({ id: r.id, order: i }))); toast.success('Resources reordered'); }
        catch (error) { toast.error('Failed to save order'); }
    };

    const handleResourceDragEnd = () => { setDraggedResource(null); setDragOverResource(null); };

    const moveResource = async (resourceId, direction) => {
        const currentResources = [...(lesson.resources || [])];
        const idx = currentResources.findIndex(r => r.id === resourceId);
        if (idx === -1) return;
        const newIdx = idx + direction;
        if (newIdx < 0 || newIdx >= currentResources.length) return;
        const temp = currentResources[idx];
        currentResources[idx] = currentResources[newIdx];
        currentResources[newIdx] = temp;
        const reordered = currentResources.map((r, i) => ({ ...r, order: i }));
        setLesson(prev => ({ ...prev, resources: reordered }));
        try { await resourcesAPI.reorder(reordered.map((r, i) => ({ id: r.id, order: i }))); }
        catch (error) { toast.error('Failed to save order'); }
    };

    return {
        // State
        lesson, setLesson, course, activeTab, setActiveTab, loading,
        prompts, activePromptId, promptReplies, newReply, setNewReply, submittingReply,
        uploading, previewResource, setPreviewResource, fileInputRef,
        draggedResource, dragOverResource,
        completedActions, deleteItem, setDeleteItem,
        showVideoRoom, setShowVideoRoom, roomStatus,
        recordings, uploadedRecordings, loadingRecordings,
        uploadingVideo, uploadProgress, showLinkForm, setShowLinkForm,
        linkUrl, setLinkUrl, linkTitle, setLinkTitle, videoInputRef,
        isTeacherOrAdmin, isGuest,
        // Handlers
        fetchLessonData, fetchRoomStatus, fetchRecordings,
        handleJoinLive, handleWatchReplay, handleMarkAttended, handleViewSlides,
        handleVideoUpload, handleAddRecordingLink, handleDeleteUploadedRecording,
        handlePromptChange, handleSubmitReply, handlePinReply, handleStatusChange, handleDeleteReply,
        handleFileUpload, handleDeleteResource, handleSetPrimary,
        handleResourceDragStart, handleResourceDragOver, handleResourceDrop, handleResourceDragEnd, moveResource,
    };
}

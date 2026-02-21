import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { lessonsAPI, commentsAPI, resourcesAPI, attendanceAPI, coursesAPI, teacherPromptsAPI, videoRoomAPI } from '../lib/api';
import { formatDate, formatRelativeTime, getYouTubeEmbedUrl, getInitials, formatFileSize, cn } from '../lib/utils';
import { toast } from 'sonner';
import { EmptyState } from '../components/EmptyState';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { FilePreview } from '../components/FilePreview';
import { VideoRoom } from '../components/VideoRoom';
import { 
    ArrowLeft, Video, Calendar, FileText, Image, Presentation,
    Download, Upload, Send, Trash2, Eye, EyeOff, CheckCircle,
    Loader2, Play, BookOpen, MessageCircle, Clock, ChevronRight,
    Pin, Star, Users, BookMarked, Edit, BarChart3, AlertCircle
} from 'lucide-react';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import ReactMarkdown from 'react-markdown';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Helper functions for status
const getStatusStyle = (status) => {
    switch(status) {
        case 'answered': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
        case 'needs_followup': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
        default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
};

const getStatusLabel = (status) => {
    switch(status) {
        case 'answered': return 'Answered';
        case 'needs_followup': return 'Follow-up';
        default: return 'Pending';
    }
};

// Separate component to avoid babel plugin recursion issues
const StatusDropdownItems = ({ onSelect }) => (
    <>
        <DropdownMenuItem onClick={() => onSelect('pending')}>
            <Clock className="w-4 h-4 mr-2" />
            Pending
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSelect('answered')}>
            <CheckCircle className="w-4 h-4 mr-2" />
            Answered
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSelect('needs_followup')}>
            <AlertCircle className="w-4 h-4 mr-2" />
            Follow-up
        </DropdownMenuItem>
    </>
);

// Tab definitions for Now/Next/After flow
const LESSON_TABS = [
    { key: 'now', label: 'NOW', subtitle: 'Join Live', icon: Video, color: 'bg-blue-500' },
    { key: 'next', label: 'NEXT', subtitle: 'Watch Replay', icon: Play, color: 'bg-purple-500' },
    { key: 'after', label: 'AFTER', subtitle: 'Engage', icon: BookOpen, color: 'bg-green-500' },
];

const getResourceIcon = (fileType) => {
    switch (fileType) {
        case 'pdf': return FileText;
        case 'ppt': return Presentation;
        case 'image': return Image;
        default: return FileText;
    }
};

export const LessonDetail = () => {
    const { lessonId } = useParams();
    const navigate = useNavigate();
    const { user, isTeacherOrAdmin } = useAuth();
    const [lesson, setLesson] = useState(null);
    const [course, setCourse] = useState(null);
    const [activeTab, setActiveTab] = useState('now');
    const [loading, setLoading] = useState(true);
    
    // Discussion state
    const [prompts, setPrompts] = useState([]);
    const [activePromptId, setActivePromptId] = useState(null);
    const [promptReplies, setPromptReplies] = useState({});
    const [newReply, setNewReply] = useState('');
    const [submittingReply, setSubmittingReply] = useState(false);
    
    // Resource state
    const [uploading, setUploading] = useState(false);
    const [previewResource, setPreviewResource] = useState(null);
    const fileInputRef = useRef(null);
    
    // Attendance state
    const [completedActions, setCompletedActions] = useState([]);
    
    // Delete confirmation
    const [deleteItem, setDeleteItem] = useState(null);
    
    // Video room state
    const [showVideoRoom, setShowVideoRoom] = useState(false);
    const [roomStatus, setRoomStatus] = useState(null);
    
    // Recordings state
    const [recordings, setRecordings] = useState([]);
    const [loadingRecordings, setLoadingRecordings] = useState(false);

    useEffect(() => {
        fetchLessonData();
    }, [lessonId]);
    
    // Fetch video room status when on NOW tab
    useEffect(() => {
        if (activeTab === 'now') {
            fetchRoomStatus();
        }
    }, [activeTab, lessonId]);
    
    // Fetch recordings when on NEXT tab
    useEffect(() => {
        if (activeTab === 'next' && lessonId) {
            fetchRecordings();
        }
    }, [activeTab, lessonId]);
    
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
            const res = await videoRoomAPI.getRecordings(lessonId);
            setRecordings(res.data.recordings || []);
        } catch (error) {
            console.error('Failed to fetch recordings:', error);
            setRecordings([]);
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
            
            // Get attendance
            const attendanceRes = await attendanceAPI.getMy(lessonId);
            setCompletedActions(attendanceRes.data.actions || []);
            
            // Get prompts
            const promptsRes = await teacherPromptsAPI.getByLesson(lessonId);
            setPrompts(promptsRes.data);
            
            // Set first prompt as active
            if (promptsRes.data.length > 0) {
                setActivePromptId(promptsRes.data[0].id);
                // Fetch replies for first prompt
                const repliesRes = await teacherPromptsAPI.getReplies(promptsRes.data[0].id);
                setPromptReplies({ [promptsRes.data[0].id]: repliesRes.data });
            }
            
            // Auto-select tab based on lesson status
            const today = new Date().toISOString().split('T')[0];
            const lessonDate = lessonRes.data.lesson_date;
            if (lessonDate && lessonDate < today) {
                setActiveTab('after');
            } else if (lessonRes.data.youtube_url) {
                setActiveTab('next');
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

    const handlePromptChange = async (promptId) => {
        setActivePromptId(promptId);
        if (!promptReplies[promptId]) {
            await fetchPromptReplies(promptId);
        }
    };

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
        try {
            await attendanceAPI.record(lessonId, 'marked_attended');
            setCompletedActions(prev => [...new Set([...prev, 'marked_attended'])]);
            toast.success('Marked as attended!');
        } catch (error) {
            toast.error('Failed to mark attendance');
        }
    };

    const handleSubmitReply = async (e) => {
        e.preventDefault();
        if (!newReply.trim() || !activePromptId) return;

        setSubmittingReply(true);
        try {
            const res = await teacherPromptsAPI.reply(activePromptId, newReply.trim());
            setPromptReplies(prev => ({
                ...prev,
                [activePromptId]: [...(prev[activePromptId] || []), res.data]
            }));
            setNewReply('');
            
            // Record attendance for responding
            await attendanceAPI.record(lessonId, 'responded');
            setCompletedActions(prev => [...new Set([...prev, 'responded'])]);
            toast.success('Response submitted!');
        } catch (error) {
            const message = error.response?.data?.detail || 'Failed to submit response';
            toast.error(message);
        } finally {
            setSubmittingReply(false);
        }
    };

    const handlePinReply = async (replyId, pinned) => {
        try {
            await teacherPromptsAPI.pinReply(replyId, pinned);
            setPromptReplies(prev => ({
                ...prev,
                [activePromptId]: prev[activePromptId].map(r =>
                    r.id === replyId ? { ...r, is_pinned: pinned } : r
                )
            }));
            toast.success(pinned ? 'Reply pinned' : 'Reply unpinned');
        } catch (error) {
            toast.error('Failed to update reply');
        }
    };

    const handleStatusChange = async (replyId, status) => {
        try {
            await teacherPromptsAPI.updateReplyStatus(replyId, status);
            setPromptReplies(prev => ({
                ...prev,
                [activePromptId]: prev[activePromptId].map(r =>
                    r.id === replyId ? { ...r, status } : r
                )
            }));
            toast.success('Status updated');
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    const handleDeleteReply = async () => {
        if (!deleteItem) return;
        try {
            await teacherPromptsAPI.deleteReply(deleteItem.id);
            setPromptReplies(prev => ({
                ...prev,
                [activePromptId]: prev[activePromptId].filter(r => r.id !== deleteItem.id)
            }));
            toast.success('Reply deleted');
        } catch (error) {
            toast.error('Failed to delete reply');
        }
        setDeleteItem(null);
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 25 * 1024 * 1024) {
            toast.error('File too large. Maximum size is 25MB');
            return;
        }

        setUploading(true);
        try {
            const res = await resourcesAPI.upload(lessonId, file);
            setLesson(prev => ({
                ...prev,
                resources: [...(prev.resources || []), res.data]
            }));
            toast.success('File uploaded!');
        } catch (error) {
            const message = error.response?.data?.detail || 'Failed to upload file';
            toast.error(message);
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDeleteResource = async (resourceId) => {
        try {
            await resourcesAPI.delete(resourceId);
            setLesson(prev => ({
                ...prev,
                resources: prev.resources.filter(r => r.id !== resourceId)
            }));
            toast.success('Resource deleted');
        } catch (error) {
            toast.error('Failed to delete resource');
        }
    };

    const handleSetPrimary = async (resourceId) => {
        try {
            await resourcesAPI.setPrimary(resourceId);
            setLesson(prev => ({
                ...prev,
                resources: prev.resources.map(r => ({
                    ...r,
                    is_primary: r.id === resourceId
                }))
            }));
            toast.success('Set as primary deck');
        } catch (error) {
            toast.error('Failed to set primary');
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

    if (loading) {
        return (
            <Layout>
                <div className="page-container py-6 space-y-6">
                    <LoadingSkeleton className="h-8 w-24" />
                    <LoadingSkeleton className="h-12 w-64" />
                    <LoadingSkeleton className="aspect-video rounded-xl" />
                </div>
            </Layout>
        );
    }

    if (!lesson) return null;

    const zoomLink = lesson.zoom_link || course?.zoom_link;
    const resources = lesson.resources || [];
    const primaryResource = resources.find(r => r.is_primary) || resources[0];
    const activeReplies = promptReplies[activePromptId] || [];
    const activePrompt = prompts.find(p => p.id === activePromptId);

    // Sort replies: pinned first
    const sortedReplies = [...activeReplies].sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return new Date(a.created_at) - new Date(b.created_at);
    });

    return (
        <Layout>
            <div className="page-container py-4 md:py-6 space-y-6">
                {/* Back Button + Header */}
                <div className="animate-fade-in">
                    <div className="flex items-center justify-between mb-2">
                        <Link to={`/courses/${lesson.course_id}`}>
                            <Button variant="ghost" className="gap-2 -ml-2 active:scale-95 transition-transform" data-testid="back-to-course-btn">
                                <ArrowLeft className="w-4 h-4" />
                                Back to Course
                            </Button>
                        </Link>
                        
                        {/* Teacher Actions */}
                        {isTeacherOrAdmin && (
                            <div className="flex gap-2">
                                <Link to={`/lessons/${lessonId}/edit`}>
                                    <Button variant="outline" size="sm" className="gap-1" data-testid="edit-lesson-btn">
                                        <Edit className="w-4 h-4" />
                                        <span className="hidden sm:inline">Edit</span>
                                    </Button>
                                </Link>
                                <Link to={`/lessons/${lessonId}/responses`}>
                                    <Button variant="outline" size="sm" className="gap-1" data-testid="view-responses-btn">
                                        <BarChart3 className="w-4 h-4" />
                                        <span className="hidden sm:inline">Responses</span>
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </div>
                    
                    {lesson.lesson_date && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                            <Calendar className="w-4 h-4" />
                            {formatDate(lesson.lesson_date)}
                        </div>
                    )}
                    <h1 className="text-2xl md:text-3xl font-serif font-bold mb-1" data-testid="lesson-title">{lesson.title}</h1>
                    <p className="text-muted-foreground text-sm md:text-base">{lesson.description}</p>
                </div>

                {/* NOW / NEXT / AFTER Tab Navigation */}
                <div className="flex gap-2 md:gap-3 animate-fade-in" style={{ animationDelay: '0.05s' }}>
                    {LESSON_TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={cn(
                                    "flex-1 flex flex-col items-center justify-center py-3 px-2 rounded-xl transition-all duration-200",
                                    "active:scale-95 focus:outline-none",
                                    isActive 
                                        ? "bg-primary text-primary-foreground shadow-lg" 
                                        : "bg-muted hover:bg-muted/80 text-foreground"
                                )}
                                data-testid={`tab-${tab.key}`}
                            >
                                <div className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center mb-1",
                                    isActive ? "bg-white/20" : tab.color
                                )}>
                                    <Icon className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-xs font-bold">{tab.label}</span>
                                <span className="text-xs opacity-75 hidden sm:block">{tab.subtitle}</span>
                            </button>
                        );
                    })}
                </div>

                {/* ============ NOW TAB: Join Live Video Room ============ */}
                {activeTab === 'now' && (
                    <div className="space-y-4 animate-fade-in">
                        {/* In-App Video Room - show if hosting_method is 'in_app' or 'both' */}
                        {(lesson.hosting_method === 'in_app' || lesson.hosting_method === 'both' || !lesson.hosting_method) && (
                            <>
                                <VideoRoom 
                                    lessonId={lessonId} 
                                    onClose={() => {
                                        setShowVideoRoom(false);
                                        fetchRoomStatus();
                                    }}
                                />
                                
                                {/* Room Status Badge */}
                                {roomStatus?.room_exists && roomStatus.participants_count > 0 && (
                                    <Card className="card-organic bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                                        <CardContent className="p-3 flex items-center justify-center gap-2">
                                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                            <span className="text-green-700 dark:text-green-400 font-medium">
                                                {roomStatus.participants_count} {roomStatus.participants_count === 1 ? 'person' : 'people'} in the room
                                            </span>
                                        </CardContent>
                                    </Card>
                                )}
                                
                                {completedActions.includes('joined_video') && (
                                    <div className="flex items-center justify-center gap-2 text-green-600">
                                        <CheckCircle className="w-5 h-5" />
                                        <span className="font-medium">You've joined video!</span>
                                    </div>
                                )}
                            </>
                        )}
                        
                        {/* External Zoom Link - show if hosting_method is 'zoom' or 'both' */}
                        {(lesson.hosting_method === 'zoom' || lesson.hosting_method === 'both') && zoomLink && (
                            <Card className="card-organic">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                                                <Video className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div>
                                                <p className="font-medium">
                                                    {lesson.hosting_method === 'zoom' ? 'Join via Zoom' : 'External Zoom Meeting'}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    {lesson.hosting_method === 'zoom' ? 'Class hosted on Zoom' : 'Alternative meeting link'}
                                                </p>
                                            </div>
                                        </div>
                                        <Button 
                                            onClick={handleJoinLive}
                                            variant={lesson.hosting_method === 'zoom' ? "default" : "outline"}
                                            size="sm"
                                            className={lesson.hosting_method === 'zoom' ? "btn-primary" : ""}
                                            data-testid="join-zoom-btn"
                                        >
                                            Join Zoom
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                        
                        {/* No hosting option configured message */}
                        {lesson.hosting_method === 'zoom' && !zoomLink && (
                            <Card className="card-organic">
                                <CardContent className="p-8 text-center">
                                    <Video className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium mb-2">No Meeting Link</h3>
                                    <p className="text-muted-foreground">The teacher hasn't added a Zoom link yet.</p>
                                </CardContent>
                            </Card>
                        )}
                        
                        {/* Live Chat Link */}
                        <Card className="card-organic card-hover">
                            <Link to="/chat">
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                                            <MessageCircle className="w-5 h-5 text-primary" />
                                        </div>
                                        <div>
                                            <p className="font-medium">Live Chat</p>
                                            <p className="text-sm text-muted-foreground">Join the conversation</p>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                                </CardContent>
                            </Link>
                        </Card>
                    </div>
                )}

                {/* ============ NEXT TAB: Watch Replay + Teacher Notes ============ */}
                {activeTab === 'next' && (
                    <div className="space-y-4 animate-fade-in">
                        {/* Session Recordings Section */}
                        {loadingRecordings ? (
                            <Card className="card-organic">
                                <CardContent className="p-6 flex items-center justify-center gap-2">
                                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                                    <span>Loading recordings...</span>
                                </CardContent>
                            </Card>
                        ) : recordings.length > 0 ? (
                            <div className="space-y-3">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <Video className="w-5 h-5 text-purple-500" />
                                    Session Recordings
                                </h3>
                                {recordings.map((recording, idx) => (
                                    <Card key={recording.id} className="card-organic overflow-hidden" data-testid={`recording-${recording.id}`}>
                                        {recording.download_url ? (
                                            <>
                                                <div className="aspect-video bg-black">
                                                    <video
                                                        controls
                                                        className="w-full h-full"
                                                        src={recording.download_url}
                                                        onPlay={handleWatchReplay}
                                                        data-testid={`recording-video-${idx}`}
                                                    >
                                                        Your browser does not support the video tag.
                                                    </video>
                                                </div>
                                                <CardContent className="p-3 flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="secondary">
                                                            Recording {recordings.length > 1 ? idx + 1 : ''}
                                                        </Badge>
                                                        {recording.duration && (
                                                            <span className="text-sm text-muted-foreground">
                                                                {Math.floor(recording.duration / 60)}:{String(recording.duration % 60).padStart(2, '0')} min
                                                            </span>
                                                        )}
                                                        {recording.max_participants && (
                                                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                                                                <Users className="w-3 h-3" />
                                                                {recording.max_participants}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {recording.start_ts && (
                                                        <span className="text-xs text-muted-foreground">
                                                            {formatDate(new Date(recording.start_ts * 1000).toISOString())}
                                                        </span>
                                                    )}
                                                </CardContent>
                                            </>
                                        ) : (
                                            <CardContent className="p-4 flex items-center gap-3">
                                                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                                                    <Clock className="w-5 h-5 text-amber-600" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">Recording Processing</p>
                                                    <p className="text-sm text-muted-foreground">This recording is being processed. Check back soon.</p>
                                                </div>
                                            </CardContent>
                                        )}
                                    </Card>
                                ))}
                                {completedActions.includes('watched_replay') && (
                                    <div className="flex items-center justify-center gap-2 text-green-600">
                                        <CheckCircle className="w-5 h-5" />
                                        <span className="font-medium">You've watched a replay!</span>
                                    </div>
                                )}
                            </div>
                        ) : null}
                        
                        {/* YouTube Video (shown when recording_source is youtube) */}
                        {(lesson.recording_source === 'youtube' || lesson.youtube_url) && (lesson.recording_url || lesson.youtube_url) && (
                            <div className="space-y-3">
                                {recordings.length > 0 && (
                                    <h3 className="font-semibold flex items-center gap-2">
                                        <Play className="w-5 h-5 text-red-500" />
                                        Additional Video Content
                                    </h3>
                                )}
                                <Card className="card-organic overflow-hidden">
                                    <div className="youtube-wrapper" onClick={handleWatchReplay}>
                                        <iframe
                                            src={getYouTubeEmbedUrl(lesson.recording_url || lesson.youtube_url)}
                                            title={lesson.title}
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                        />
                                    </div>
                                    {completedActions.includes('watched_replay') && recordings.length === 0 && (
                                        <div className="p-3 bg-green-50 dark:bg-green-900/20 flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
                                            <CheckCircle className="w-4 h-4" />
                                            <span className="text-sm font-medium">Watched</span>
                                        </div>
                                    )}
                                </Card>
                            </div>
                        )}
                        
                        {/* External Video URL */}
                        {lesson.recording_source === 'external' && lesson.recording_url && (
                            <div className="space-y-3">
                                <Card className="card-organic overflow-hidden">
                                    <div className="aspect-video bg-black">
                                        <iframe
                                            src={lesson.recording_url}
                                            title={lesson.title}
                                            className="w-full h-full"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                                            allowFullScreen
                                            onLoad={handleWatchReplay}
                                        />
                                    </div>
                                    {completedActions.includes('watched_replay') && (
                                        <div className="p-3 bg-green-50 dark:bg-green-900/20 flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
                                            <CheckCircle className="w-4 h-4" />
                                            <span className="text-sm font-medium">Watched</span>
                                        </div>
                                    )}
                                </Card>
                            </div>
                        )}
                        
                        {/* No content available message */}
                        {!loadingRecordings && recordings.length === 0 && !lesson.youtube_url && !lesson.recording_url && lesson.recording_source !== 'daily' && (
                            <Card className="card-organic">
                                <CardContent className="p-8 text-center">
                                    <Play className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium mb-2">No Replay Available</h3>
                                    <p className="text-muted-foreground">The teacher hasn't added a recording for this lesson yet.</p>
                                </CardContent>
                            </Card>
                        )}
                        
                        {/* Daily.co recordings pending message */}
                        {!loadingRecordings && recordings.length === 0 && lesson.recording_source === 'daily' && (
                            <Card className="card-organic">
                                <CardContent className="p-8 text-center">
                                    <Play className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium mb-2">Recording Coming Soon</h3>
                                    <p className="text-muted-foreground">Recordings from live sessions will appear here after they're processed.</p>
                                    <p className="text-sm text-muted-foreground mt-2">Check back after the live session ends.</p>
                                </CardContent>
                            </Card>
                        )}

                        {/* Teacher Notes */}
                        {lesson.teacher_notes && (
                            <Card className="card-organic">
                                <CardHeader className="pb-2">
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <BookOpen className="w-5 h-5 text-primary" />
                                        Teacher Notes
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                                    <ReactMarkdown>{lesson.teacher_notes}</ReactMarkdown>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}

                {/* ============ AFTER TAB: Resources, Discussion, Reading Plan, Attendance ============ */}
                {activeTab === 'after' && (
                    <div className="space-y-6 animate-fade-in">
                        {/* Resources/Slides Section */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <Presentation className="w-5 h-5" />
                                    Slides & Resources
                                </h3>
                                {isTeacherOrAdmin && (
                                    <>
                                        <input 
                                            type="file" 
                                            ref={fileInputRef} 
                                            onChange={handleFileUpload} 
                                            accept=".pdf,.ppt,.pptx,.jpg,.jpeg,.png,.gif" 
                                            className="hidden" 
                                        />
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            onClick={() => fileInputRef.current?.click()} 
                                            disabled={uploading}
                                            data-testid="upload-resource-btn"
                                        >
                                            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                                            Upload
                                        </Button>
                                    </>
                                )}
                            </div>
                            
                            {resources.length > 0 ? (
                                <div className="grid gap-2">
                                    {resources.map((resource) => {
                                        const Icon = getResourceIcon(resource.file_type);
                                        return (
                                            <Card 
                                                key={resource.id} 
                                                className={cn(
                                                    "card-organic transition-all",
                                                    resource.is_primary && "ring-2 ring-primary"
                                                )}
                                                data-testid={`resource-${resource.id}`}
                                            >
                                                <CardContent className="p-3 flex items-center gap-3">
                                                    <div className={cn(
                                                        "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                                                        resource.is_primary ? "bg-primary text-white" : "bg-muted"
                                                    )}>
                                                        <Icon className="w-5 h-5" />
                                                    </div>
                                                    <div className="flex-grow min-w-0">
                                                        <p className="font-medium text-sm truncate flex items-center gap-2">
                                                            {resource.original_filename}
                                                            {resource.is_primary && (
                                                                <Badge variant="secondary" className="text-xs">Primary</Badge>
                                                            )}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">{formatFileSize(resource.file_size)}</p>
                                                    </div>
                                                    <div className="flex gap-1 flex-shrink-0">
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm" 
                                                            onClick={() => { setPreviewResource(resource); handleViewSlides(); }}
                                                            data-testid={`preview-${resource.id}`}
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </Button>
                                                        <a href={`${BACKEND_URL}/api/resources/${resource.id}/download`} download>
                                                            <Button variant="ghost" size="sm" onClick={handleViewSlides}>
                                                                <Download className="w-4 h-4" />
                                                            </Button>
                                                        </a>
                                                        {isTeacherOrAdmin && (
                                                            <>
                                                                {!resource.is_primary && (
                                                                    <Button 
                                                                        variant="ghost" 
                                                                        size="sm" 
                                                                        onClick={() => handleSetPrimary(resource.id)}
                                                                        title="Set as primary"
                                                                    >
                                                                        <Star className="w-4 h-4" />
                                                                    </Button>
                                                                )}
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="sm" 
                                                                    onClick={() => handleDeleteResource(resource.id)} 
                                                                    className="text-destructive"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </>
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            ) : (
                                <Card className="card-organic">
                                    <EmptyState
                                        icon="files"
                                        title="No resources yet"
                                        description={isTeacherOrAdmin ? "Upload slides or files above" : "No resources available"}
                                    />
                                </Card>
                            )}
                        </div>

                        {/* Discussion Prompts */}
                        <div className="space-y-3">
                            <h3 className="font-semibold flex items-center gap-2">
                                <MessageCircle className="w-5 h-5" />
                                Discussion
                            </h3>
                            
                            {prompts.length > 0 ? (
                                <>
                                    {/* Prompt Tabs */}
                                    {prompts.length > 1 && (
                                        <div className="flex gap-2 overflow-x-auto pb-2">
                                            {prompts.map((prompt, idx) => (
                                                <Button
                                                    key={prompt.id}
                                                    variant={activePromptId === prompt.id ? "default" : "outline"}
                                                    size="sm"
                                                    onClick={() => handlePromptChange(prompt.id)}
                                                    className="flex-shrink-0"
                                                    data-testid={`prompt-tab-${idx}`}
                                                >
                                                    Prompt {idx + 1}
                                                </Button>
                                            ))}
                                        </div>
                                    )}
                                    
                                    {/* Active Prompt Question */}
                                    {activePrompt && (
                                        <Card className="card-organic bg-primary/5 border-primary/20">
                                            <CardContent className="p-4">
                                                <p className="font-medium text-primary" data-testid="active-prompt-question">
                                                    {activePrompt.question}
                                                </p>
                                            </CardContent>
                                        </Card>
                                    )}
                                    
                                    {/* Reply Form */}
                                    <Card className="card-organic">
                                        <CardContent className="p-4">
                                            <form onSubmit={handleSubmitReply} className="space-y-3">
                                                <Textarea
                                                    placeholder="Share your thoughts on this prompt..."
                                                    value={newReply}
                                                    onChange={(e) => setNewReply(e.target.value)}
                                                    rows={3}
                                                    data-testid="reply-input"
                                                />
                                                <Button 
                                                    type="submit" 
                                                    disabled={submittingReply || !newReply.trim()} 
                                                    className="btn-primary"
                                                    data-testid="submit-reply-btn"
                                                >
                                                    {submittingReply ? (
                                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                    ) : (
                                                        <Send className="w-4 h-4 mr-2" />
                                                    )}
                                                    Submit Response
                                                </Button>
                                            </form>
                                        </CardContent>
                                    </Card>
                                    
                                    {/* Replies */}
                                    <div className="space-y-2">
                                        {sortedReplies.length > 0 ? sortedReplies.map((reply) => (
                                            <Card 
                                                key={reply.id} 
                                                className={cn(
                                                    "card-organic",
                                                    reply.is_pinned && "ring-2 ring-amber-400 bg-amber-50/50 dark:bg-amber-900/10"
                                                )}
                                                data-testid={`reply-${reply.id}`}
                                            >
                                                <CardContent className="p-3">
                                                    <div className="flex items-start gap-3">
                                                        <Avatar className="w-8 h-8">
                                                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                                                {getInitials(reply.user_name)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex-grow min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                                <span className="font-semibold text-sm">{reply.user_name}</span>
                                                                <span className="text-xs text-muted-foreground">{formatRelativeTime(reply.created_at)}</span>
                                                                {reply.is_pinned && (
                                                                    <Badge variant="outline" className="text-xs text-amber-600 border-amber-400">
                                                                        <Pin className="w-3 h-3 mr-1" /> Pinned
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <p className="text-sm mb-2">{reply.content}</p>
                                                            
                                                            {/* Teacher Actions Row */}
                                                            {isTeacherOrAdmin && (
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    {/* Status Dropdown */}
                                                                    <DropdownMenu>
                                                                        <DropdownMenuTrigger asChild>
                                                                            <Button 
                                                                                variant="outline" 
                                                                                size="sm"
                                                                                className={cn(
                                                                                    "text-xs h-7",
                                                                                    getStatusStyle(reply.status)
                                                                                )}
                                                                                data-testid={`status-btn-${reply.id}`}
                                                                            >
                                                                                {reply.status === 'answered' ? <CheckCircle className="w-3 h-3 mr-1" /> : 
                                                                                 reply.status === 'needs_followup' ? <AlertCircle className="w-3 h-3 mr-1" /> : 
                                                                                 <Clock className="w-3 h-3 mr-1" />}
                                                                                {getStatusLabel(reply.status)}
                                                                            </Button>
                                                                        </DropdownMenuTrigger>
                                                                        <DropdownMenuContent align="start">
                                                                            <StatusDropdownItems onSelect={(key) => handleStatusChange(reply.id, key)} />
                                                                        </DropdownMenuContent>
                                                                    </DropdownMenu>
                                                                    
                                                                    <Button 
                                                                        variant="ghost" 
                                                                        size="sm" 
                                                                        className={cn("h-7 text-xs", reply.is_pinned && "text-amber-600")}
                                                                        onClick={() => handlePinReply(reply.id, !reply.is_pinned)}
                                                                    >
                                                                        <Pin className="w-3 h-3 mr-1" />
                                                                        {reply.is_pinned ? 'Unpin' : 'Pin'}
                                                                    </Button>
                                                                    <Button 
                                                                        variant="ghost" 
                                                                        size="sm" 
                                                                        className="h-7 text-xs text-destructive"
                                                                        onClick={() => setDeleteItem(reply)}
                                                                    >
                                                                        <Trash2 className="w-3 h-3 mr-1" />
                                                                        Delete
                                                                    </Button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        )) : (
                                            <Card className="card-organic">
                                                <CardContent className="p-4 text-center text-muted-foreground">
                                                    <p>Be the first to respond to this prompt!</p>
                                                </CardContent>
                                            </Card>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <Card className="card-organic">
                                    <EmptyState
                                        icon="chat"
                                        title="No discussion prompts"
                                        description={isTeacherOrAdmin ? "Add prompts from the lesson editor" : "Check back later for discussion questions"}
                                    />
                                </Card>
                            )}
                        </div>

                        {/* Reading Plan */}
                        {lesson.reading_plan && (
                            <div className="space-y-3">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <BookMarked className="w-5 h-5" />
                                    This Week's Reading
                                </h3>
                                <Card className="card-organic">
                                    <CardContent className="p-4 prose prose-sm dark:prose-invert max-w-none">
                                        <ReactMarkdown>{lesson.reading_plan}</ReactMarkdown>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* Attendance Button */}
                        <Card className="card-organic">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center",
                                        completedActions.includes('marked_attended') ? "bg-green-500" : "bg-muted"
                                    )}>
                                        <CheckCircle className={cn(
                                            "w-5 h-5",
                                            completedActions.includes('marked_attended') ? "text-white" : "text-muted-foreground"
                                        )} />
                                    </div>
                                    <div>
                                        <p className="font-medium">Mark Attendance</p>
                                        <p className="text-sm text-muted-foreground">
                                            {completedActions.includes('marked_attended') 
                                                ? "You're marked as attended!" 
                                                : "Let us know you completed this lesson"
                                            }
                                        </p>
                                    </div>
                                </div>
                                {!completedActions.includes('marked_attended') && (
                                    <Button onClick={handleMarkAttended} className="btn-primary" data-testid="mark-attended-btn">
                                        I Attended
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Delete Confirmation Dialog */}
                <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete Reply?</AlertDialogTitle>
                            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteReply} className="bg-destructive text-destructive-foreground">
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* File Preview Modal */}
                <FilePreview
                    resource={previewResource}
                    open={!!previewResource}
                    onClose={() => setPreviewResource(null)}
                />
            </div>
        </Layout>
    );
};

export default LessonDetail;

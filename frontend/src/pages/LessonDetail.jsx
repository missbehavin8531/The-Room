import React, { useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { formatDate, formatRelativeTime, getYouTubeEmbedUrl, getInitials, formatFileSize, cn } from '../lib/utils';
import { toast } from 'sonner';
import { EmptyState } from '../components/EmptyState';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { FilePreview } from '../components/FilePreview';
import { VideoRoom } from '../components/VideoRoom';
import { useLessonActions } from '../hooks/useLessonActions';
import { LiveRoomTab } from '../components/lesson/LiveRoomTab';
import { 
    ArrowLeft, Video, Calendar, FileText, Image, Presentation,
    Download, Upload, Send, Trash2, Eye, EyeOff, CheckCircle,
    Loader2, Play, BookOpen, MessageCircle, Clock, ChevronRight,
    Pin, Star, Users, BookMarked, Edit, BarChart3, AlertCircle, GripVertical,
    ArrowUp, ArrowDown, Link2, Plus
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

// Tab definitions — context-aware based on course_type
function getLessonTabs(courseType) {
    if (courseType === 'self_paced') {
        return [
            { key: 'lesson', label: 'Lesson', subtitle: 'Content', icon: Play, color: 'bg-purple-500' },
            { key: 'discussion', label: 'Discussion', subtitle: 'Engage', icon: BookOpen, color: 'bg-green-500' },
        ];
    }
    // scheduled or hybrid
    return [
        { key: 'live', label: 'Live Room', subtitle: 'Join Live', icon: Video, color: 'bg-blue-500' },
        { key: 'lesson', label: 'Lesson', subtitle: 'Content', icon: Play, color: 'bg-purple-500' },
        { key: 'discussion', label: 'Discussion', subtitle: 'Engage', icon: BookOpen, color: 'bg-green-500' },
    ];
}

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
    const { user } = useAuth();

    const actions = useLessonActions(lessonId, user, navigate);
    const {
        lesson, course, activeTab, setActiveTab, loading,
        prompts, activePromptId, promptReplies, newReply, setNewReply, submittingReply,
        uploading, previewResource, setPreviewResource, fileInputRef,
        draggedResource, dragOverResource,
        completedActions, deleteItem, setDeleteItem,
        showVideoRoom, setShowVideoRoom, roomStatus,
        recordings, uploadedRecordings, loadingRecordings,
        uploadingVideo, uploadProgress, showLinkForm, setShowLinkForm,
        linkUrl, setLinkUrl, linkTitle, setLinkTitle, videoInputRef,
        isTeacherOrAdmin, isGuest,
        fetchLessonData, fetchRoomStatus, fetchRecordings,
        handleJoinLive, handleWatchReplay, handleMarkAttended, handleViewSlides,
        handleVideoUpload, handleAddRecordingLink, handleDeleteUploadedRecording,
        handlePromptChange, handleSubmitReply, handlePinReply, handleStatusChange, handleDeleteReply,
        handleFileUpload, handleDeleteResource, handleSetPrimary,
        handleResourceDragStart, handleResourceDragOver, handleResourceDrop, handleResourceDragEnd, moveResource,
    } = actions;

    useEffect(() => {
        fetchLessonData();
    }, [lessonId]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (activeTab === 'live') fetchRoomStatus();
    }, [activeTab, lessonId]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (activeTab === 'lesson' && lessonId) fetchRecordings();
    }, [activeTab, lessonId]); // eslint-disable-line react-hooks/exhaustive-deps

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
    const activePrompt = prompts.find(p => p.id === activePromptId);

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

                {/* Lesson Tab Navigation — Context-aware */}
                <div className="flex gap-0 border-b border-border animate-fade-in" style={{ animationDelay: '0.05s' }}>
                    {getLessonTabs(course?.course_type).map((tab) => {
                        const isActive = activeTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={cn(
                                    "lesson-tab flex-1 py-3 text-center",
                                    isActive ? "lesson-tab-active" : "lesson-tab-inactive"
                                )}
                                data-testid={`tab-${tab.key}`}
                            >
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* ============ LIVE ROOM TAB: Join Live Video Room ============ */}
                {activeTab === 'live' && (
                    <div className="space-y-4 animate-fade-in">
                        {/* In-App Video Room - show if hosting_method is 'in_app' or 'both' */}
                        {(lesson.hosting_method === 'in_app' || lesson.hosting_method === 'both' || !lesson.hosting_method) && (
                            <>
                                {isGuest ? (
                                    <Card className="card-organic">
                                        <CardContent className="p-6 text-center">
                                            <Video className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                                            <p className="text-sm font-semibold mb-1" style={{ fontFamily: "'Manrope', sans-serif" }}>Video Room</p>
                                            <p className="text-xs text-muted-foreground mb-3">Sign up to join live video sessions with the group.</p>
                                            <a href="/" className="text-xs text-primary font-semibold hover:underline">Sign up free</a>
                                        </CardContent>
                                    </Card>
                                ) : (
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
                {/* ============ LESSON TAB: Content, Replay, Resources ============ */}
                {activeTab === 'lesson' && (
                    <div className="space-y-4 animate-fade-in">
                        {/* Teacher Upload Controls */}
                        {isTeacherOrAdmin && (
                            <Card className="card-organic border-dashed border-2 border-primary/30">
                                <CardContent className="p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-semibold flex items-center gap-2 text-sm">
                                            <Upload className="w-4 h-4 text-primary" />
                                            Add Recording
                                        </h3>
                                        <div className="flex gap-2">
                                            <input
                                                type="file"
                                                ref={videoInputRef}
                                                onChange={handleVideoUpload}
                                                accept=".mp4,.mov,.webm,.avi,.mkv,.mpeg,.mpg"
                                                className="hidden"
                                            />
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => videoInputRef.current?.click()}
                                                disabled={uploadingVideo}
                                                data-testid="upload-video-btn"
                                            >
                                                {uploadingVideo ? (
                                                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                                                ) : (
                                                    <Upload className="w-4 h-4 mr-1" />
                                                )}
                                                Upload Video
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setShowLinkForm(!showLinkForm)}
                                                data-testid="add-link-btn"
                                            >
                                                <Link2 className="w-4 h-4 mr-1" />
                                                Paste Link
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Upload Progress */}
                                    {uploadingVideo && (
                                        <div className="space-y-1" data-testid="upload-progress">
                                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                <span>Uploading...</span>
                                                <span>{uploadProgress}%</span>
                                            </div>
                                            <div className="w-full bg-muted rounded-full h-2">
                                                <div
                                                    className="bg-primary rounded-full h-2 transition-all"
                                                    style={{ width: `${uploadProgress}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Link Form */}
                                    {showLinkForm && (
                                        <div className="space-y-2 p-3 bg-muted/50 rounded-lg animate-fade-in" data-testid="link-form">
                                            <Input
                                                placeholder="https://zoom.us/rec/share/..."
                                                value={linkUrl}
                                                onChange={(e) => setLinkUrl(e.target.value)}
                                                data-testid="recording-link-url"
                                            />
                                            <div className="flex gap-2">
                                                <Input
                                                    placeholder="Title (e.g. Zoom Recording)"
                                                    value={linkTitle}
                                                    onChange={(e) => setLinkTitle(e.target.value)}
                                                    className="flex-grow"
                                                    data-testid="recording-link-title"
                                                />
                                                <Button
                                                    size="sm"
                                                    onClick={handleAddRecordingLink}
                                                    disabled={!linkUrl.trim()}
                                                    className="btn-primary"
                                                    data-testid="save-recording-link-btn"
                                                >
                                                    <Plus className="w-4 h-4 mr-1" />
                                                    Add
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    <p className="text-xs text-muted-foreground">
                                        Upload a Zoom recording (MP4, MOV, WebM, up to 125MB) or paste a Zoom cloud sharing link.
                                    </p>
                                </CardContent>
                            </Card>
                        )}

                        {/* Session Recordings Section */}
                        {loadingRecordings ? (
                            <Card className="card-organic">
                                <CardContent className="p-6 flex items-center justify-center gap-2">
                                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                                    <span>Loading recordings...</span>
                                </CardContent>
                            </Card>
                        ) : (recordings.length > 0 || uploadedRecordings.length > 0) ? (
                            <div className="space-y-3">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <Video className="w-5 h-5 text-purple-500" />
                                    Session Recordings
                                </h3>

                                {/* Daily.co Recordings */}
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
                                                            Live Recording {recordings.length > 1 ? idx + 1 : ''}
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

                                {/* Uploaded / Linked Recordings */}
                                {uploadedRecordings.map((rec) => (
                                    <Card key={rec.id} className="card-organic overflow-hidden" data-testid={`uploaded-recording-${rec.id}`}>
                                        {rec.type === 'upload' ? (
                                            <>
                                                <div className="aspect-video bg-black">
                                                    <video
                                                        controls
                                                        className="w-full h-full"
                                                        src={`${BACKEND_URL}/api/recordings/${rec.id}/stream?token=${localStorage.getItem('token')}`}
                                                        onPlay={handleWatchReplay}
                                                        data-testid={`uploaded-video-${rec.id}`}
                                                    >
                                                        Your browser does not support the video tag.
                                                    </video>
                                                </div>
                                                <CardContent className="p-3 flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                            <Upload className="w-3 h-3 mr-1" /> Uploaded
                                                        </Badge>
                                                        <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                                                            {rec.title || rec.original_filename}
                                                        </span>
                                                        {rec.file_size && (
                                                            <span className="text-xs text-muted-foreground">
                                                                {formatFileSize(rec.file_size)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-xs text-muted-foreground mr-2">
                                                            {rec.uploaded_by_name && `by ${rec.uploaded_by_name}`}
                                                        </span>
                                                        {isTeacherOrAdmin && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleDeleteUploadedRecording(rec.id)}
                                                                className="text-destructive p-1 h-auto"
                                                                data-testid={`delete-recording-${rec.id}`}
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </>
                                        ) : (
                                            <CardContent className="p-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                                                            <Link2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium">{rec.title || 'Recording Link'}</p>
                                                            <p className="text-xs text-muted-foreground truncate max-w-[250px]">
                                                                {rec.url}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <a href={rec.url} target="_blank" rel="noopener noreferrer">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={handleWatchReplay}
                                                                data-testid={`watch-link-${rec.id}`}
                                                            >
                                                                <Play className="w-4 h-4 mr-1" /> Watch
                                                            </Button>
                                                        </a>
                                                        {isTeacherOrAdmin && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleDeleteUploadedRecording(rec.id)}
                                                                className="text-destructive p-1 h-auto"
                                                                data-testid={`delete-link-${rec.id}`}
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        )}
                                                    </div>
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
                                {(recordings.length > 0 || uploadedRecordings.length > 0) && (
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
                                    {completedActions.includes('watched_replay') && recordings.length === 0 && uploadedRecordings.length === 0 && (
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
                        {!loadingRecordings && recordings.length === 0 && uploadedRecordings.length === 0 && !lesson.youtube_url && !lesson.recording_url && lesson.recording_source !== 'daily' && (
                            <Card className="card-organic">
                                <CardContent className="p-8 text-center">
                                    <Play className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium mb-2">No Replay Available</h3>
                                    <p className="text-muted-foreground">
                                        {isTeacherOrAdmin
                                            ? 'Upload a recording or paste a link using the controls above.'
                                            : "The teacher hasn't added a recording for this lesson yet."
                                        }
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                        
                        {/* Daily.co recordings pending message */}
                        {!loadingRecordings && recordings.length === 0 && uploadedRecordings.length === 0 && lesson.recording_source === 'daily' && (
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
                {/* ============ DISCUSSION TAB ============ */}
                {activeTab === 'discussion' && (
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
                                        const isDragging = draggedResource?.id === resource.id;
                                        const isDragOver = dragOverResource?.id === resource.id;
                                        return (
                                            <Card 
                                                key={resource.id} 
                                                className={cn(
                                                    "card-organic transition-all",
                                                    resource.is_primary && "ring-2 ring-primary",
                                                    isDragging && "opacity-40 scale-95",
                                                    isDragOver && "ring-2 ring-blue-400 bg-blue-50 dark:bg-blue-900/10"
                                                )}
                                                draggable={isTeacherOrAdmin}
                                                onDragStart={isTeacherOrAdmin ? (e) => handleResourceDragStart(e, resource) : undefined}
                                                onDragOver={isTeacherOrAdmin ? (e) => handleResourceDragOver(e, resource) : undefined}
                                                onDrop={isTeacherOrAdmin ? (e) => handleResourceDrop(e, resource) : undefined}
                                                onDragEnd={isTeacherOrAdmin ? handleResourceDragEnd : undefined}
                                                data-testid={`resource-${resource.id}`}
                                            >
                                                <CardContent className="p-3 flex items-center gap-3">
                                                    {isTeacherOrAdmin && (
                                                        <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                                                            <button 
                                                                onClick={() => moveResource(resource.id, -1)} 
                                                                className="p-0.5 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-20"
                                                                disabled={resources.indexOf(resource) === 0}
                                                                data-testid={`resource-move-up-${resource.id}`}
                                                            >
                                                                <ArrowUp className="w-3 h-3" />
                                                            </button>
                                                            <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab active:cursor-grabbing hidden sm:block" />
                                                            <button 
                                                                onClick={() => moveResource(resource.id, 1)} 
                                                                className="p-0.5 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-20"
                                                                disabled={resources.indexOf(resource) === resources.length - 1}
                                                                data-testid={`resource-move-down-${resource.id}`}
                                                            >
                                                                <ArrowDown className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    )}
                                                    <div className={cn(
                                                        "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                                                        resource.is_primary ? "bg-primary text-white" : "bg-muted"
                                                    )}>
                                                        <Icon className="w-5 h-5" />
                                                    </div>
                                                    <div className="flex-grow min-w-0">
                                                        <div className="font-medium text-sm truncate flex items-center gap-2">
                                                            {resource.original_filename}
                                                            {resource.is_primary && (
                                                                <Badge variant="secondary" className="text-xs">Primary</Badge>
                                                            )}
                                                        </div>
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
                                                        <a href={isGuest ? '#' : `${BACKEND_URL}/api/resources/${resource.id}/download?token=${localStorage.getItem('token')}`}
                                                            download={!isGuest}
                                                            onClick={isGuest ? (e) => { e.preventDefault(); toast.error('Sign up to download resources'); } : handleViewSlides}
                                                        >
                                                            <Button variant="ghost" size="sm">
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
                        <div className="space-y-4" data-testid="discussion-section">
                            <h3 className="text-xs tracking-widest uppercase font-semibold text-muted-foreground" style={{ fontFamily: "'Manrope', sans-serif" }}>
                                Discussion Questions
                            </h3>
                            
                            {prompts.length > 0 ? (
                                <div className="space-y-4">
                                    {prompts.map((prompt, idx) => {
                                        const isActive = activePromptId === prompt.id;
                                        const replies = promptReplies[prompt.id] || [];
                                        const pinnedReplies = replies.filter(r => r.is_pinned);
                                        const otherReplies = replies.filter(r => !r.is_pinned).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                                        const allReplies = [...pinnedReplies, ...otherReplies];

                                        return (
                                            <Card
                                                key={prompt.id}
                                                className={cn(
                                                    "card-organic overflow-hidden transition-all duration-300",
                                                    isActive && "ring-1 ring-primary/30"
                                                )}
                                                data-testid={`prompt-card-${idx}`}
                                            >
                                                {/* Prompt Header — clickable to expand/collapse */}
                                                <button
                                                    className="w-full text-left p-5 flex items-start gap-4 group"
                                                    onClick={() => handlePromptChange(isActive ? null : prompt.id)}
                                                    data-testid={`prompt-tab-${idx}`}
                                                >
                                                    <div className={cn(
                                                        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold transition-colors",
                                                        isActive
                                                            ? "bg-primary text-primary-foreground"
                                                            : "bg-muted text-muted-foreground"
                                                    )}>
                                                        {idx + 1}
                                                    </div>
                                                    <div className="flex-grow min-w-0">
                                                        <p className={cn(
                                                            "font-medium leading-snug transition-colors",
                                                            isActive ? "text-foreground" : "text-foreground/80"
                                                        )} style={{ fontFamily: "'Manrope', sans-serif" }} data-testid="active-prompt-question">
                                                            {prompt.question}
                                                        </p>
                                                        {!isActive && replies.length > 0 && (
                                                            <p className="text-xs text-muted-foreground mt-1">
                                                                {replies.length} {replies.length === 1 ? 'response' : 'responses'}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <ChevronRight className={cn(
                                                        "w-5 h-5 text-muted-foreground flex-shrink-0 transition-transform duration-200 mt-1",
                                                        isActive && "rotate-90"
                                                    )} />
                                                </button>

                                                {/* Expanded Content */}
                                                {isActive && (
                                                    <div className="px-5 pb-5 space-y-4 animate-fade-in">
                                                        {/* Reply Form */}
                                                        <form onSubmit={handleSubmitReply} className="space-y-3">
                                                            <div className="relative">
                                                                <Textarea
                                                                    placeholder="Share your thoughts..."
                                                                    value={newReply}
                                                                    onChange={(e) => setNewReply(e.target.value)}
                                                                    rows={2}
                                                                    className="resize-none pr-12 text-sm"
                                                                    data-testid="reply-input"
                                                                />
                                                                <Button
                                                                    type="submit"
                                                                    size="sm"
                                                                    disabled={submittingReply || !newReply.trim()}
                                                                    className="absolute bottom-2 right-2 h-8 w-8 p-0 rounded-full"
                                                                    data-testid="submit-reply-btn"
                                                                >
                                                                    {submittingReply ? (
                                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                                    ) : (
                                                                        <Send className="w-4 h-4" />
                                                                    )}
                                                                </Button>
                                                            </div>
                                                        </form>

                                                        {/* Replies */}
                                                        {allReplies.length > 0 ? (
                                                            <div className="space-y-3">
                                                                <p className="text-xs text-muted-foreground font-medium">
                                                                    {allReplies.length} {allReplies.length === 1 ? 'Response' : 'Responses'}
                                                                </p>
                                                                {allReplies.map((reply) => (
                                                                    <div
                                                                        key={reply.id}
                                                                        className={cn(
                                                                            "group/reply relative p-3 rounded-xl transition-colors",
                                                                            reply.is_pinned
                                                                                ? "bg-amber-50/80 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-700/30"
                                                                                : "bg-muted/40 hover:bg-muted/60"
                                                                        )}
                                                                        data-testid={`reply-${reply.id}`}
                                                                    >
                                                                        <div className="flex items-start gap-3">
                                                                            <Avatar className="w-7 h-7 flex-shrink-0">
                                                                                <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                                                                                    {getInitials(reply.user_name)}
                                                                                </AvatarFallback>
                                                                            </Avatar>
                                                                            <div className="flex-grow min-w-0">
                                                                                <div className="flex items-center gap-2 mb-0.5">
                                                                                    <span className="font-semibold text-sm">{reply.user_name}</span>
                                                                                    <span className="text-[11px] text-muted-foreground">{formatRelativeTime(reply.created_at)}</span>
                                                                                    {reply.is_pinned && (
                                                                                        <Pin className="w-3 h-3 text-amber-500" />
                                                                                    )}
                                                                                </div>
                                                                                <p className="text-sm leading-relaxed">{reply.content}</p>
                                                                            </div>

                                                                            {/* Moderation — icon-only, revealed on hover */}
                                                                            {isTeacherOrAdmin && (
                                                                                <div className="flex items-center gap-0.5 opacity-0 group-hover/reply:opacity-100 transition-opacity flex-shrink-0">
                                                                                    <DropdownMenu>
                                                                                        <DropdownMenuTrigger asChild>
                                                                                            <button
                                                                                                className={cn(
                                                                                                    "w-6 h-6 rounded-md flex items-center justify-center text-xs",
                                                                                                    getStatusStyle(reply.status)
                                                                                                )}
                                                                                                data-testid={`status-btn-${reply.id}`}
                                                                                            >
                                                                                                {reply.status === 'answered' ? <CheckCircle className="w-3 h-3" /> :
                                                                                                 reply.status === 'needs_followup' ? <AlertCircle className="w-3 h-3" /> :
                                                                                                 <Clock className="w-3 h-3" />}
                                                                                            </button>
                                                                                        </DropdownMenuTrigger>
                                                                                        <DropdownMenuContent align="end" className="min-w-[120px]">
                                                                                            <StatusDropdownItems onSelect={(key) => handleStatusChange(reply.id, key)} />
                                                                                        </DropdownMenuContent>
                                                                                    </DropdownMenu>
                                                                                    <button
                                                                                        className={cn(
                                                                                            "w-6 h-6 rounded-md flex items-center justify-center transition-colors",
                                                                                            reply.is_pinned ? "text-amber-500 bg-amber-100 dark:bg-amber-900/30" : "text-muted-foreground hover:bg-muted"
                                                                                        )}
                                                                                        onClick={() => handlePinReply(reply.id, !reply.is_pinned)}
                                                                                    >
                                                                                        <Pin className="w-3 h-3" />
                                                                                    </button>
                                                                                    <button
                                                                                        className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                                                                        onClick={() => setDeleteItem(reply)}
                                                                                    >
                                                                                        <Trash2 className="w-3 h-3" />
                                                                                    </button>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <p className="text-sm text-muted-foreground text-center py-2">
                                                                Be the first to share your thoughts.
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </Card>
                                        );
                                    })}
                                </div>
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

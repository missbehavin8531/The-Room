import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Skeleton } from '../components/ui/skeleton';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { lessonsAPI, commentsAPI, resourcesAPI, attendanceAPI, coursesAPI } from '../lib/api';
import { formatDate, formatRelativeTime, getYouTubeEmbedUrl, getInitials, formatFileSize } from '../lib/utils';
import { toast } from 'sonner';
import { 
    ArrowLeft,
    Video,
    Calendar,
    FileText,
    Image,
    Presentation,
    Download,
    Upload,
    Send,
    Trash2,
    Eye,
    EyeOff,
    CheckCircle,
    ExternalLink,
    Loader2
} from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

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
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newComment, setNewComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [deleteCommentId, setDeleteCommentId] = useState(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchLessonData();
    }, [lessonId]);

    const fetchLessonData = async () => {
        try {
            const lessonRes = await lessonsAPI.getOne(lessonId);
            setLesson(lessonRes.data);
            
            const commentsRes = await commentsAPI.getByLesson(lessonId);
            const courseRes = await coursesAPI.getOne(lessonRes.data.course_id);
            setComments(commentsRes.data);
            setCourse(courseRes.data);
        } catch (error) {
            toast.error('Failed to load lesson');
            navigate('/courses');
        } finally {
            setLoading(false);
        }
    };

    const handleJoinLive = async () => {
        const zoomLink = lesson?.zoom_link || course?.zoom_link;
        if (zoomLink) {
            try {
                await attendanceAPI.record(lessonId, 'joined_live');
                toast.success('Attendance recorded!');
            } catch (error) {
                console.error('Failed to record attendance:', error);
            }
            window.open(zoomLink, '_blank');
        } else {
            toast.info('No Zoom link available for this lesson');
        }
    };

    const handleMarkAttended = async () => {
        try {
            await attendanceAPI.record(lessonId, 'marked_attended');
            toast.success('Marked as attended!');
        } catch (error) {
            toast.error('Failed to mark attendance');
        }
    };

    const handleSubmitComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        setSubmitting(true);
        try {
            const response = await commentsAPI.create(lessonId, newComment.trim());
            setComments(prevComments => [...prevComments, response.data]);
            setNewComment('');
            toast.success('Comment posted!');
        } catch (error) {
            const message = error.response?.data?.detail || 'Failed to post comment';
            toast.error(message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteComment = async () => {
        if (!deleteCommentId) return;
        try {
            await commentsAPI.delete(deleteCommentId);
            setComments(prevComments => prevComments.filter(c => c.id !== deleteCommentId));
            toast.success('Comment deleted');
        } catch (error) {
            toast.error('Failed to delete comment');
        }
        setDeleteCommentId(null);
    };

    const handleHideComment = async (commentId, hidden) => {
        try {
            await commentsAPI.hide(commentId, hidden);
            setComments(prevComments => prevComments.map(c => 
                c.id === commentId ? { ...c, is_hidden: hidden } : c
            ));
            toast.success(hidden ? 'Comment hidden' : 'Comment visible');
        } catch (error) {
            toast.error('Failed to update comment');
        }
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
            const response = await resourcesAPI.upload(lessonId, file);
            setLesson(prevLesson => ({
                ...prevLesson,
                resources: [...(prevLesson.resources || []), response.data]
            }));
            toast.success('File uploaded!');
        } catch (error) {
            const message = error.response?.data?.detail || 'Failed to upload file';
            toast.error(message);
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleDeleteResource = async (resourceId) => {
        try {
            await resourcesAPI.delete(resourceId);
            setLesson(prevLesson => ({
                ...prevLesson,
                resources: prevLesson.resources.filter(r => r.id !== resourceId)
            }));
            toast.success('Resource deleted');
        } catch (error) {
            toast.error('Failed to delete resource');
        }
    };

    if (loading) {
        return (
            <Layout>
                <div className="page-container py-6">
                    <Skeleton className="h-8 w-24 mb-4" />
                    <Skeleton className="h-12 w-64 mb-4" />
                    <Skeleton className="aspect-video rounded-xl mb-6" />
                </div>
            </Layout>
        );
    }

    if (!lesson) return null;

    const zoomLink = lesson.zoom_link || course?.zoom_link;
    const resources = lesson.resources || [];

    return (
        <Layout>
            <div className="page-container py-6 space-y-6">
                <Link to={`/courses/${lesson.course_id}`}>
                    <Button variant="ghost" className="gap-2 -ml-2" data-testid="back-to-course-btn">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Course
                    </Button>
                </Link>

                <div>
                    {lesson.lesson_date && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                            <Calendar className="w-4 h-4" />
                            {formatDate(lesson.lesson_date)}
                        </div>
                    )}
                    <h1 className="text-3xl md:text-4xl font-serif font-bold mb-2">{lesson.title}</h1>
                    <p className="text-muted-foreground">{lesson.description}</p>
                </div>

                <div className="flex flex-wrap gap-3">
                    {zoomLink && (
                        <Button onClick={handleJoinLive} className="zoom-button" data-testid="join-live-btn">
                            <Video className="w-4 h-4" />
                            Join Live Session
                        </Button>
                    )}
                    <Button onClick={handleMarkAttended} variant="outline" className="rounded-full" data-testid="mark-attended-btn">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        I Attended
                    </Button>
                </div>

                {lesson.youtube_url && (
                    <Card className="card-organic overflow-hidden">
                        <div className="youtube-wrapper">
                            <iframe
                                src={getYouTubeEmbedUrl(lesson.youtube_url)}
                                title={lesson.title}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                    </Card>
                )}

                <Tabs defaultValue="discussion" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-2 max-w-md">
                        <TabsTrigger value="discussion" data-testid="discussion-tab">Discussion</TabsTrigger>
                        <TabsTrigger value="resources" data-testid="resources-tab">Resources</TabsTrigger>
                    </TabsList>

                    <TabsContent value="discussion" className="space-y-4">
                        <Card className="card-organic">
                            <CardContent className="p-4">
                                <form onSubmit={handleSubmitComment} className="flex gap-3">
                                    <Avatar className="w-10 h-10 flex-shrink-0">
                                        <AvatarFallback className="bg-primary/10 text-primary">
                                            {getInitials(user?.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-grow flex gap-2">
                                        <Input
                                            placeholder="Share your thoughts..."
                                            value={newComment}
                                            onChange={(e) => setNewComment(e.target.value)}
                                            className="flex-grow"
                                            data-testid="comment-input"
                                        />
                                        <Button type="submit" disabled={submitting || !newComment.trim()} className="btn-primary" data-testid="submit-comment-btn">
                                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>

                        <div className="space-y-3">
                            {comments.length > 0 ? comments.map((comment) => (
                                <Card key={comment.id} className={`card-organic ${comment.is_hidden ? 'opacity-50' : ''}`} data-testid={`comment-${comment.id}`}>
                                    <CardContent className="p-4">
                                        <div className="flex gap-3">
                                            <Avatar className="w-10 h-10 flex-shrink-0">
                                                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                                    {getInitials(comment.user_name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-grow min-w-0">
                                                <div className="flex items-center justify-between gap-2 mb-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold">{comment.user_name}</span>
                                                        <span className="text-xs text-muted-foreground">{formatRelativeTime(comment.created_at)}</span>
                                                        {comment.is_hidden && <span className="text-xs bg-muted px-2 py-0.5 rounded">Hidden</span>}
                                                    </div>
                                                    {isTeacherOrAdmin && (
                                                        <div className="flex gap-1">
                                                            <Button variant="ghost" size="sm" onClick={() => handleHideComment(comment.id, !comment.is_hidden)} className="p-1 h-auto">
                                                                {comment.is_hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                                            </Button>
                                                            <Button variant="ghost" size="sm" onClick={() => setDeleteCommentId(comment.id)} className="p-1 h-auto text-destructive">
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="text-sm">{comment.content}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )) : (
                                <Card className="card-organic p-8 text-center">
                                    <p className="text-muted-foreground">No comments yet. Be the first to share your thoughts!</p>
                                </Card>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="resources" className="space-y-4">
                        {isTeacherOrAdmin && (
                            <Card className="card-organic">
                                <CardContent className="p-4">
                                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf,.ppt,.pptx,.jpg,.jpeg,.png,.gif" className="hidden" />
                                    <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="w-full btn-secondary" data-testid="upload-resource-btn">
                                        {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</> : <><Upload className="w-4 h-4 mr-2" />Upload Resource (PDF, PPT, Images - Max 25MB)</>}
                                    </Button>
                                </CardContent>
                            </Card>
                        )}

                        <div className="space-y-3">
                            {resources.length > 0 ? resources.map((resource) => {
                                const Icon = getResourceIcon(resource.file_type);
                                return (
                                    <Card key={resource.id} className="card-organic" data-testid={`resource-${resource.id}`}>
                                        <CardContent className="p-4 flex items-center gap-4">
                                            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                                <Icon className="w-6 h-6 text-primary" />
                                            </div>
                                            <div className="flex-grow min-w-0">
                                                <p className="font-medium truncate">{resource.original_filename}</p>
                                                <p className="text-sm text-muted-foreground">{formatFileSize(resource.file_size)} • {resource.file_type.toUpperCase()}</p>
                                            </div>
                                            <div className="flex gap-2 flex-shrink-0">
                                                {resource.file_type === 'pdf' && (
                                                    <a href={`${BACKEND_URL}/api/resources/${resource.id}/download`} target="_blank" rel="noopener noreferrer">
                                                        <Button variant="ghost" size="sm" data-testid={`preview-${resource.id}`}><ExternalLink className="w-4 h-4" /></Button>
                                                    </a>
                                                )}
                                                <a href={`${BACKEND_URL}/api/resources/${resource.id}/download`} download>
                                                    <Button variant="ghost" size="sm" data-testid={`download-${resource.id}`}><Download className="w-4 h-4" /></Button>
                                                </a>
                                                {isTeacherOrAdmin && (
                                                    <Button variant="ghost" size="sm" onClick={() => handleDeleteResource(resource.id)} className="text-destructive" data-testid={`delete-resource-${resource.id}`}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            }) : (
                                <Card className="card-organic p-8 text-center">
                                    <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                                    <p className="text-muted-foreground">{isTeacherOrAdmin ? 'No resources yet. Upload files for this lesson.' : 'No resources available for this lesson.'}</p>
                                </Card>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>

                <AlertDialog open={!!deleteCommentId} onOpenChange={() => setDeleteCommentId(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete Comment?</AlertDialogTitle>
                            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteComment} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </Layout>
    );
};

export default LessonDetail;

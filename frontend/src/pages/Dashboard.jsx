import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { lessonsAPI, coursesAPI, attendanceAPI, promptAPI } from '../lib/api';
import { formatDate, getYouTubeEmbedUrl } from '../lib/utils';
import { toast } from 'sonner';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { cn } from '../lib/utils';
import { 
    Video, Play, FileText, MessageSquare, CheckCircle,
    ArrowRight, BookOpen, Loader2, Check, Sparkles
} from 'lucide-react';

// The 5 core actions
const ACTIONS = [
    { key: 'joined_live', label: 'Join Live', icon: Video, color: 'bg-blue-500' },
    { key: 'watched_replay', label: 'Watch Replay', icon: Play, color: 'bg-purple-500' },
    { key: 'viewed_slides', label: 'View Slides', icon: FileText, color: 'bg-amber-500' },
    { key: 'responded', label: 'Respond', icon: MessageSquare, color: 'bg-green-500' },
    { key: 'marked_attended', label: 'Mark Attendance', icon: CheckCircle, color: 'bg-primary' },
];

export const Dashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [lesson, setLesson] = useState(null);
    const [course, setCourse] = useState(null);
    const [completedActions, setCompletedActions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showVideo, setShowVideo] = useState(false);
    const [promptResponse, setPromptResponse] = useState('');
    const [submittingPrompt, setSubmittingPrompt] = useState(false);
    const [showPromptInput, setShowPromptInput] = useState(false);
    const [isFirstVisit, setIsFirstVisit] = useState(false);

    useEffect(() => {
        // Check if first visit
        const hasVisited = localStorage.getItem('ss_visited');
        if (!hasVisited) {
            setIsFirstVisit(true);
            localStorage.setItem('ss_visited', 'true');
        }
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const lessonRes = await lessonsAPI.getNext();
            if (lessonRes.data) {
                setLesson(lessonRes.data);
                
                // Get course for zoom link fallback
                const courseRes = await coursesAPI.getOne(lessonRes.data.course_id);
                setCourse(courseRes.data);
                
                // Get user's completed actions
                const attendanceRes = await attendanceAPI.getMy(lessonRes.data.id);
                const actions = attendanceRes.data.actions || [];
                
                // Check if user has responded to prompt
                if (lessonRes.data.user_response) {
                    actions.push('responded');
                    setPromptResponse(lessonRes.data.user_response.content);
                }
                
                setCompletedActions(actions);
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (actionKey) => {
        if (!lesson) return;
        
        const zoomLink = lesson.zoom_link || course?.zoom_link;
        
        switch (actionKey) {
            case 'joined_live':
                if (zoomLink) {
                    await recordAction('joined_live');
                    window.open(zoomLink, '_blank');
                } else {
                    toast.info('No live session link available');
                }
                break;
            case 'watched_replay':
                if (lesson.youtube_url) {
                    setShowVideo(true);
                    await recordAction('watched_replay');
                } else {
                    toast.info('No replay available');
                }
                break;
            case 'viewed_slides':
                if (lesson.resources?.length > 0) {
                    await recordAction('viewed_slides');
                    navigate(`/lessons/${lesson.id}?tab=resources`);
                } else {
                    toast.info('No slides available');
                }
                break;
            case 'responded':
                if (lesson.prompt) {
                    setShowPromptInput(true);
                } else {
                    toast.info('No prompt for this lesson');
                }
                break;
            case 'marked_attended':
                await recordAction('marked_attended');
                break;
        }
    };

    const recordAction = async (action) => {
        try {
            await attendanceAPI.record(lesson.id, action);
            if (!completedActions.includes(action)) {
                setCompletedActions([...completedActions, action]);
            }
            toast.success(getActionMessage(action));
        } catch (error) {
            console.error('Failed to record action:', error);
        }
    };

    const getActionMessage = (action) => {
        switch (action) {
            case 'joined_live': return 'Joined live session!';
            case 'watched_replay': return 'Watching replay...';
            case 'viewed_slides': return 'Viewing slides...';
            case 'marked_attended': return 'Attendance marked! ✓';
            default: return 'Done!';
        }
    };

    const handleSubmitPrompt = async () => {
        if (!promptResponse.trim()) {
            toast.error('Please write a response');
            return;
        }
        
        setSubmittingPrompt(true);
        try {
            await promptAPI.respond(lesson.id, promptResponse.trim());
            if (!completedActions.includes('responded')) {
                setCompletedActions([...completedActions, 'responded']);
            }
            setShowPromptInput(false);
            toast.success('Response submitted! ✓');
        } catch (error) {
            toast.error('Failed to submit response');
        } finally {
            setSubmittingPrompt(false);
        }
    };

    const isActionCompleted = (key) => completedActions.includes(key);
    const completionPercent = Math.round((completedActions.length / 5) * 100);

    if (loading) {
        return (
            <Layout>
                <div className="page-container py-6">
                    <LoadingSkeleton variant="dashboard" />
                </div>
            </Layout>
        );
    }

    // First visit welcome
    if (isFirstVisit && !loading) {
        return (
            <Layout>
                <div className="page-container py-8 flex items-center justify-center min-h-[70vh]">
                    <Card className="card-organic max-w-md w-full text-center p-8 animate-fade-in">
                        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Sparkles className="w-10 h-10 text-primary" />
                        </div>
                        <h1 className="text-3xl font-serif font-bold mb-3">
                            Welcome, {user?.name?.split(' ')[0]}!
                        </h1>
                        <p className="text-muted-foreground mb-6">
                            Ready to start your Sunday School journey? Let's go to today's lesson.
                        </p>
                        <Button 
                            onClick={() => setIsFirstVisit(false)} 
                            className="btn-primary w-full text-lg py-6"
                            data-testid="start-lesson-btn"
                        >
                            Go to Today's Lesson
                            <ArrowRight className="w-5 h-5 ml-2" />
                        </Button>
                    </Card>
                </div>
            </Layout>
        );
    }

    if (!lesson) {
        return (
            <Layout>
                <div className="page-container py-8 flex items-center justify-center min-h-[70vh]">
                    <Card className="card-organic max-w-md w-full text-center p-8">
                        <BookOpen className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                        <h2 className="text-xl font-serif font-bold mb-2">No Lesson Today</h2>
                        <p className="text-muted-foreground mb-6">Check back soon for new content!</p>
                        <Link to="/courses">
                            <Button className="btn-primary">Browse Courses</Button>
                        </Link>
                    </Card>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="page-container py-4 md:py-6 space-y-6">
                {/* Lesson Header */}
                <div className="animate-fade-in">
                    <p className="text-sm text-muted-foreground mb-1">
                        {lesson.lesson_date ? formatDate(lesson.lesson_date) : "Today's Lesson"}
                    </p>
                    <h1 className="text-2xl md:text-3xl font-serif font-bold mb-1">
                        {lesson.title}
                    </h1>
                    <p className="text-muted-foreground text-sm md:text-base line-clamp-2">
                        {lesson.description}
                    </p>
                </div>

                {/* Progress Bar */}
                <div className="animate-fade-in" style={{ animationDelay: '0.05s' }}>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Your Progress</span>
                        <span className="text-sm text-muted-foreground">{completedActions.length}/5 complete</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-primary transition-all duration-500 rounded-full"
                            style={{ width: `${completionPercent}%` }}
                        />
                    </div>
                </div>

                {/* 5-Step Action Buttons */}
                <div className="grid grid-cols-5 gap-2 md:gap-3 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                    {ACTIONS.map((action, index) => {
                        const completed = isActionCompleted(action.key);
                        const Icon = action.icon;
                        return (
                            <button
                                key={action.key}
                                onClick={() => handleAction(action.key)}
                                className={cn(
                                    "flex flex-col items-center justify-center p-3 md:p-4 rounded-xl transition-all duration-200",
                                    "active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary/50",
                                    completed 
                                        ? "bg-primary/10 text-primary border-2 border-primary/30" 
                                        : "bg-muted hover:bg-muted/80 text-foreground border-2 border-transparent"
                                )}
                                data-testid={`action-${action.key}`}
                            >
                                <div className={cn(
                                    "w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center mb-2",
                                    completed ? "bg-primary text-primary-foreground" : action.color + " text-white"
                                )}>
                                    {completed ? <Check className="w-5 h-5 md:w-6 md:h-6" /> : <Icon className="w-5 h-5 md:w-6 md:h-6" />}
                                </div>
                                <span className="text-xs md:text-sm font-medium text-center leading-tight">
                                    {action.label}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Video Player (expandable) */}
                {showVideo && lesson.youtube_url && (
                    <Card className="card-organic overflow-hidden animate-fade-in">
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

                {/* Prompt Response Section */}
                {showPromptInput && lesson.prompt && (
                    <Card className="card-organic animate-fade-in">
                        <CardContent className="p-4 md:p-6">
                            <div className="flex items-start gap-3 mb-4">
                                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                                    <MessageSquare className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-semibold mb-1">This Week's Prompt</h3>
                                    <p className="text-muted-foreground">{lesson.prompt}</p>
                                </div>
                            </div>
                            <Textarea
                                placeholder="Share your thoughts..."
                                value={promptResponse}
                                onChange={(e) => setPromptResponse(e.target.value)}
                                rows={3}
                                className="mb-3"
                                data-testid="prompt-response-input"
                            />
                            <div className="flex gap-2">
                                <Button 
                                    onClick={handleSubmitPrompt}
                                    disabled={submittingPrompt}
                                    className="btn-primary flex-1"
                                    data-testid="submit-prompt-btn"
                                >
                                    {submittingPrompt ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            <Check className="w-4 h-4 mr-2" />
                                            Submit Response
                                        </>
                                    )}
                                </Button>
                                <Button 
                                    variant="outline"
                                    onClick={() => setShowPromptInput(false)}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Quick Links */}
                <div className="grid grid-cols-2 gap-3 animate-fade-in" style={{ animationDelay: '0.15s' }}>
                    <Link to={`/lessons/${lesson.id}`}>
                        <Card className="card-organic card-hover h-full">
                            <CardContent className="p-4 flex items-center gap-3">
                                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                                    <BookOpen className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <p className="font-medium text-sm">Full Lesson</p>
                                    <p className="text-xs text-muted-foreground">Discussion & more</p>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                    <Link to="/chat">
                        <Card className="card-organic card-hover h-full">
                            <CardContent className="p-4 flex items-center gap-3">
                                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                                    <MessageSquare className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <p className="font-medium text-sm">Chat</p>
                                    <p className="text-xs text-muted-foreground">Community</p>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                </div>

                {/* Completion Celebration */}
                {completedActions.length === 5 && (
                    <Card className="card-organic bg-primary/5 border-primary/20 animate-fade-in">
                        <CardContent className="p-6 text-center">
                            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="w-8 h-8 text-primary-foreground" />
                            </div>
                            <h3 className="text-xl font-serif font-bold mb-2">All Done! 🎉</h3>
                            <p className="text-muted-foreground">
                                You've completed all activities for today's lesson. See you next week!
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </Layout>
    );
};

export default Dashboard;

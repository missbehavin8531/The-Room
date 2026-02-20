import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { lessonsAPI, coursesAPI, attendanceAPI } from '../lib/api';
import { formatDate } from '../lib/utils';
import { toast } from 'sonner';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { cn } from '../lib/utils';
import { 
    Video, Play, FileText, MessageSquare, CheckCircle,
    ArrowRight, BookOpen, Sparkles, Calendar
} from 'lucide-react';

export const Dashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [lesson, setLesson] = useState(null);
    const [course, setCourse] = useState(null);
    const [completedActions, setCompletedActions] = useState([]);
    const [loading, setLoading] = useState(true);
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
                setCompletedActions(attendanceRes.data.actions || []);
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    const goToLesson = () => {
        if (lesson) {
            navigate(`/lessons/${lesson.id}`);
        } else {
            navigate('/courses');
        }
    };

    const completionCount = completedActions.length;
    const hasZoom = lesson?.zoom_link || course?.zoom_link;
    const hasVideo = lesson?.youtube_url;
    const hasResources = lesson?.resources?.length > 0;
    const hasPrompts = lesson?.prompts?.length > 0;

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
                        <img src="/logo.png" alt="The Room" className="w-20 h-20 mx-auto mb-6 rounded-2xl" />
                        <h1 className="text-3xl font-serif font-bold mb-3">
                            Welcome, {user?.name?.split(' ')[0]}!
                        </h1>
                        <p className="text-muted-foreground mb-6">
                            Ready to grow with your small group? Let's dive into this week's lesson.
                        </p>
                        <Button 
                            onClick={goToLesson} 
                            className="btn-primary w-full text-lg py-6"
                            data-testid="start-lesson-btn"
                        >
                            Go to This Week's Lesson
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
                {/* Welcome Header */}
                <div className="animate-fade-in">
                    <p className="text-sm text-muted-foreground mb-1">
                        Welcome back, {user?.name?.split(' ')[0]}
                    </p>
                    <h1 className="text-2xl md:text-3xl font-serif font-bold">
                        This Week's Lesson
                    </h1>
                </div>

                {/* Current Lesson Card */}
                <Card 
                    className="card-organic card-hover cursor-pointer animate-fade-in" 
                    onClick={goToLesson}
                    style={{ animationDelay: '0.05s' }}
                    data-testid="current-lesson-card"
                >
                    <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-4 mb-4">
                            <div>
                                {lesson.lesson_date && (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                        <Calendar className="w-4 h-4" />
                                        {formatDate(lesson.lesson_date)}
                                    </div>
                                )}
                                <h2 className="text-xl font-serif font-bold mb-1">{lesson.title}</h2>
                                <p className="text-muted-foreground text-sm line-clamp-2">{lesson.description}</p>
                            </div>
                            <div className="flex-shrink-0">
                                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                                    <ArrowRight className="w-6 h-6 text-primary-foreground" />
                                </div>
                            </div>
                        </div>

                        {/* Progress Indicator */}
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex-grow h-2 bg-muted rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-primary transition-all duration-500 rounded-full"
                                    style={{ width: `${(completionCount / 5) * 100}%` }}
                                />
                            </div>
                            <span className="text-sm text-muted-foreground font-medium">{completionCount}/5</span>
                        </div>

                        {/* Quick Status Icons */}
                        <div className="flex gap-2">
                            {hasZoom && (
                                <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center",
                                    completedActions.includes('joined_live') ? "bg-green-500 text-white" : "bg-blue-100 text-blue-600"
                                )}>
                                    <Video className="w-4 h-4" />
                                </div>
                            )}
                            {hasVideo && (
                                <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center",
                                    completedActions.includes('watched_replay') ? "bg-green-500 text-white" : "bg-purple-100 text-purple-600"
                                )}>
                                    <Play className="w-4 h-4" />
                                </div>
                            )}
                            {hasResources && (
                                <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center",
                                    completedActions.includes('viewed_slides') ? "bg-green-500 text-white" : "bg-amber-100 text-amber-600"
                                )}>
                                    <FileText className="w-4 h-4" />
                                </div>
                            )}
                            {hasPrompts && (
                                <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center",
                                    completedActions.includes('responded') ? "bg-green-500 text-white" : "bg-green-100 text-green-600"
                                )}>
                                    <MessageSquare className="w-4 h-4" />
                                </div>
                            )}
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center",
                                completedActions.includes('marked_attended') ? "bg-green-500 text-white" : "bg-gray-100 text-gray-600"
                            )}>
                                <CheckCircle className="w-4 h-4" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* CTA Button */}
                <Button 
                    onClick={goToLesson} 
                    className="btn-primary w-full text-lg py-6 animate-fade-in"
                    style={{ animationDelay: '0.1s' }}
                    data-testid="go-to-lesson-btn"
                >
                    {completionCount === 0 ? 'Start Lesson' : completionCount === 5 ? 'Review Lesson' : 'Continue Lesson'}
                    <ArrowRight className="w-5 h-5 ml-2" />
                </Button>

                {/* Quick Links */}
                <div className="grid grid-cols-2 gap-3 animate-fade-in" style={{ animationDelay: '0.15s' }}>
                    <Link to="/courses">
                        <Card className="card-organic card-hover h-full">
                            <CardContent className="p-4 flex items-center gap-3">
                                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                                    <BookOpen className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <p className="font-medium text-sm">All Courses</p>
                                    <p className="text-xs text-muted-foreground">Browse content</p>
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
                {completionCount === 5 && (
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

import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { lessonsAPI, coursesAPI, attendanceAPI, progressAPI, chatAPI } from '../lib/api';
import { formatDate, formatRelativeTime, getInitials, cn } from '../lib/utils';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import {
    ArrowRight, BookOpen, MessageCircle, Video, Play, FileText,
    MessageSquare, CheckCircle, Calendar, Flame, Trophy, GraduationCap,
    Sparkles, ChevronRight, Clock
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export const Dashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [lesson, setLesson] = useState(null);
    const [course, setCourse] = useState(null);
    const [completedActions, setCompletedActions] = useState([]);
    const [progress, setProgress] = useState(null);
    const [recentMessages, setRecentMessages] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        try {
            const [lessonRes, progressRes, chatRes] = await Promise.all([
                lessonsAPI.getNext().catch(() => ({ data: null })),
                progressAPI.getMyProgress().catch(() => ({ data: null })),
                chatAPI.getMessages(5).catch(() => ({ data: [] })),
            ]);

            if (lessonRes.data) {
                setLesson(lessonRes.data);
                const [courseRes, attRes] = await Promise.all([
                    coursesAPI.getOne(lessonRes.data.course_id).catch(() => ({ data: null })),
                    attendanceAPI.getMy(lessonRes.data.id).catch(() => ({ data: { actions: [] } })),
                ]);
                setCourse(courseRes.data);
                setCompletedActions(attRes.data.actions || []);
            }

            setProgress(progressRes.data);
            setRecentMessages(chatRes.data?.slice(-3) || []);
        } catch (error) {
            console.error('Dashboard fetch failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const goToLesson = () => {
        if (lesson) navigate(`/lessons/${lesson.id}`);
        else navigate('/courses');
    };

    const completionCount = completedActions.length;
    const firstName = user?.name?.split(' ')[0] || 'Friend';

    // Greeting based on time
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    if (loading) {
        return (
            <Layout>
                <div className="page-container py-6">
                    <LoadingSkeleton variant="dashboard" />
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="page-container py-6 md:py-8 space-y-8 max-w-2xl mx-auto" data-testid="dashboard">
                {/* Welcome Section */}
                <div className="space-y-1 animate-fade-in" data-testid="welcome-section">
                    <p className="text-sm tracking-widest uppercase font-semibold text-muted-foreground" style={{ fontFamily: "'Manrope', sans-serif" }}>
                        {greeting}
                    </p>
                    <h1 className="text-4xl sm:text-5xl font-bold tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
                        {firstName}
                    </h1>
                </div>

                {/* This Week's Lesson — Hero Card */}
                {lesson ? (
                    <div
                        className="relative overflow-hidden rounded-[2rem] p-6 sm:p-8 cursor-pointer group transition-transform duration-300 hover:-translate-y-1 active:scale-[0.98]"
                        style={{
                            background: 'linear-gradient(135deg, #4A5D3A 0%, #3D4D30 50%, #354428 100%)',
                            animationDelay: '0.05s',
                        }}
                        onClick={goToLesson}
                        data-testid="lesson-hero-card"
                    >
                        {/* Subtle texture overlay */}
                        <div className="absolute inset-0 opacity-[0.07] pointer-events-none"
                            style={{
                                backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(255,255,255,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.2) 0%, transparent 50%)',
                            }}
                        />

                        <div className="relative z-10 space-y-5">
                            {/* Course & Date */}
                            <div className="flex items-center justify-between">
                                <span className="text-white/60 text-xs tracking-widest uppercase font-semibold" style={{ fontFamily: "'Manrope', sans-serif" }}>
                                    This Week
                                </span>
                                {lesson.lesson_date && (
                                    <span className="flex items-center gap-1.5 text-white/50 text-xs">
                                        <Calendar className="w-3 h-3" />
                                        {formatDate(lesson.lesson_date)}
                                    </span>
                                )}
                            </div>

                            {/* Title */}
                            <div>
                                <h2 className="text-2xl sm:text-3xl text-white font-semibold tracking-tight mb-2" style={{ fontFamily: "'Fraunces', serif" }}>
                                    {lesson.title}
                                </h2>
                                {lesson.description && (
                                    <p className="text-white/60 text-sm line-clamp-2" style={{ fontFamily: "'Manrope', sans-serif" }}>
                                        {lesson.description}
                                    </p>
                                )}
                            </div>

                            {/* Segmented Progress */}
                            <div className="space-y-2">
                                <div className="flex gap-1.5">
                                    {[0, 1, 2, 3, 4].map(i => (
                                        <div
                                            key={i}
                                            className={cn(
                                                "h-1.5 flex-1 rounded-full transition-all duration-500",
                                                i < completionCount ? "bg-white" : "bg-white/20"
                                            )}
                                        />
                                    ))}
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-white/50 text-xs" style={{ fontFamily: "'Manrope', sans-serif" }}>
                                        {completionCount === 0 ? 'Not started' : completionCount === 5 ? 'Complete' : `${completionCount} of 5 steps`}
                                    </span>
                                    <div className="flex items-center gap-1.5 text-white text-sm font-semibold group-hover:gap-2.5 transition-all">
                                        <span style={{ fontFamily: "'Manrope', sans-serif" }}>
                                            {completionCount === 0 ? 'Begin' : completionCount === 5 ? 'Review' : 'Continue'}
                                        </span>
                                        <ArrowRight className="w-4 h-4" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <Card className="card-organic animate-fade-in">
                        <CardContent className="p-8 text-center">
                            <BookOpen className="w-14 h-14 text-muted-foreground/20 mx-auto mb-4" />
                            <h2 className="text-xl font-semibold mb-2" style={{ fontFamily: "'Fraunces', serif" }}>No Lesson This Week</h2>
                            <p className="text-muted-foreground text-sm mb-4">Check back soon for new content.</p>
                            <Link to="/courses">
                                <Button className="btn-primary">Browse Courses</Button>
                            </Link>
                        </CardContent>
                    </Card>
                )}

                {/* Stats Bento Grid */}
                {progress && (
                    <div className="grid grid-cols-2 gap-3 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                        {/* Streak — tall card */}
                        <Card className="card-organic row-span-2 overflow-hidden" data-testid="stat-streak">
                            <CardContent className="p-5 h-full flex flex-col justify-between min-h-[160px]">
                                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center">
                                    <Flame className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                </div>
                                <div>
                                    <p className="text-4xl font-bold tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
                                        {progress.streak_days || 0}
                                    </p>
                                    <p className="text-xs text-muted-foreground tracking-wide uppercase font-semibold mt-1" style={{ fontFamily: "'Manrope', sans-serif" }}>
                                        Day Streak
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Lessons Completed */}
                        <Card className="card-organic" data-testid="stat-lessons">
                            <CardContent className="p-5 flex flex-col justify-between h-full">
                                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                                    <Trophy className="w-4 h-4 text-green-600 dark:text-green-400" />
                                </div>
                                <div className="mt-2">
                                    <p className="text-2xl font-bold" style={{ fontFamily: "'Fraunces', serif" }}>
                                        {progress.total_lessons_completed || 0}
                                    </p>
                                    <p className="text-xs text-muted-foreground" style={{ fontFamily: "'Manrope', sans-serif" }}>Lessons Done</p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Enrolled Courses */}
                        <Card className="card-organic" data-testid="stat-enrolled">
                            <CardContent className="p-5 flex flex-col justify-between h-full">
                                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                                    <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="mt-2">
                                    <p className="text-2xl font-bold" style={{ fontFamily: "'Fraunces', serif" }}>
                                        {progress.total_courses_enrolled || 0}
                                    </p>
                                    <p className="text-xs text-muted-foreground" style={{ fontFamily: "'Manrope', sans-serif" }}>Enrolled</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Quick Actions */}
                <div className="space-y-3 animate-fade-in" style={{ animationDelay: '0.15s' }}>
                    <h3 className="text-xs tracking-widest uppercase font-semibold text-muted-foreground" style={{ fontFamily: "'Manrope', sans-serif" }}>
                        Quick Actions
                    </h3>
                    <div className="grid grid-cols-3 gap-3">
                        <Link to="/courses" className="group">
                            <Card className="card-organic transition-all hover:-translate-y-0.5" data-testid="quick-courses">
                                <CardContent className="p-4 flex flex-col items-center gap-2.5 text-center">
                                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                        <BookOpen className="w-5 h-5 text-primary" />
                                    </div>
                                    <span className="text-xs font-medium" style={{ fontFamily: "'Manrope', sans-serif" }}>Courses</span>
                                </CardContent>
                            </Card>
                        </Link>
                        <Link to="/chat" className="group">
                            <Card className="card-organic transition-all hover:-translate-y-0.5" data-testid="quick-chat">
                                <CardContent className="p-4 flex flex-col items-center gap-2.5 text-center">
                                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                        <MessageCircle className="w-5 h-5 text-primary" />
                                    </div>
                                    <span className="text-xs font-medium" style={{ fontFamily: "'Manrope', sans-serif" }}>Chat</span>
                                </CardContent>
                            </Card>
                        </Link>
                        <Link to="/progress" className="group">
                            <Card className="card-organic transition-all hover:-translate-y-0.5" data-testid="quick-progress">
                                <CardContent className="p-4 flex flex-col items-center gap-2.5 text-center">
                                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                        <Sparkles className="w-5 h-5 text-primary" />
                                    </div>
                                    <span className="text-xs font-medium" style={{ fontFamily: "'Manrope', sans-serif" }}>Progress</span>
                                </CardContent>
                            </Card>
                        </Link>
                    </div>
                </div>

                {/* Recent Chat Preview */}
                {recentMessages.length > 0 && (
                    <div className="space-y-3 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs tracking-widest uppercase font-semibold text-muted-foreground" style={{ fontFamily: "'Manrope', sans-serif" }}>
                                Community
                            </h3>
                            <Link to="/chat" className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
                                View All <ChevronRight className="w-3 h-3" />
                            </Link>
                        </div>
                        <Card className="card-organic" data-testid="recent-chat">
                            <CardContent className="p-4 space-y-3">
                                {recentMessages.map((msg) => (
                                    <div key={msg.id} className="flex items-start gap-3">
                                        <Avatar className="w-8 h-8 flex-shrink-0">
                                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                                {getInitials(msg.user_name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0 flex-grow">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium truncate">{msg.user_name}</span>
                                                <span className="text-xs text-muted-foreground flex-shrink-0">
                                                    {formatRelativeTime(msg.created_at)}
                                                </span>
                                            </div>
                                            <p className="text-sm text-muted-foreground line-clamp-1">{msg.content}</p>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Course Progress (if enrolled in courses) */}
                {progress?.courses?.length > 0 && (
                    <div className="space-y-3 animate-fade-in" style={{ animationDelay: '0.25s' }}>
                        <h3 className="text-xs tracking-widest uppercase font-semibold text-muted-foreground" style={{ fontFamily: "'Manrope', sans-serif" }}>
                            Your Courses
                        </h3>
                        <div className="space-y-3">
                            {progress.courses.slice(0, 3).map((cp) => (
                                <Link to="/courses" key={cp.course_id}>
                                    <Card className="card-organic transition-all hover:-translate-y-0.5 mb-3" data-testid={`course-progress-${cp.course_id}`}>
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-medium text-sm truncate mr-2" style={{ fontFamily: "'Manrope', sans-serif" }}>
                                                    {cp.course_title}
                                                </span>
                                                <Badge variant="secondary" className="text-xs flex-shrink-0">
                                                    {cp.completed_lessons}/{cp.total_lessons}
                                                </Badge>
                                            </div>
                                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-primary rounded-full transition-all duration-700"
                                                    style={{ width: `${cp.progress_percent}%` }}
                                                />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Completion Celebration */}
                {completionCount === 5 && lesson && (
                    <div
                        className="rounded-[2rem] p-6 text-center animate-fade-in"
                        style={{
                            background: 'linear-gradient(135deg, rgba(74,93,58,0.08) 0%, rgba(196,124,86,0.08) 100%)',
                            animationDelay: '0.3s',
                        }}
                        data-testid="completion-celebration"
                    >
                        <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center mx-auto mb-3">
                            <CheckCircle className="w-7 h-7 text-primary-foreground" />
                        </div>
                        <h3 className="text-xl font-semibold mb-1" style={{ fontFamily: "'Fraunces', serif" }}>
                            All Done This Week
                        </h3>
                        <p className="text-muted-foreground text-sm" style={{ fontFamily: "'Manrope', sans-serif" }}>
                            You've completed every step. See you next week!
                        </p>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default Dashboard;

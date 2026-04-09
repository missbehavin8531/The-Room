import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { lessonsAPI, coursesAPI, attendanceAPI } from '../lib/api';
import { toast } from 'sonner';
import { CourseWizard } from '../components/CourseWizard';
import { LessonWizard } from '../components/LessonWizard';
import { formatDate, cn } from '../lib/utils';
import {
    ArrowRight, BookOpen, Plus, Search, Users,
    UserPlus, Calendar, EyeOff, CheckCircle
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export const Dashboard = () => {
    const { user, isTeacherOrAdmin, isGuest } = useAuth();
    const navigate = useNavigate();
    const [lesson, setLesson] = useState(null);
    const [completedActions, setCompletedActions] = useState([]);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showCourseWizard, setShowCourseWizard] = useState(false);
    const [showLessonWizard, setShowLessonWizard] = useState(false);
    const [newCourseForLesson, setNewCourseForLesson] = useState(null);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const [lessonRes, coursesRes] = await Promise.all([
                lessonsAPI.getNext().catch(() => ({ data: null })),
                coursesAPI.getAll(),
            ]);
            if (lessonRes.data) {
                setLesson(lessonRes.data);
                const attRes = await attendanceAPI.getMy(lessonRes.data.id).catch(() => ({ data: { actions: [] } }));
                setCompletedActions(attRes.data.actions || []);
            }
            setCourses(coursesRes.data);
        } catch (error) {
            console.error('Dashboard fetch failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const goToLesson = () => {
        if (lesson) navigate(`/lessons/${lesson.id}`);
    };

    const handleEnroll = async (e, courseId, isEnrolled) => {
        e.preventDefault();
        e.stopPropagation();
        if (isGuest) { toast.error('Sign up to enroll in courses'); return; }
        // Optimistic: update UI immediately
        setCourses(prev => prev.map(c =>
            c.id === courseId
                ? { ...c, is_enrolled: !isEnrolled, enrollment_count: isEnrolled ? c.enrollment_count - 1 : c.enrollment_count + 1 }
                : c
        ));
        toast.success(isEnrolled ? 'Unenrolled from course' : 'Enrolled in course!');
        try {
            if (isEnrolled) {
                await coursesAPI.unenroll(courseId);
            } else {
                await coursesAPI.enroll(courseId);
            }
        } catch (error) {
            // Revert on failure
            setCourses(prev => prev.map(c =>
                c.id === courseId
                    ? { ...c, is_enrolled: isEnrolled, enrollment_count: isEnrolled ? c.enrollment_count + 1 : c.enrollment_count - 1 }
                    : c
            ));
            toast.error(error.response?.data?.detail || 'Failed to update enrollment');
        }
    };

    const handleCourseCreated = (course, shouldStartLessonWizard = false) => {
        setCourses([course, ...courses]);
        setShowCourseWizard(false);
        if (shouldStartLessonWizard) {
            setNewCourseForLesson(course);
            setShowLessonWizard(true);
        }
    };

    const handleLessonCreated = (lesson) => {
        setShowLessonWizard(false);
        if (newCourseForLesson) {
            navigate(`/courses/${newCourseForLesson.id}`);
            setNewCourseForLesson(null);
        }
    };

    const completionCount = completedActions.length;
    const firstName = user?.name?.split(' ')[0] || 'Friend';
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    const filteredCourses = courses.filter(course =>
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <Layout>
                <div className="page-container py-6 max-w-4xl mx-auto space-y-6">
                    <div className="h-8 w-48 bg-muted rounded-xl animate-pulse" />
                    <div className="h-48 bg-muted rounded-2xl animate-pulse" />
                    <div className="grid grid-cols-2 gap-3">
                        {[...Array(4)].map((_, i) => <div key={i} className="h-52 bg-muted rounded-2xl animate-pulse" />)}
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="page-container py-6 space-y-6 max-w-4xl mx-auto" data-testid="dashboard">
                {/* Welcome */}
                <div className="space-y-1 animate-fade-in">
                    <p className="text-xs tracking-widest uppercase font-semibold text-muted-foreground" style={{ fontFamily: "'Manrope', sans-serif" }}>
                        {greeting}
                    </p>
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
                        {firstName}
                    </h1>
                </div>

                {/* This Week's Lesson — Hero Card */}
                {lesson && (
                    <div
                        className="relative overflow-hidden rounded-2xl p-6 cursor-pointer group transition-transform duration-300 hover:-translate-y-0.5 active:scale-[0.99] animate-fade-in"
                        style={{ background: 'linear-gradient(135deg, #4A5D3A 0%, #3D4D30 50%, #354428 100%)', animationDelay: '0.05s' }}
                        onClick={goToLesson}
                        data-testid="lesson-hero-card"
                    >
                        <div className="absolute inset-0 opacity-[0.07] pointer-events-none"
                            style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(255,255,255,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.2) 0%, transparent 50%)' }}
                        />
                        <div className="relative z-10 space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-white/60 text-xs tracking-widest uppercase font-semibold" style={{ fontFamily: "'Manrope', sans-serif" }}>This Week</span>
                                {lesson.lesson_date && (
                                    <span className="flex items-center gap-1.5 text-white/50 text-xs">
                                        <Calendar className="w-3 h-3" />{formatDate(lesson.lesson_date)}
                                    </span>
                                )}
                            </div>
                            <div>
                                <h2 className="text-xl sm:text-2xl text-white font-semibold tracking-tight mb-1" style={{ fontFamily: "'Fraunces', serif" }}>
                                    {lesson.title}
                                </h2>
                                {lesson.description && (
                                    <p className="text-white/60 text-sm line-clamp-2" style={{ fontFamily: "'Manrope', sans-serif" }}>{lesson.description}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <div className="flex gap-1.5">
                                    {[0, 1, 2, 3, 4].map(i => (
                                        <div key={i} className={cn("h-1.5 flex-1 rounded-full transition-all duration-500", i < completionCount ? "bg-white" : "bg-white/20")} />
                                    ))}
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-white/50 text-xs" style={{ fontFamily: "'Manrope', sans-serif" }}>
                                        {completionCount === 0 ? 'Not started' : completionCount === 5 ? 'Complete' : `${completionCount} of 5 steps`}
                                    </span>
                                    <div className="flex items-center gap-1.5 text-white text-sm font-semibold group-hover:gap-2.5 transition-all">
                                        <span style={{ fontFamily: "'Manrope', sans-serif" }}>{completionCount === 0 ? 'Begin' : completionCount === 5 ? 'Review' : 'Continue'}</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Completion Celebration */}
                {completionCount === 5 && lesson && (
                    <div className="rounded-2xl p-5 text-center animate-fade-in"
                        style={{ background: 'linear-gradient(135deg, rgba(74,93,58,0.08) 0%, rgba(196,124,86,0.08) 100%)' }}
                        data-testid="completion-celebration"
                    >
                        <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-2">
                            <CheckCircle className="w-6 h-6 text-primary-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold mb-0.5" style={{ fontFamily: "'Fraunces', serif" }}>All Done This Week</h3>
                        <p className="text-muted-foreground text-sm" style={{ fontFamily: "'Manrope', sans-serif" }}>You've completed every step. See you next week!</p>
                    </div>
                )}

                {/* Courses Section */}
                <div className="space-y-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
                            Courses
                        </h2>
                        {isTeacherOrAdmin && (
                            <Button
                                className="btn-primary h-8 rounded-xl text-xs"
                                onClick={() => setShowCourseWizard(true)}
                                data-testid="create-course-btn"
                            >
                                <Plus className="w-3.5 h-3.5 mr-1" /> New
                            </Button>
                        )}
                    </div>

                    {/* Search */}
                    {courses.length > 3 && (
                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search courses..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 !rounded-xl"
                                data-testid="search-courses-input"
                            />
                        </div>
                    )}

                    {/* Course Grid */}
                    {filteredCourses.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 stagger-children">
                            {filteredCourses.map((course) => {
                                const progress = course.total_lessons > 0
                                    ? Math.round((course.completed_lessons / course.total_lessons) * 100)
                                    : 0;
                                const lessonCount = course.lesson_count || course.total_lessons || 0;

                                return (
                                    <Link to={`/courses/${course.id}`} key={course.id} className="block group">
                                        <Card className="card-organic overflow-hidden transition-all duration-300 hover:-translate-y-0.5 h-full" data-testid={`course-card-${course.id}`}>
                                            {/* Thumbnail */}
                                            <div className="relative aspect-[3/2] bg-muted overflow-hidden">
                                                {course.thumbnail_url ? (
                                                    <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                                ) : (
                                                    <div className="absolute inset-0 flex items-center justify-center bg-primary/5">
                                                        <BookOpen className="w-8 h-8 text-primary/20" />
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                                                {isTeacherOrAdmin && !course.is_published && (
                                                    <div className="absolute top-2 left-2">
                                                        <Badge variant="secondary" className="bg-black/40 text-white border-0 backdrop-blur-sm text-[10px]">
                                                            <EyeOff className="w-2.5 h-2.5 mr-0.5" />Draft
                                                        </Badge>
                                                    </div>
                                                )}
                                                {/* Meta on image */}
                                                <div className="absolute bottom-2 left-2 flex gap-1.5">
                                                    <span className="flex items-center gap-0.5 bg-black/40 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
                                                        <BookOpen className="w-2.5 h-2.5" /> {lessonCount}
                                                    </span>
                                                    <span className="flex items-center gap-0.5 bg-black/40 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
                                                        <Users className="w-2.5 h-2.5" /> {course.enrollment_count}
                                                    </span>
                                                </div>
                                            </div>
                                            {/* Body */}
                                            <CardContent className="p-3">
                                                <h3 className="font-semibold text-sm leading-snug mb-1 group-hover:text-primary transition-colors line-clamp-2" style={{ fontFamily: "'Fraunces', serif" }}>
                                                    {course.title}
                                                </h3>
                                                <p className="text-muted-foreground text-xs line-clamp-2 leading-relaxed mb-2" style={{ fontFamily: "'Manrope', sans-serif" }}>
                                                    {course.description}
                                                </p>
                                                {/* Enroll / Progress */}
                                                {!isGuest && (
                                                    course.is_enrolled ? (
                                                        <div>
                                                            <div className="h-1 bg-muted rounded-full overflow-hidden">
                                                                <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
                                                            </div>
                                                            <div className="flex items-center justify-between mt-1">
                                                                <span className="text-[10px] text-muted-foreground">{progress}%</span>
                                                                <Badge className="bg-primary/10 text-primary border-0 text-[10px] px-1.5 py-0">Enrolled</Badge>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <Button
                                                            size="sm"
                                                            className="btn-primary w-full h-7 rounded-lg text-[11px] transition-all"
                                                            onClick={(e) => handleEnroll(e, course.id, false)}
                                                            data-testid={`enroll-${course.id}`}
                                                        >
                                                            <UserPlus className="w-3 h-3 mr-1" /> Enroll
                                                        </Button>
                                                    )
                                                )}
                                            </CardContent>
                                        </Card>
                                    </Link>
                                );
                            })}
                        </div>
                    ) : (
                        <Card className="card-organic">
                            <CardContent className="p-8 text-center">
                                <BookOpen className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
                                <h3 className="font-semibold mb-1" style={{ fontFamily: "'Fraunces', serif" }}>
                                    {searchQuery ? 'No courses found' : 'No courses yet'}
                                </h3>
                                <p className="text-sm text-muted-foreground" style={{ fontFamily: "'Manrope', sans-serif" }}>
                                    {searchQuery ? 'Try adjusting your search terms' : 'Check back soon for new courses'}
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {showCourseWizard && (
                <CourseWizard onClose={() => setShowCourseWizard(false)} onSuccess={handleCourseCreated} />
            )}
            {showLessonWizard && newCourseForLesson && (
                <LessonWizard courseId={newCourseForLesson.id} courseName={newCourseForLesson.title} onClose={() => { setShowLessonWizard(false); if (newCourseForLesson) { navigate(`/courses/${newCourseForLesson.id}`); setNewCourseForLesson(null); } }} onSuccess={handleLessonCreated} />
            )}
        </Layout>
    );
};

export default Dashboard;

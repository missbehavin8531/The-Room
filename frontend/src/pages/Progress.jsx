import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { progressAPI } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { getInitials, cn } from '../lib/utils';
import {
    Flame, BookOpen, CheckCircle, TrendingUp, Users,
    ChevronRight, GraduationCap, Award
} from 'lucide-react';

const ProgressPage = () => {
    const { isTeacherOrAdmin, isGuest } = useAuth();
    const [progress, setProgress] = useState(null);
    const [students, setStudents] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('my');

    useEffect(() => { if (!isGuest) loadData(); }, []);

    const loadData = async () => {
        try {
            const res = await progressAPI.getMyProgress();
            setProgress(res.data);
            if (isTeacherOrAdmin) {
                const studRes = await progressAPI.getStudentProgress();
                setStudents(studRes.data.students);
            }
        } catch (error) {
            console.error('Failed to load progress:', error);
        } finally {
            setLoading(false);
        }
    };

    if (isGuest) {
        return (
            <Layout>
                <div className="page-container py-6 flex flex-col items-center justify-center min-h-[50vh]" data-testid="guest-progress-block">
                    <TrendingUp className="w-12 h-12 text-muted-foreground/30 mb-4" />
                    <h2 className="text-lg font-serif font-bold mb-2">Your Progress</h2>
                    <p className="text-sm text-muted-foreground mb-4 text-center max-w-xs">
                        Sign up to track your lesson progress, streaks, and course completions.
                    </p>
                    <a href="/" className="text-sm text-primary font-semibold hover:underline">Sign up free</a>
                </div>
            </Layout>
        );
    }

    if (loading) {
        return (
            <Layout>
                <div className="page-container py-6 max-w-2xl mx-auto space-y-5">
                    <Skeleton className="h-8 w-48 rounded-xl" />
                    <div className="grid grid-cols-2 gap-3">
                        <Skeleton className="h-36 rounded-2xl" />
                        <Skeleton className="h-16 rounded-2xl" />
                        <Skeleton className="h-16 rounded-2xl" />
                    </div>
                    <Skeleton className="h-48 rounded-2xl" />
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="page-container py-6 space-y-6 max-w-2xl mx-auto" data-testid="progress-page">
                {/* Header */}
                <div className="space-y-1 animate-fade-in">
                    <p className="text-xs tracking-widest uppercase font-semibold text-muted-foreground" style={{ fontFamily: "'Manrope', sans-serif" }}>
                        Dashboard
                    </p>
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
                        Progress
                    </h1>
                </div>

                {/* Tabs (Teacher/Admin only) */}
                {isTeacherOrAdmin && (
                    <div className="flex gap-6 border-b border-border/50 animate-fade-in" style={{ animationDelay: '0.05s' }}>
                        <button
                            onClick={() => setTab('my')}
                            className={cn(
                                "lesson-tab",
                                tab === 'my' ? "lesson-tab-active" : "lesson-tab-inactive"
                            )}
                            data-testid="tab-my-progress"
                        >
                            My Progress
                        </button>
                        <button
                            onClick={() => setTab('students')}
                            className={cn(
                                "lesson-tab",
                                tab === 'students' ? "lesson-tab-active" : "lesson-tab-inactive"
                            )}
                            data-testid="tab-student-progress"
                        >
                            Students
                        </button>
                    </div>
                )}

                {tab === 'my' && progress && <MyProgressSection data={progress} />}
                {tab === 'students' && students && <StudentProgressSection data={students} />}
            </div>
        </Layout>
    );
};

function MyProgressSection({ data }) {
    const courseList = data.courses || [];
    let avgProgress = 0;
    if (courseList.length > 0) {
        const total = courseList.reduce((sum, c) => sum + c.progress_percent, 0);
        avgProgress = Math.round(total / courseList.length);
    }

    return (
        <div className="space-y-6">
            {/* Stats Bento Grid — matches Dashboard pattern */}
            <div className="grid grid-cols-2 gap-3 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                {/* Streak — tall card */}
                <Card className="card-organic row-span-2 overflow-hidden" data-testid="progress-stat-streak">
                    <CardContent className="p-5 h-full flex flex-col justify-between min-h-[160px]">
                        <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center">
                            <Flame className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <p className="text-4xl font-bold tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
                                {data.streak_days || 0}
                            </p>
                            <p className="text-xs text-muted-foreground tracking-wide uppercase font-semibold mt-1" style={{ fontFamily: "'Manrope', sans-serif" }}>
                                Day Streak
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Lessons Completed */}
                <Card className="card-organic" data-testid="progress-stat-lessons">
                    <CardContent className="p-5 flex flex-col justify-between h-full">
                        <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="mt-2">
                            <p className="text-2xl font-bold" style={{ fontFamily: "'Fraunces', serif" }}>
                                {data.total_lessons_completed || 0}
                            </p>
                            <p className="text-xs text-muted-foreground" style={{ fontFamily: "'Manrope', sans-serif" }}>Lessons Done</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Enrolled */}
                <Card className="card-organic" data-testid="progress-stat-enrolled">
                    <CardContent className="p-5 flex flex-col justify-between h-full">
                        <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center">
                            <GraduationCap className="w-4 h-4 text-primary" />
                        </div>
                        <div className="mt-2">
                            <p className="text-2xl font-bold" style={{ fontFamily: "'Fraunces', serif" }}>
                                {data.total_courses_enrolled || 0}
                            </p>
                            <p className="text-xs text-muted-foreground" style={{ fontFamily: "'Manrope', sans-serif" }}>Courses</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Average Progress Ring-like Card */}
            {courseList.length > 0 && (
                <Card className="card-organic animate-fade-in" style={{ animationDelay: '0.15s' }} data-testid="progress-avg-card">
                    <CardContent className="p-5 flex items-center gap-5">
                        <div className="relative w-16 h-16 flex-shrink-0">
                            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                                <circle cx="32" cy="32" r="28" fill="none" stroke="hsl(var(--muted))" strokeWidth="5" />
                                <circle
                                    cx="32" cy="32" r="28" fill="none"
                                    stroke="hsl(var(--primary))"
                                    strokeWidth="5"
                                    strokeLinecap="round"
                                    strokeDasharray={`${avgProgress * 1.76} 176`}
                                    className="transition-all duration-1000"
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-sm font-bold" style={{ fontFamily: "'Fraunces', serif" }}>{avgProgress}%</span>
                            </div>
                        </div>
                        <div>
                            <p className="font-semibold text-sm" style={{ fontFamily: "'Manrope', sans-serif" }}>Overall Progress</p>
                            <p className="text-xs text-muted-foreground mt-0.5" style={{ fontFamily: "'Manrope', sans-serif" }}>
                                Across {courseList.length} {courseList.length === 1 ? 'course' : 'courses'}
                            </p>
                        </div>
                        <div className="ml-auto flex-shrink-0">
                            <TrendingUp className="w-5 h-5 text-primary/40" />
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Course Progress List */}
            <div className="space-y-3 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                <h2 className="text-xs tracking-widest uppercase font-semibold text-muted-foreground" style={{ fontFamily: "'Manrope', sans-serif" }}>
                    Course Progress
                </h2>

                {courseList.length === 0 ? (
                    <Card className="card-organic">
                        <CardContent className="p-8 text-center">
                            <BookOpen className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
                            <h3 className="font-semibold mb-1" style={{ fontFamily: "'Fraunces', serif" }}>No courses yet</h3>
                            <p className="text-sm text-muted-foreground mb-4" style={{ fontFamily: "'Manrope', sans-serif" }}>
                                Enroll in a course to start tracking your progress
                            </p>
                            <Link to="/courses" className="btn-primary inline-flex items-center gap-1.5 text-sm px-5 py-2.5 rounded-xl" data-testid="browse-courses-btn">
                                Browse Courses <ChevronRight className="w-4 h-4" />
                            </Link>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-2 stagger-children">
                        {courseList.map((course) => {
                            const isComplete = course.progress_percent === 100;
                            return (
                                <Link to={`/courses/${course.course_id}`} key={course.course_id} data-testid={`progress-course-${course.course_id}`}>
                                    <Card className={cn(
                                        "card-organic transition-all duration-200 hover:-translate-y-0.5 group",
                                        isComplete && "bg-green-50/50 dark:bg-green-900/10"
                                    )}>
                                        <CardContent className="p-4 flex items-center gap-3.5">
                                            {/* Icon */}
                                            <div className={cn(
                                                "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                                                isComplete ? "bg-green-100 dark:bg-green-900/30" : "bg-primary/10"
                                            )}>
                                                {isComplete ? (
                                                    <Award className="w-5 h-5 text-green-600" />
                                                ) : (
                                                    <BookOpen className="w-4 h-4 text-primary" />
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-grow min-w-0">
                                                <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors" style={{ fontFamily: "'Manrope', sans-serif" }}>
                                                    {course.course_title}
                                                </h3>
                                                <div className="flex items-center gap-2 mt-1.5">
                                                    <div className="h-1.5 flex-grow bg-muted rounded-full overflow-hidden">
                                                        <div
                                                            className={cn(
                                                                "h-full rounded-full transition-all duration-700",
                                                                isComplete ? "bg-green-500" : "bg-primary"
                                                            )}
                                                            style={{ width: `${course.progress_percent}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[11px] font-medium text-muted-foreground flex-shrink-0 w-8 text-right">
                                                        {course.progress_percent}%
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Right meta */}
                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                                                    {course.completed_lessons}/{course.total_lessons}
                                                </Badge>
                                                <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

function StudentProgressSection({ data }) {
    const studentList = data || [];

    return (
        <div className="space-y-3 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center justify-between">
                <h2 className="text-xs tracking-widest uppercase font-semibold text-muted-foreground" style={{ fontFamily: "'Manrope', sans-serif" }}>
                    {studentList.length} {studentList.length === 1 ? 'Student' : 'Students'}
                </h2>
            </div>

            {studentList.length === 0 ? (
                <Card className="card-organic">
                    <CardContent className="p-8 text-center">
                        <Users className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
                        <h3 className="font-semibold mb-1" style={{ fontFamily: "'Fraunces', serif" }}>No students enrolled</h3>
                        <p className="text-sm text-muted-foreground" style={{ fontFamily: "'Manrope', sans-serif" }}>
                            Share your invite code to get students started
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-2 stagger-children">
                    {studentList.map((s) => (
                        <Card key={s.user_id} className="card-organic" data-testid={`student-card-${s.user_id}`}>
                            <CardContent className="p-4 flex items-center gap-3.5">
                                <Avatar className="w-10 h-10 flex-shrink-0">
                                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                                        {getInitials(s.user_name)}
                                    </AvatarFallback>
                                </Avatar>

                                <div className="flex-grow min-w-0">
                                    <h3 className="font-semibold text-sm truncate" style={{ fontFamily: "'Manrope', sans-serif" }}>
                                        {s.user_name}
                                    </h3>
                                    <p className="text-xs text-muted-foreground truncate" style={{ fontFamily: "'Manrope', sans-serif" }}>
                                        {s.email}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <div className="text-right">
                                        <div className="flex items-center gap-1.5">
                                            <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                                                <BookOpen className="w-2.5 h-2.5 mr-0.5" />
                                                {s.courses_enrolled}
                                            </Badge>
                                            <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                                                <CheckCircle className="w-2.5 h-2.5 mr-0.5" />
                                                {s.lessons_completed}
                                            </Badge>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground mt-1" style={{ fontFamily: "'Manrope', sans-serif" }}>
                                            {s.last_activity
                                                ? new Date(s.last_activity).toLocaleDateString()
                                                : 'No activity'}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

export default ProgressPage;

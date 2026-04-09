import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { coursesAPI, lessonsAPI } from '../lib/api';
import { toast } from 'sonner';
import { EmptyState } from '../components/EmptyState';
import { CoursesSkeleton } from '../components/LoadingSkeleton';
import { LessonCalendar } from '../components/LessonCalendar';
import { CourseWizard } from '../components/CourseWizard';
import { LessonWizard } from '../components/LessonWizard';
import {
    BookOpen, Plus, Search, Users,
    UserPlus, UserMinus, Calendar, Grid3X3, EyeOff, ChevronRight
} from 'lucide-react';
import { cn } from '../lib/utils';

export const Courses = () => {
    const { isTeacherOrAdmin } = useAuth();
    const navigate = useNavigate();
    const [courses, setCourses] = useState([]);
    const [allLessons, setAllLessons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('grid');

    // Wizard states
    const [showCourseWizard, setShowCourseWizard] = useState(false);
    const [showLessonWizard, setShowLessonWizard] = useState(false);
    const [newCourseForLesson, setNewCourseForLesson] = useState(null);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const [coursesRes, lessonsRes] = await Promise.all([
                coursesAPI.getAll(),
                lessonsAPI.getAll()
            ]);
            setCourses(coursesRes.data);
            setAllLessons(lessonsRes.data);
        } catch (error) {
            toast.error('Failed to load courses');
        } finally {
            setLoading(false);
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
        setAllLessons([...allLessons, lesson]);
        setShowLessonWizard(false);
        if (newCourseForLesson) {
            navigate(`/courses/${newCourseForLesson.id}`);
            setNewCourseForLesson(null);
        }
    };

    const handleLessonWizardClose = () => {
        setShowLessonWizard(false);
        if (newCourseForLesson) {
            navigate(`/courses/${newCourseForLesson.id}`);
            setNewCourseForLesson(null);
        }
    };

    const handleEnroll = async (e, courseId, isEnrolled) => {
        e.preventDefault();
        e.stopPropagation();
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

    const handleLessonClick = (lesson) => { navigate(`/lessons/${lesson.id}`); };

    const filteredCourses = courses.filter(course =>
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <Layout>
                <div className="page-container py-6">
                    <div className="h-8 w-48 bg-muted rounded animate-pulse mb-6" />
                    <CoursesSkeleton />
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="page-container py-6 space-y-5 max-w-2xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between animate-fade-in">
                    <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
                        Courses
                    </h1>
                    <div className="flex items-center gap-2">
                        {/* View Toggle */}
                        <div className="flex p-0.5 bg-muted rounded-xl">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={cn(
                                    "p-2 rounded-lg transition-all",
                                    viewMode === 'grid'
                                        ? "bg-background shadow-sm text-foreground"
                                        : "text-muted-foreground"
                                )}
                                data-testid="view-grid-btn"
                            >
                                <Grid3X3 className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('calendar')}
                                className={cn(
                                    "p-2 rounded-lg transition-all",
                                    viewMode === 'calendar'
                                        ? "bg-background shadow-sm text-foreground"
                                        : "text-muted-foreground"
                                )}
                                data-testid="view-calendar-btn"
                            >
                                <Calendar className="w-4 h-4" />
                            </button>
                        </div>
                        {isTeacherOrAdmin && (
                            <Button
                                className="btn-primary h-9 rounded-xl text-sm"
                                onClick={() => setShowCourseWizard(true)}
                                data-testid="create-course-btn"
                            >
                                <Plus className="w-4 h-4 mr-1" />
                                New
                            </Button>
                        )}
                    </div>
                </div>

                {/* Search */}
                <div className="relative animate-fade-in" style={{ animationDelay: '0.05s' }}>
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search courses..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 !rounded-xl"
                        data-testid="search-courses-input"
                    />
                </div>

                {/* Content */}
                {viewMode === 'calendar' ? (
                    <LessonCalendar lessons={allLessons} onLessonClick={handleLessonClick} />
                ) : (
                    <>
                        {filteredCourses.length > 0 ? (
                            <div className="space-y-4 stagger-children">
                                {filteredCourses.map((course) => {
                                    const progress = course.total_lessons > 0
                                        ? Math.round((course.completed_lessons / course.total_lessons) * 100)
                                        : 0;
                                    const lessonCount = course.lesson_count || course.total_lessons || 0;

                                    return (
                                        <Link
                                            to={`/courses/${course.id}`}
                                            key={course.id}
                                            className="block group"
                                        >
                                            <Card
                                                className="card-organic overflow-hidden transition-all duration-300 hover:-translate-y-0.5"
                                                data-testid={`course-card-${course.id}`}
                                            >
                                                {/* Image */}
                                                <div className="relative aspect-[2.4/1] bg-muted overflow-hidden">
                                                    {course.thumbnail_url ? (
                                                        <img
                                                            src={course.thumbnail_url}
                                                            alt={course.title}
                                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                        />
                                                    ) : (
                                                        <div className="absolute inset-0 flex items-center justify-center bg-primary/5">
                                                            <BookOpen className="w-10 h-10 text-primary/20" />
                                                        </div>
                                                    )}
                                                    {/* Gradient scrim on image */}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                                                    {/* Badges */}
                                                    <div className="absolute top-3 left-3 flex gap-2">
                                                        {isTeacherOrAdmin && !course.is_published && (
                                                            <Badge variant="secondary" className="bg-black/40 text-white border-0 backdrop-blur-sm text-[11px]">
                                                                <EyeOff className="w-3 h-3 mr-1" />Draft
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    {/* Bottom-left meta chips on image */}
                                                    <div className="absolute bottom-3 left-3 flex gap-2">
                                                        <span className="flex items-center gap-1 bg-black/40 backdrop-blur-sm text-white text-[11px] font-medium px-2.5 py-1 rounded-full">
                                                            <BookOpen className="w-3 h-3" />
                                                            {lessonCount} {lessonCount === 1 ? 'lesson' : 'lessons'}
                                                        </span>
                                                        <span className="flex items-center gap-1 bg-black/40 backdrop-blur-sm text-white text-[11px] font-medium px-2.5 py-1 rounded-full">
                                                            <Users className="w-3 h-3" />
                                                            {course.enrollment_count}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Body */}
                                                <CardContent className="p-4">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="flex-grow min-w-0">
                                                            <h3 className="font-semibold text-base leading-snug mb-1 group-hover:text-primary transition-colors line-clamp-1" style={{ fontFamily: "'Fraunces', serif" }}>
                                                                {course.title}
                                                            </h3>
                                                            <p className="text-muted-foreground text-sm line-clamp-2 leading-relaxed" style={{ fontFamily: "'Manrope', sans-serif" }}>
                                                                {course.description}
                                                            </p>
                                                        </div>

                                                        {/* Enroll CTA — small pill */}
                                                        {course.is_enrolled ? (
                                                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                                                <Badge className="bg-primary/10 text-primary border-0 text-[11px] font-semibold px-2.5">
                                                                    Enrolled
                                                                </Badge>
                                                                {progress > 0 && (
                                                                    <span className="text-[11px] text-muted-foreground">{progress}%</span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <Button
                                                                size="sm"
                                                                className="btn-primary h-8 rounded-xl text-xs flex-shrink-0 transition-all"
                                                                onClick={(e) => handleEnroll(e, course.id, false)}
                                                                data-testid={`enroll-${course.id}`}
                                                            >
                                                                <UserPlus className="w-3.5 h-3.5 mr-1" />
                                                                Enroll
                                                            </Button>
                                                        )}
                                                    </div>

                                                    {/* Progress bar for enrolled */}
                                                    {course.is_enrolled && course.total_lessons > 0 && (
                                                        <div className="mt-3">
                                                            <div className="h-1 bg-muted rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-primary rounded-full transition-all duration-700"
                                                                    style={{ width: `${progress}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        </Link>
                                    );
                                })}
                            </div>
                        ) : (
                            <Card className="card-organic">
                                <EmptyState
                                    icon="courses"
                                    title={searchQuery ? 'No courses found' : 'No courses yet'}
                                    description={
                                        searchQuery
                                            ? 'Try adjusting your search terms'
                                            : isTeacherOrAdmin
                                                ? 'Create your first course to get started'
                                                : 'Check back soon for new courses'
                                    }
                                    action={isTeacherOrAdmin && !searchQuery && (
                                        <Button onClick={() => setShowCourseWizard(true)} className="btn-primary">
                                            <Plus className="w-4 h-4 mr-2" />
                                            Create Course
                                        </Button>
                                    )}
                                />
                            </Card>
                        )}
                    </>
                )}
            </div>

            {showCourseWizard && (
                <CourseWizard onClose={() => setShowCourseWizard(false)} onSuccess={handleCourseCreated} />
            )}
            {showLessonWizard && newCourseForLesson && (
                <LessonWizard
                    courseId={newCourseForLesson.id}
                    courseName={newCourseForLesson.title}
                    onClose={handleLessonWizardClose}
                    onSuccess={handleLessonCreated}
                />
            )}
        </Layout>
    );
};

export default Courses;

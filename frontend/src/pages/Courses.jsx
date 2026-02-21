import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { coursesAPI, lessonsAPI } from '../lib/api';
import { toast } from 'sonner';
import { EmptyState } from '../components/EmptyState';
import { CoursesSkeleton } from '../components/LoadingSkeleton';
import { LessonCalendar } from '../components/LessonCalendar';
import { CourseWizard } from '../components/CourseWizard';
import { LessonWizard } from '../components/LessonWizard';
import { 
    BookOpen, Plus, Search, Users, Video, 
    UserPlus, UserMinus, Calendar, Grid3X3, Eye, EyeOff
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
    const [enrolling, setEnrolling] = useState(null);
    
    // Wizard states
    const [showCourseWizard, setShowCourseWizard] = useState(false);
    const [showLessonWizard, setShowLessonWizard] = useState(false);
    const [newCourseForLesson, setNewCourseForLesson] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

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
            // Immediately start the lesson wizard for the new course
            setNewCourseForLesson(course);
            setShowLessonWizard(true);
        }
    };
    
    const handleLessonCreated = (lesson) => {
        setAllLessons([...allLessons, lesson]);
        setShowLessonWizard(false);
        setNewCourseForLesson(null);
        // Navigate to the course detail page
        if (newCourseForLesson) {
            navigate(`/courses/${newCourseForLesson.id}`);
        }
    };
    
    const handleLessonWizardClose = () => {
        setShowLessonWizard(false);
        // Still navigate to the course if wizard was closed without creating a lesson
        if (newCourseForLesson) {
            navigate(`/courses/${newCourseForLesson.id}`);
            setNewCourseForLesson(null);
        }
    };

    const handleEnroll = async (courseId, isEnrolled) => {
        setEnrolling(courseId);
        try {
            if (isEnrolled) {
                await coursesAPI.unenroll(courseId);
                toast.success('Unenrolled from course');
            } else {
                await coursesAPI.enroll(courseId);
                toast.success('Enrolled in course!');
            }
            setCourses(courses.map(c => 
                c.id === courseId 
                    ? { 
                        ...c, 
                        is_enrolled: !isEnrolled,
                        enrollment_count: isEnrolled ? c.enrollment_count - 1 : c.enrollment_count + 1
                    } 
                    : c
            ));
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to update enrollment');
        } finally {
            setEnrolling(null);
        }
    };

    const handleLessonClick = (lesson) => {
        navigate(`/lessons/${lesson.id}`);
    };

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
            <div className="page-container py-6 space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-serif font-bold">Courses</h1>
                        <p className="text-muted-foreground">Explore and learn from our courses</p>
                    </div>
                    
                    <div className="flex gap-2">
                        {/* View Toggle */}
                        <div className="flex gap-1 p-1 bg-muted rounded-lg">
                            <Button
                                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('grid')}
                                className="rounded-md"
                                data-testid="view-grid-btn"
                            >
                                <Grid3X3 className="w-4 h-4" />
                            </Button>
                            <Button
                                variant={viewMode === 'calendar' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('calendar')}
                                className="rounded-md"
                                data-testid="view-calendar-btn"
                            >
                                <Calendar className="w-4 h-4" />
                            </Button>
                        </div>

                        {isTeacherOrAdmin && (
                            <Button 
                                className="btn-primary" 
                                onClick={() => setShowCourseWizard(true)}
                                data-testid="create-course-btn"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Create Course
                            </Button>
                        )}
                    </div>
                </div>

                {/* Search */}
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search courses..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 input-clean"
                        data-testid="search-courses-input"
                    />
                </div>

                {/* Content */}
                {viewMode === 'calendar' ? (
                    <LessonCalendar lessons={allLessons} onLessonClick={handleLessonClick} />
                ) : (
                    <>
                        {filteredCourses.length > 0 ? (
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredCourses.map((course, index) => {
                                    const progress = course.total_lessons > 0 
                                        ? (course.completed_lessons / course.total_lessons) * 100 
                                        : 0;
                                    
                                    return (
                                        <Card 
                                            key={course.id} 
                                            className="card-organic card-hover h-full overflow-hidden animate-fade-in"
                                            style={{ animationDelay: `${index * 0.05}s` }}
                                            data-testid={`course-card-${course.id}`}
                                        >
                                            {/* Thumbnail */}
                                            <Link to={`/courses/${course.id}`}>
                                                <div className="aspect-video bg-muted relative overflow-hidden">
                                                    {course.thumbnail_url ? (
                                                        <img
                                                            src={course.thumbnail_url}
                                                            alt={course.title}
                                                            className="w-full h-full object-cover transition-transform hover:scale-105"
                                                        />
                                                    ) : (
                                                        <div className="absolute inset-0 flex items-center justify-center bg-primary/5">
                                                            <BookOpen className="w-12 h-12 text-primary/30" />
                                                        </div>
                                                    )}
                                                    {/* Draft badge for teachers */}
                                                    {isTeacherOrAdmin && !course.is_published && (
                                                        <Badge variant="secondary" className="absolute top-3 left-3">
                                                            <EyeOff className="w-3 h-3 mr-1" />
                                                            Draft
                                                        </Badge>
                                                    )}
                                                    {course.is_enrolled && (
                                                        <div className="absolute top-3 right-3 bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs">
                                                            Enrolled
                                                        </div>
                                                    )}
                                                </div>
                                            </Link>
                                            
                                            <CardContent className="p-4">
                                                <Link to={`/courses/${course.id}`}>
                                                    <h3 className="font-serif font-bold text-lg mb-2 line-clamp-2 hover:text-primary transition-colors">
                                                        {course.title}
                                                    </h3>
                                                </Link>
                                                <p className="text-muted-foreground text-sm line-clamp-2 mb-3">
                                                    {course.description}
                                                </p>
                                                
                                                {/* Progress bar for enrolled users */}
                                                {course.is_enrolled && course.total_lessons > 0 && (
                                                    <div className="mb-3">
                                                        <div className="flex items-center justify-between text-xs mb-1">
                                                            <span className="text-muted-foreground">Progress</span>
                                                            <span className="font-medium">{course.completed_lessons}/{course.total_lessons}</span>
                                                        </div>
                                                        <Progress value={progress} className="h-1.5" />
                                                    </div>
                                                )}
                                                
                                                <div className="flex items-center justify-between text-sm mb-3">
                                                    <span className="text-muted-foreground flex items-center gap-1">
                                                        <Users className="w-4 h-4" />
                                                        {course.enrollment_count} enrolled
                                                    </span>
                                                    <span className="text-primary font-medium">
                                                        {course.lesson_count || course.total_lessons} lessons
                                                    </span>
                                                </div>
                                                
                                                {/* Enroll Button */}
                                                <Button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        handleEnroll(course.id, course.is_enrolled);
                                                    }}
                                                    variant={course.is_enrolled ? "outline" : "default"}
                                                    className={cn(
                                                        "w-full",
                                                        course.is_enrolled ? "" : "btn-primary"
                                                    )}
                                                    disabled={enrolling === course.id}
                                                    data-testid={`enroll-${course.id}`}
                                                >
                                                    {enrolling === course.id ? (
                                                        'Loading...'
                                                    ) : course.is_enrolled ? (
                                                        <>
                                                            <UserMinus className="w-4 h-4 mr-2" />
                                                            Unenroll
                                                        </>
                                                    ) : (
                                                        <>
                                                            <UserPlus className="w-4 h-4 mr-2" />
                                                            Enroll Now
                                                        </>
                                                    )}
                                                </Button>
                                            </CardContent>
                                        </Card>
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
            
            {/* Course Creation Wizard */}
            {showCourseWizard && (
                <CourseWizard
                    onClose={() => setShowCourseWizard(false)}
                    onSuccess={handleCourseCreated}
                />
            )}
            
            {/* Lesson Creation Wizard (triggered after course creation) */}
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

import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { coursesAPI, lessonsAPI } from '../lib/api';
import { formatDate, cn } from '../lib/utils';
import { toast } from 'sonner';
import { LessonWizard } from '../components/LessonWizard';
import { 
    ArrowLeft,
    Plus, 
    Video,
    Calendar,
    BookOpen,
    Trash2,
    Edit2,
    Lock,
    CheckCircle,
    Eye,
    EyeOff,
    Play
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

export const CourseDetail = () => {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const { isTeacherOrAdmin } = useAuth();
    const [course, setCourse] = useState(null);
    const [lessons, setLessons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showLessonWizard, setShowLessonWizard] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    useEffect(() => {
        fetchCourseData();
    }, [courseId]);

    const fetchCourseData = async () => {
        try {
            const [courseRes, lessonsRes] = await Promise.all([
                coursesAPI.getOne(courseId),
                lessonsAPI.getByCourse(courseId)
            ]);
            setCourse(courseRes.data);
            setLessons(lessonsRes.data);
        } catch (error) {
            toast.error('Failed to load course');
            navigate('/courses');
        } finally {
            setLoading(false);
        }
    };

    const handleLessonCreated = (newLesson) => {
        setLessons([...lessons, newLesson]);
        setShowLessonWizard(false);
    };

    const handleDeleteCourse = async () => {
        try {
            await coursesAPI.delete(courseId);
            toast.success('Course deleted');
            navigate('/courses');
        } catch (error) {
            toast.error('Failed to delete course');
        }
    };

    if (loading) {
        return (
            <Layout>
                <div className="page-container py-6">
                    <Skeleton className="h-8 w-24 mb-4" />
                    <Skeleton className="h-12 w-64 mb-2" />
                    <Skeleton className="h-6 w-96 mb-6" />
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <Skeleton key={i} className="h-24 rounded-xl" />
                        ))}
                    </div>
                </div>
            </Layout>
        );
    }

    if (!course) return null;

    return (
        <Layout>
            <div className="page-container py-6 space-y-6">
                {/* Back Button */}
                <Link to="/courses">
                    <Button variant="ghost" className="gap-2 -ml-2" data-testid="back-to-courses-btn">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Courses
                    </Button>
                </Link>

                {/* Course Header */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-grow">
                        <h1 className="text-3xl md:text-4xl font-serif font-bold mb-2">
                            {course.title}
                        </h1>
                        <p className="text-muted-foreground mb-4">
                            {course.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            <span>By {course.teacher_name}</span>
                            <span>•</span>
                            <span>{lessons.length} lessons</span>
                            {course.zoom_link && (
                                <>
                                    <span>•</span>
                                    <a 
                                        href={course.zoom_link} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-blue-500 flex items-center gap-1 hover:underline"
                                    >
                                        <Video className="w-4 h-4" />
                                        Join Zoom
                                    </a>
                                </>
                            )}
                        </div>
                    </div>

                    {isTeacherOrAdmin && (
                        <div className="flex gap-2">
                            <Button 
                                className="btn-primary" 
                                onClick={() => setShowLessonWizard(true)}
                                data-testid="add-lesson-btn"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Lesson
                            </Button>

                            <Button 
                                variant="outline" 
                                className="text-destructive"
                                onClick={() => setDeleteDialogOpen(true)}
                                data-testid="delete-course-btn"
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>

                            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Course?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will permanently delete the course and all its lessons. This action cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleDeleteCourse} className="bg-destructive text-destructive-foreground">
                                            Delete
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    )}
                </div>
                
                {/* Course Progress (for members) */}
                {!isTeacherOrAdmin && course.total_lessons > 0 && (
                    <Card className="card-organic mb-6">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium">Your Progress</span>
                                <span className="text-sm text-muted-foreground">
                                    {course.completed_lessons} of {course.total_lessons} lessons
                                </span>
                            </div>
                            <Progress 
                                value={(course.completed_lessons / course.total_lessons) * 100} 
                                className="h-2"
                            />
                        </CardContent>
                    </Card>
                )}

                {/* Lessons List */}
                <div className="space-y-4">
                    <h2 className="text-xl font-serif font-semibold">Lessons</h2>
                    
                    {lessons.length > 0 ? (
                        <div className="space-y-3 stagger-children">
                            {lessons.map((lesson, index) => {
                                const isLocked = !lesson.is_unlocked;
                                const isCompleted = lesson.is_completed;
                                const isDraft = !lesson.is_published;
                                
                                return (
                                    <div key={lesson.id}>
                                        {isLocked && !isTeacherOrAdmin ? (
                                            <Card className="card-organic opacity-60 cursor-not-allowed" data-testid={`lesson-card-${lesson.id}`}>
                                                <CardContent className="p-4 flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center flex-shrink-0">
                                                        <Lock className="w-5 h-5 text-muted-foreground" />
                                                    </div>
                                                    <div className="flex-grow min-w-0">
                                                        <h3 className="font-semibold truncate text-muted-foreground">{lesson.title}</h3>
                                                        <p className="text-sm text-muted-foreground">
                                                            Complete the previous lesson to unlock
                                                        </p>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ) : (
                                            <Link to={`/lessons/${lesson.id}`} data-testid={`lesson-card-${lesson.id}`}>
                                                <Card className={cn(
                                                    "card-organic card-hover",
                                                    isCompleted && "border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10"
                                                )}>
                                                    <CardContent className="p-4 flex items-center gap-4">
                                                        <div className={cn(
                                                            "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
                                                            isCompleted 
                                                                ? "bg-green-100 dark:bg-green-900/30"
                                                                : "bg-primary/10"
                                                        )}>
                                                            {isCompleted ? (
                                                                <CheckCircle className="w-6 h-6 text-green-600" />
                                                            ) : (
                                                                <span className="text-primary font-bold">{index + 1}</span>
                                                            )}
                                                        </div>
                                                        <div className="flex-grow min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <h3 className="font-semibold truncate">{lesson.title}</h3>
                                                                {isDraft && isTeacherOrAdmin && (
                                                                    <Badge variant="secondary" className="text-xs">
                                                                        <EyeOff className="w-3 h-3 mr-1" />
                                                                        Draft
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <p className="text-sm text-muted-foreground line-clamp-1">
                                                                {lesson.description}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-2 flex-shrink-0 text-sm text-muted-foreground">
                                                            {lesson.lesson_date && (
                                                                <span className="hidden md:flex items-center gap-1">
                                                                    <Calendar className="w-4 h-4" />
                                                                    {formatDate(lesson.lesson_date)}
                                                                </span>
                                                            )}
                                                            {lesson.hosting_method === 'in_app' && (
                                                                <Video className="w-4 h-4 text-primary" />
                                                            )}
                                                            {lesson.hosting_method === 'zoom' && (
                                                                <Video className="w-4 h-4 text-blue-500" />
                                                            )}
                                                )}
                                                {lesson.resources?.length > 0 && (
                                                    <span className="bg-muted px-2 py-1 rounded text-xs">
                                                        {lesson.resources.length} files
                                                    </span>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <Card className="card-organic p-8 text-center">
                            <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No lessons yet</h3>
                            <p className="text-muted-foreground">
                                {isTeacherOrAdmin 
                                    ? 'Add your first lesson to this course'
                                    : 'Check back soon for new lessons'
                                }
                            </p>
                        </Card>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default CourseDetail;

import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { coursesAPI, lessonsAPI, certificatesAPI } from '../lib/api';
import { formatDate, cn } from '../lib/utils';
import { toast } from 'sonner';
import { LessonWizard } from '../components/LessonWizard';
import { CourseEditor } from '../components/CourseEditor';
import {
    ArrowLeft, Plus, Video, Calendar, BookOpen, Trash2,
    Lock, CheckCircle, EyeOff, Settings, ListOrdered,
    Award, Download, ChevronRight
} from 'lucide-react';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog';

export const CourseDetail = () => {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const { isTeacherOrAdmin, isGuest } = useAuth();
    const [course, setCourse] = useState(null);
    const [lessons, setLessons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showLessonWizard, setShowLessonWizard] = useState(false);
    const [showCourseEditor, setShowCourseEditor] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    useEffect(() => { fetchCourseData(); }, [courseId]);

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
    const handleCourseUpdated = (updatedCourse) => { setCourse(updatedCourse); };
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
                <div className="page-container py-6 max-w-2xl mx-auto space-y-4">
                    <Skeleton className="h-40 w-full rounded-2xl" />
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-5 w-full" />
                    <div className="space-y-3 pt-4">
                        {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
                    </div>
                </div>
            </Layout>
        );
    }

    if (!course) return null;

    const completedCount = lessons.filter(l => l.is_completed).length;
    const progress = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;

    return (
        <Layout>
            <div className="page-container py-6 space-y-6 max-w-2xl mx-auto">
                {/* Hero Banner */}
                <div className="animate-fade-in">
                    {/* Back */}
                    <Link to="/courses" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4" data-testid="back-to-courses-btn">
                        <ArrowLeft className="w-4 h-4" />
                        Courses
                    </Link>

                    {course.thumbnail_url ? (
                        <div className="relative rounded-2xl overflow-hidden aspect-[2.8/1] mb-5">
                            <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                            <div className="absolute bottom-4 left-4 flex gap-2">
                                <Badge className="bg-black/40 backdrop-blur-sm text-white border-0 text-[11px]">
                                    <BookOpen className="w-3 h-3 mr-1" />{lessons.length} lessons
                                </Badge>
                                <Badge className="bg-black/40 backdrop-blur-sm text-white border-0 text-[11px]">
                                    {course.unlock_type === 'scheduled' ? <><Calendar className="w-3 h-3 mr-1" />Scheduled</> : <><ListOrdered className="w-3 h-3 mr-1" />Sequential</>}
                                </Badge>
                            </div>
                        </div>
                    ) : (
                        <div className="relative rounded-2xl overflow-hidden aspect-[3/1] mb-5 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent flex items-center justify-center">
                            <BookOpen className="w-12 h-12 text-primary/15" />
                            <div className="absolute bottom-4 left-4 flex gap-2">
                                <Badge variant="secondary" className="text-[11px]">
                                    <BookOpen className="w-3 h-3 mr-1" />{lessons.length} lessons
                                </Badge>
                                <Badge variant="secondary" className="text-[11px]">
                                    {course.unlock_type === 'scheduled' ? <><Calendar className="w-3 h-3 mr-1" />Scheduled</> : <><ListOrdered className="w-3 h-3 mr-1" />Sequential</>}
                                </Badge>
                            </div>
                        </div>
                    )}

                    {/* Title & Meta */}
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex-grow min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
                                    {course.title}
                                </h1>
                                {isTeacherOrAdmin && !course.is_published && (
                                    <Badge variant="secondary" className="text-[11px]">
                                        <EyeOff className="w-3 h-3 mr-1" />Draft
                                    </Badge>
                                )}
                            </div>
                            <p className="text-muted-foreground text-sm leading-relaxed mb-2" style={{ fontFamily: "'Manrope', sans-serif" }}>
                                {course.description}
                            </p>
                            <p className="text-xs text-muted-foreground" style={{ fontFamily: "'Manrope', sans-serif" }}>
                                By {course.teacher_name}
                            </p>
                        </div>

                        {/* Admin actions — compact icon row */}
                        {isTeacherOrAdmin && (
                            <div className="flex gap-1.5 flex-shrink-0">
                                <button
                                    onClick={() => setShowCourseEditor(true)}
                                    className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                                    data-testid="edit-course-btn"
                                >
                                    <Settings className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setDeleteDialogOpen(true)}
                                    className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                                    data-testid="delete-course-btn"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Progress Bar (enrolled members) */}
                {!isTeacherOrAdmin && lessons.length > 0 && (
                    <Card className="card-organic animate-fade-in" style={{ animationDelay: '0.05s' }}>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium" style={{ fontFamily: "'Manrope', sans-serif" }}>Your Progress</span>
                                <span className="text-sm text-muted-foreground">
                                    {completedCount} of {lessons.length}
                                </span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
                            </div>
                            {completedCount === lessons.length && lessons.length > 0 && (
                                <div className="mt-4 pt-3 border-t flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Award className="w-5 h-5 text-amber-500" />
                                        <span className="font-medium text-sm text-green-600">Course Complete!</span>
                                    </div>
                                    <a
                                        href={certificatesAPI.download(courseId)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn-primary inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl"
                                        data-testid="download-certificate-btn"
                                    >
                                        <Download className="w-3 h-3" /> Certificate
                                    </a>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Lessons List */}
                <div className="space-y-3 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                    <div className="flex items-center justify-between">
                        <h2 className="text-xs tracking-widest uppercase font-semibold text-muted-foreground" style={{ fontFamily: "'Manrope', sans-serif" }}>
                            Lessons
                        </h2>
                        {isTeacherOrAdmin && (
                            <Button
                                size="sm"
                                className="btn-primary h-8 rounded-xl text-xs"
                                onClick={() => setShowLessonWizard(true)}
                                data-testid="add-lesson-btn"
                            >
                                <Plus className="w-3.5 h-3.5 mr-1" /> Add Lesson
                            </Button>
                        )}
                    </div>

                    {lessons.length > 0 ? (
                        <div className="space-y-2 stagger-children">
                            {lessons.map((lesson, index) => {
                                const isLocked = !lesson.is_unlocked && !isGuest;
                                const isCompleted = lesson.is_completed;
                                const isDraft = !lesson.is_published;

                                if (isLocked && !isTeacherOrAdmin) {
                                    return (
                                        <Card key={lesson.id} className="card-organic opacity-50" data-testid={`lesson-card-${lesson.id}`}>
                                            <CardContent className="p-4 flex items-center gap-3.5">
                                                <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                                                    <Lock className="w-4 h-4 text-muted-foreground" />
                                                </div>
                                                <div className="flex-grow min-w-0">
                                                    <p className="font-medium text-sm text-muted-foreground truncate">{lesson.title}</p>
                                                    <p className="text-xs text-muted-foreground">Complete previous to unlock</p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                }

                                return (
                                    <Link to={`/lessons/${lesson.id}`} key={lesson.id} data-testid={`lesson-card-${lesson.id}`}>
                                        <Card className={cn(
                                            "card-organic transition-all duration-200 hover:-translate-y-0.5 group",
                                            isCompleted && "bg-green-50/50 dark:bg-green-900/10"
                                        )}>
                                            <CardContent className="p-4 flex items-center gap-3.5">
                                                {/* Number / Check */}
                                                <div className={cn(
                                                    "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold transition-colors",
                                                    isCompleted
                                                        ? "bg-green-100 dark:bg-green-900/30"
                                                        : "bg-primary/10"
                                                )}>
                                                    {isCompleted ? (
                                                        <CheckCircle className="w-5 h-5 text-green-600" />
                                                    ) : (
                                                        <span className="text-primary">{index + 1}</span>
                                                    )}
                                                </div>

                                                {/* Title + meta */}
                                                <div className="flex-grow min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors" style={{ fontFamily: "'Manrope', sans-serif" }}>
                                                            {lesson.title}
                                                        </h3>
                                                        {isDraft && isTeacherOrAdmin && (
                                                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Draft</Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{lesson.description}</p>
                                                </div>

                                                {/* Right meta */}
                                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                                    {lesson.hosting_method === 'in_app' && <Video className="w-3.5 h-3.5 text-primary" />}
                                                    {lesson.hosting_method === 'zoom' && <Video className="w-3.5 h-3.5 text-blue-500" />}
                                                    {lesson.resources?.length > 0 && (
                                                        <span className="bg-muted text-muted-foreground text-[10px] font-medium px-1.5 py-0.5 rounded-md">
                                                            {lesson.resources.length}
                                                        </span>
                                                    )}
                                                    <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                                                </div>
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
                                <h3 className="font-semibold mb-1" style={{ fontFamily: "'Fraunces', serif" }}>No lessons yet</h3>
                                <p className="text-sm text-muted-foreground">
                                    {isTeacherOrAdmin ? 'Add your first lesson to this course' : 'Check back soon for new lessons'}
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* Delete Dialog */}
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
                        <AlertDialogAction onClick={handleDeleteCourse} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {showLessonWizard && (
                <LessonWizard courseId={courseId} courseName={course?.title} onClose={() => setShowLessonWizard(false)} onSuccess={handleLessonCreated} />
            )}
            {showCourseEditor && (
                <CourseEditor course={course} onClose={() => setShowCourseEditor(false)} onSuccess={handleCourseUpdated} />
            )}
        </Layout>
    );
};

export default CourseDetail;

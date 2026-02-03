import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { coursesAPI, lessonsAPI } from '../lib/api';
import { toast } from 'sonner';
import { EmptyState } from '../components/EmptyState';
import { CoursesSkeleton } from '../components/LoadingSkeleton';
import { LessonCalendar } from '../components/LessonCalendar';
import { 
    BookOpen, Plus, Search, Users, Video, ArrowRight,
    UserPlus, UserMinus, Calendar, Grid3X3
} from 'lucide-react';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { cn } from '../lib/utils';

export const Courses = () => {
    const { isTeacherOrAdmin } = useAuth();
    const navigate = useNavigate();
    const [courses, setCourses] = useState([]);
    const [allLessons, setAllLessons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'calendar'
    const [newCourse, setNewCourse] = useState({
        title: '', description: '', zoom_link: '', thumbnail_url: ''
    });
    const [creating, setCreating] = useState(false);
    const [enrolling, setEnrolling] = useState(null);

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

    const handleCreateCourse = async (e) => {
        e.preventDefault();
        if (!newCourse.title || !newCourse.description) {
            toast.error('Please fill in title and description');
            return;
        }

        setCreating(true);
        try {
            const response = await coursesAPI.create(newCourse);
            setCourses([response.data, ...courses]);
            setDialogOpen(false);
            setNewCourse({ title: '', description: '', zoom_link: '', thumbnail_url: '' });
            toast.success('Course created successfully!');
        } catch (error) {
            toast.error('Failed to create course');
        } finally {
            setCreating(false);
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
            // Update local state
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
                            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button className="btn-primary" data-testid="create-course-btn">
                                        <Plus className="w-4 h-4 mr-2" />
                                        Create Course
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                        <DialogTitle className="font-serif">Create New Course</DialogTitle>
                                    </DialogHeader>
                                    <form onSubmit={handleCreateCourse} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>Title</Label>
                                            <Input
                                                placeholder="Course title"
                                                value={newCourse.title}
                                                onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                                                data-testid="course-title-input"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Description</Label>
                                            <Textarea
                                                placeholder="Course description"
                                                value={newCourse.description}
                                                onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                                                rows={3}
                                                data-testid="course-description-input"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Zoom Link (optional)</Label>
                                            <Input
                                                placeholder="https://zoom.us/j/..."
                                                value={newCourse.zoom_link}
                                                onChange={(e) => setNewCourse({ ...newCourse, zoom_link: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Thumbnail URL (optional)</Label>
                                            <Input
                                                placeholder="https://..."
                                                value={newCourse.thumbnail_url}
                                                onChange={(e) => setNewCourse({ ...newCourse, thumbnail_url: e.target.value })}
                                            />
                                        </div>
                                        <Button type="submit" className="w-full btn-primary" disabled={creating}>
                                            {creating ? 'Creating...' : 'Create Course'}
                                        </Button>
                                    </form>
                                </DialogContent>
                            </Dialog>
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
                                {filteredCourses.map((course, index) => (
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
                                                {course.zoom_link && (
                                                    <div className="absolute top-3 right-3 bg-blue-500 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
                                                        <Video className="w-3 h-3" />
                                                        Live
                                                    </div>
                                                )}
                                                {course.is_enrolled && (
                                                    <div className="absolute top-3 left-3 bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs">
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
                                            <div className="flex items-center justify-between text-sm mb-3">
                                                <span className="text-muted-foreground flex items-center gap-1">
                                                    <Users className="w-4 h-4" />
                                                    {course.enrollment_count} enrolled
                                                </span>
                                                <span className="text-primary font-medium">
                                                    {course.lesson_count} lessons
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
                                ))}
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
                                        <Button onClick={() => setDialogOpen(true)} className="btn-primary">
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
        </Layout>
    );
};

export default Courses;

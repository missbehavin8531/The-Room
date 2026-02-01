import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Skeleton } from '../components/ui/skeleton';
import { coursesAPI } from '../lib/api';
import { toast } from 'sonner';
import { 
    BookOpen, 
    Plus, 
    Search,
    Users,
    Video,
    ArrowRight
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';

export const Courses = () => {
    const { isTeacherOrAdmin } = useAuth();
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [newCourse, setNewCourse] = useState({
        title: '',
        description: '',
        zoom_link: '',
        thumbnail_url: ''
    });
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            const response = await coursesAPI.getAll();
            setCourses(response.data);
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

    const filteredCourses = courses.filter(course =>
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <Layout>
                <div className="page-container py-6">
                    <Skeleton className="h-8 w-48 mb-6" />
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <Skeleton key={i} className="h-64 rounded-2xl" />
                        ))}
                    </div>
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
                                            data-testid="course-zoom-input"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Thumbnail URL (optional)</Label>
                                        <Input
                                            placeholder="https://..."
                                            value={newCourse.thumbnail_url}
                                            onChange={(e) => setNewCourse({ ...newCourse, thumbnail_url: e.target.value })}
                                            data-testid="course-thumbnail-input"
                                        />
                                    </div>
                                    <Button type="submit" className="w-full btn-primary" disabled={creating} data-testid="submit-course-btn">
                                        {creating ? 'Creating...' : 'Create Course'}
                                    </Button>
                                </form>
                            </DialogContent>
                        </Dialog>
                    )}
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

                {/* Courses Grid */}
                {filteredCourses.length > 0 ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
                        {filteredCourses.map((course) => (
                            <Link 
                                key={course.id} 
                                to={`/courses/${course.id}`}
                                data-testid={`course-card-${course.id}`}
                            >
                                <Card className="card-organic card-hover h-full overflow-hidden">
                                    {/* Thumbnail */}
                                    <div className="aspect-video bg-muted relative overflow-hidden">
                                        {course.thumbnail_url ? (
                                            <img
                                                src={course.thumbnail_url}
                                                alt={course.title}
                                                className="w-full h-full object-cover"
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
                                    </div>
                                    
                                    <CardContent className="p-4">
                                        <h3 className="font-serif font-bold text-lg mb-2 line-clamp-2">
                                            {course.title}
                                        </h3>
                                        <p className="text-muted-foreground text-sm line-clamp-2 mb-3">
                                            {course.description}
                                        </p>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground flex items-center gap-1">
                                                <Users className="w-4 h-4" />
                                                {course.teacher_name}
                                            </span>
                                            <span className="text-primary font-medium flex items-center gap-1">
                                                {course.lesson_count} lessons
                                                <ArrowRight className="w-4 h-4" />
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <Card className="card-organic p-12 text-center">
                        <BookOpen className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">
                            {searchQuery ? 'No courses found' : 'No courses yet'}
                        </h3>
                        <p className="text-muted-foreground">
                            {searchQuery 
                                ? 'Try adjusting your search terms'
                                : isTeacherOrAdmin 
                                    ? 'Create your first course to get started'
                                    : 'Check back soon for new courses'
                            }
                        </p>
                    </Card>
                )}
            </div>
        </Layout>
    );
};

export default Courses;

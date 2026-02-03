import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { lessonsAPI, coursesAPI, commentsAPI, attendanceAPI, enrollmentsAPI } from '../lib/api';
import { formatDate, getYouTubeEmbedUrl } from '../lib/utils';
import { toast } from 'sonner';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { 
    Calendar, Video, BookOpen, MessageSquare, ArrowRight,
    Play, Users, CheckCircle, Sparkles
} from 'lucide-react';

export const Dashboard = () => {
    const { user } = useAuth();
    const [nextLesson, setNextLesson] = useState(null);
    const [courses, setCourses] = useState([]);
    const [enrolledCourses, setEnrolledCourses] = useState([]);
    const [recentComments, setRecentComments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const [lessonRes, coursesRes, enrollmentsRes] = await Promise.all([
                lessonsAPI.getNext(),
                coursesAPI.getAll(),
                enrollmentsAPI.getMy(),
            ]);
            
            setNextLesson(lessonRes.data);
            setCourses(coursesRes.data);
            
            // Get enrolled course IDs and filter courses
            const enrolledIds = new Set(enrollmentsRes.data.map(e => e.course_id));
            setEnrolledCourses(coursesRes.data.filter(c => enrolledIds.has(c.id)));
            
            // Fetch comments for the next lesson if available
            if (lessonRes.data?.id) {
                const commentsRes = await commentsAPI.getByLesson(lessonRes.data.id);
                setRecentComments(commentsRes.data.slice(-3));
            }
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleJoinLive = async () => {
        if (nextLesson?.zoom_link) {
            try {
                await attendanceAPI.record(nextLesson.id, 'joined_live');
                toast.success('Attendance recorded!');
            } catch (error) {
                console.error('Failed to record attendance:', error);
            }
            window.open(nextLesson.zoom_link, '_blank');
        } else if (nextLesson) {
            const course = courses.find(c => c.id === nextLesson.course_id);
            if (course?.zoom_link) {
                try {
                    await attendanceAPI.record(nextLesson.id, 'joined_live');
                    toast.success('Attendance recorded!');
                } catch (error) {
                    console.error('Failed to record attendance:', error);
                }
                window.open(course.zoom_link, '_blank');
            } else {
                toast.info('No Zoom link available for this lesson');
            }
        }
    };

    const handleMarkAttended = async () => {
        if (nextLesson) {
            try {
                await attendanceAPI.record(nextLesson.id, 'marked_attended');
                toast.success('Marked as attended!');
            } catch (error) {
                toast.error('Failed to mark attendance');
            }
        }
    };

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
            <div className="page-container py-6 space-y-8">
                {/* Welcome Section */}
                <div className="animate-fade-in">
                    <h1 className="text-3xl md:text-4xl font-serif font-bold mb-2">
                        Welcome back, {user?.name?.split(' ')[0]}!
                    </h1>
                    <p className="text-muted-foreground">
                        Continue your spiritual journey with today's lesson
                    </p>
                </div>

                {/* Next Lesson Card */}
                {nextLesson ? (
                    <Card className="card-organic overflow-hidden animate-fade-in" style={{ animationDelay: '0.1s' }}>
                        <div className="md:flex">
                            {/* Video Preview */}
                            <div className="md:w-1/2 bg-muted aspect-video md:aspect-auto relative">
                                {nextLesson.youtube_url ? (
                                    <div className="youtube-wrapper h-full">
                                        <iframe
                                            src={getYouTubeEmbedUrl(nextLesson.youtube_url)}
                                            title={nextLesson.title}
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                        />
                                    </div>
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="text-center">
                                            <Play className="w-16 h-16 text-muted-foreground/30 mx-auto mb-2" />
                                            <p className="text-muted-foreground text-sm">No video available</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            {/* Lesson Info */}
                            <div className="md:w-1/2 p-6 flex flex-col">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                    <Calendar className="w-4 h-4" />
                                    {nextLesson.lesson_date ? formatDate(nextLesson.lesson_date) : 'Upcoming'}
                                </div>
                                <h2 className="text-2xl font-serif font-bold mb-2">{nextLesson.title}</h2>
                                <p className="text-muted-foreground flex-grow line-clamp-3 mb-4">
                                    {nextLesson.description}
                                </p>
                                
                                <div className="flex flex-wrap gap-3">
                                    <Button 
                                        onClick={handleJoinLive}
                                        className="zoom-button flex-1 md:flex-none active:scale-95 transition-transform"
                                        data-testid="join-live-btn"
                                    >
                                        <Video className="w-4 h-4" />
                                        Join Live
                                    </Button>
                                    <Button 
                                        onClick={handleMarkAttended}
                                        variant="outline"
                                        className="flex-1 md:flex-none rounded-full active:scale-95 transition-transform"
                                        data-testid="mark-attended-btn"
                                    >
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        I Attended
                                    </Button>
                                    <Link to={`/lessons/${nextLesson.id}`} className="flex-1 md:flex-none">
                                        <Button variant="ghost" className="w-full rounded-full active:scale-95 transition-transform" data-testid="view-lesson-btn">
                                            View Details
                                            <ArrowRight className="w-4 h-4 ml-2" />
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </Card>
                ) : (
                    <Card className="card-organic p-8 text-center animate-fade-in">
                        <BookOpen className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No upcoming lessons</h3>
                        <p className="text-muted-foreground mb-4">Check back soon for new content!</p>
                        <Link to="/courses">
                            <Button className="btn-primary active:scale-95 transition-transform">Browse Courses</Button>
                        </Link>
                    </Card>
                )}

                {/* Enrolled Courses Section */}
                {enrolledCourses.length > 0 && (
                    <div className="animate-fade-in" style={{ animationDelay: '0.15s' }}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-serif font-semibold flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-primary" />
                                My Courses
                            </h2>
                            <Link to="/courses">
                                <Button variant="ghost" size="sm" className="active:scale-95 transition-transform">
                                    View All <ArrowRight className="w-4 h-4 ml-1" />
                                </Button>
                            </Link>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {enrolledCourses.slice(0, 4).map((course, index) => (
                                <Link key={course.id} to={`/courses/${course.id}`}>
                                    <Card 
                                        className="card-organic card-hover overflow-hidden animate-fade-in"
                                        style={{ animationDelay: `${0.2 + index * 0.05}s` }}
                                    >
                                        <div className="aspect-video bg-muted relative">
                                            {course.thumbnail_url ? (
                                                <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="absolute inset-0 flex items-center justify-center bg-primary/5">
                                                    <BookOpen className="w-8 h-8 text-primary/30" />
                                                </div>
                                            )}
                                        </div>
                                        <CardContent className="p-3">
                                            <h3 className="font-medium text-sm line-clamp-1">{course.title}</h3>
                                            <p className="text-xs text-muted-foreground">{course.lesson_count} lessons</p>
                                        </CardContent>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Quick Actions Grid */}
                <div className="grid md:grid-cols-3 gap-4">
                    {/* Courses Preview */}
                    <Card className="card-organic card-hover animate-fade-in" style={{ animationDelay: '0.25s' }}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-primary" />
                                Your Courses
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold text-primary mb-1">{courses.length}</p>
                            <p className="text-sm text-muted-foreground mb-4">courses available</p>
                            <Link to="/courses">
                                <Button variant="ghost" className="w-full justify-between active:scale-95 transition-transform" data-testid="view-courses-btn">
                                    View All
                                    <ArrowRight className="w-4 h-4" />
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>

                    {/* Chat Preview */}
                    <Card className="card-organic card-hover animate-fade-in" style={{ animationDelay: '0.3s' }}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <MessageSquare className="w-5 h-5 text-primary" />
                                Community Chat
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">
                                Connect with fellow members and share your thoughts
                            </p>
                            <Link to="/chat">
                                <Button variant="ghost" className="w-full justify-between active:scale-95 transition-transform" data-testid="open-chat-btn">
                                    Open Chat
                                    <ArrowRight className="w-4 h-4" />
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>

                    {/* Discussion Preview */}
                    <Card className="card-organic card-hover animate-fade-in" style={{ animationDelay: '0.35s' }}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Users className="w-5 h-5 text-primary" />
                                Recent Discussion
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {recentComments.length > 0 ? (
                                <div className="space-y-2 mb-4">
                                    {recentComments.slice(0, 2).map((comment) => (
                                        <div key={comment.id} className="text-sm">
                                            <span className="font-medium">{comment.user_name}:</span>{' '}
                                            <span className="text-muted-foreground line-clamp-1">
                                                {comment.content}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground mb-4">
                                    No recent discussions. Start the conversation!
                                </p>
                            )}
                            {nextLesson && (
                                <Link to={`/lessons/${nextLesson.id}`}>
                                    <Button variant="ghost" className="w-full justify-between active:scale-95 transition-transform" data-testid="join-discussion-btn">
                                        Join Discussion
                                        <ArrowRight className="w-4 h-4" />
                                    </Button>
                                </Link>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Hero Image */}
                <div className="relative rounded-2xl overflow-hidden h-48 md:h-64 animate-fade-in" style={{ animationDelay: '0.4s' }}>
                    <img
                        src="https://images.unsplash.com/photo-1610070835951-156b6921281d?w=1200"
                        alt="Sunday School Community"
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-transparent flex items-center">
                        <div className="p-6 md:p-8 text-white max-w-md">
                            <h3 className="text-xl md:text-2xl font-serif font-bold mb-2">
                                Growing Together in Faith
                            </h3>
                            <p className="text-white/80 text-sm md:text-base">
                                Join our community of learners on this spiritual journey
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default Dashboard;

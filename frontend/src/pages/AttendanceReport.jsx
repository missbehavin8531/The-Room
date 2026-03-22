import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { attendanceReportsAPI, coursesAPI } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
    Users, Video, Play, CheckCircle, TrendingUp, Calendar
} from 'lucide-react';

function AttendanceReport() {
    const { isTeacherOrAdmin } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState(null);
    const [report, setReport] = useState([]);
    const [courses, setCourses] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState('all');

    useEffect(() => {
        if (!isTeacherOrAdmin) {
            navigate('/');
            return;
        }
        loadData();
    }, [isTeacherOrAdmin]);

    useEffect(() => {
        if (selectedCourse !== 'all') {
            loadReport(selectedCourse);
        } else {
            loadReport(null);
        }
    }, [selectedCourse]);

    const loadData = async () => {
        try {
            const [summaryRes, coursesRes] = await Promise.all([
                attendanceReportsAPI.getSummary(),
                coursesAPI.getAll()
            ]);
            setSummary(summaryRes.data);
            setCourses(coursesRes.data);
            await loadReport(null);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadReport = async (courseId) => {
        try {
            const res = await attendanceReportsAPI.getReport(courseId, null);
            setReport(res.data.report);
        } catch (error) {
            console.error('Failed to load report:', error);
        }
    };

    if (loading) {
        return (
            <Layout>
                <div className="max-w-6xl mx-auto space-y-4">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-64 w-full" />
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="max-w-6xl mx-auto" data-testid="attendance-report-page">
                <h1 className="text-3xl font-serif font-bold mb-6 flex items-center gap-3">
                    <Calendar className="w-8 h-8" />
                    Attendance Reports
                </h1>

                {/* Summary Stats */}
                {summary && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                        <Card>
                            <CardContent className="p-4 text-center">
                                <Users className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                                <p className="text-2xl font-bold">{summary.total_members}</p>
                                <p className="text-xs text-muted-foreground">Members</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4 text-center">
                                <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
                                <p className="text-2xl font-bold">{summary.total_completions}</p>
                                <p className="text-xs text-muted-foreground">Completions</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4 text-center">
                                <Video className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                                <p className="text-2xl font-bold">{summary.total_attendance_records}</p>
                                <p className="text-xs text-muted-foreground">Total Activity</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4 text-center">
                                <TrendingUp className="w-6 h-6 text-orange-600 mx-auto mb-2" />
                                <p className="text-2xl font-bold">{summary.attendance_last_7_days}</p>
                                <p className="text-xs text-muted-foreground">Last 7 Days</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4 text-center">
                                <Calendar className="w-6 h-6 text-teal-600 mx-auto mb-2" />
                                <p className="text-2xl font-bold">{summary.avg_attendance_rate}%</p>
                                <p className="text-xs text-muted-foreground">Avg Rate</p>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Filter */}
                <div className="mb-4">
                    <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                        <SelectTrigger className="w-64">
                            <SelectValue placeholder="Filter by course" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Courses</SelectItem>
                            {courses.map((course) => (
                                <SelectItem key={course.id} value={course.id}>
                                    {course.title}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Report Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Student Attendance</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {report.length === 0 ? (
                            <p className="text-muted-foreground text-center py-8">
                                No attendance data available
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left py-3 px-2">Student</th>
                                            <th className="text-center py-3 px-2">Lessons</th>
                                            <th className="text-center py-3 px-2">
                                                <Video className="w-4 h-4 inline" /> Live
                                            </th>
                                            <th className="text-center py-3 px-2">
                                                <Play className="w-4 h-4 inline" /> Replay
                                            </th>
                                            <th className="text-center py-3 px-2">
                                                <CheckCircle className="w-4 h-4 inline" /> Complete
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {report.map((row) => (
                                            <tr key={row.user_id} className="border-b hover:bg-muted/50">
                                                <td className="py-3 px-2 font-medium">{row.user_name}</td>
                                                <td className="text-center py-3 px-2">
                                                    <Badge variant="secondary">{row.lessons_attended}</Badge>
                                                </td>
                                                <td className="text-center py-3 px-2">{row.joined_video}</td>
                                                <td className="text-center py-3 px-2">{row.watched_replay}</td>
                                                <td className="text-center py-3 px-2">{row.marked_complete}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}

export default AttendanceReport;

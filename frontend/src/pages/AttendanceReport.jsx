import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { attendanceReportsAPI, coursesAPI } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog';
import {
    Users, Video, Play, CheckCircle, TrendingUp, Calendar, RotateCcw, Trash2
} from 'lucide-react';

function AttendanceReport({ embedded }) {
    var authData = useAuth();
    var isTeacherOrAdmin = authData.isTeacherOrAdmin;
    var navigate = useNavigate();

    var loadingState = useState(true);
    var loading = loadingState[0];
    var setLoading = loadingState[1];

    var summaryState = useState(null);
    var summary = summaryState[0];
    var setSummary = summaryState[1];

    var reportState = useState([]);
    var report = reportState[0];
    var setReport = reportState[1];

    var coursesState = useState([]);
    var courses = coursesState[0];
    var setCourses = coursesState[1];

    var courseState = useState('all');
    var selectedCourse = courseState[0];
    var setSelectedCourse = courseState[1];

    var resetDialogState = useState(false);
    var showResetDialog = resetDialogState[0];
    var setShowResetDialog = resetDialogState[1];

    var deleteUserState = useState(null);
    var deleteUserId = deleteUserState[0];
    var setDeleteUserId = deleteUserState[1];

    useEffect(function() {
        if (!isTeacherOrAdmin) {
            navigate('/');
            return;
        }
        loadData();
    }, [isTeacherOrAdmin]);

    useEffect(function() {
        if (selectedCourse !== 'all') {
            loadReport(selectedCourse);
        } else {
            loadReport(null);
        }
    }, [selectedCourse]);

    function loadData() {
        Promise.all([
            attendanceReportsAPI.getSummary(),
            coursesAPI.getAll()
        ]).then(function(results) {
            setSummary(results[0].data);
            setCourses(results[1].data);
            return loadReport(null);
        }).catch(function(error) {
            console.error('Failed to load data:', error);
        }).finally(function() {
            setLoading(false);
        });
    }

    function loadReport(courseId) {
        return attendanceReportsAPI.getReport(courseId, null)
            .then(function(res) {
                setReport(res.data.report);
            })
            .catch(function(error) {
                console.error('Failed to load report:', error);
            });
    }

    function handleResetAttendance() {
        var courseId = selectedCourse !== 'all' ? selectedCourse : undefined;
        attendanceReportsAPI.reset(courseId)
            .then(function(res) {
                toast.success(res.data.message);
                setShowResetDialog(false);
                loadData();
            })
            .catch(function() {
                toast.error('Failed to reset attendance');
                setShowResetDialog(false);
            });
    }

    function handleDeleteUserAttendance() {
        if (!deleteUserId) return;
        attendanceReportsAPI.deleteUserAttendance(deleteUserId)
            .then(function(res) {
                toast.success(res.data.message);
                setDeleteUserId(null);
                loadData();
            })
            .catch(function() {
                toast.error('Failed to delete user attendance');
                setDeleteUserId(null);
            });
    }

    if (loading) {
        var loadingSkeleton = (
            <div className="max-w-6xl mx-auto space-y-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
        if (embedded) return loadingSkeleton;
        return <Layout>{loadingSkeleton}</Layout>;
    }

    var attendanceContent = (
        <>
            <div className="max-w-6xl mx-auto" data-testid="attendance-report-page">
                {!embedded && (
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                    <h1 className="text-3xl font-serif font-bold flex items-center gap-3">
                        <Calendar className="w-8 h-8" />
                        Attendance Reports
                    </h1>
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={function() { setShowResetDialog(true); }}
                        data-testid="reset-attendance-btn"
                    >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Reset {selectedCourse !== 'all' ? 'Course' : 'All'} Attendance
                    </Button>
                </div>
                )}

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

                <div className="mb-4">
                    <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                        <SelectTrigger className="w-64">
                            <SelectValue placeholder="Filter by course" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Courses</SelectItem>
                            {courses.map(function(course) {
                                return (
                                    <SelectItem key={course.id} value={course.id}>
                                        {course.title}
                                    </SelectItem>
                                );
                            })}
                        </SelectContent>
                    </Select>
                </div>

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
                                            <th className="text-center py-3 px-2">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {report.map(function(row) {
                                            return (
                                                <tr key={row.user_id} className="border-b hover:bg-muted/50">
                                                    <td className="py-3 px-2 font-medium">{row.user_name}</td>
                                                    <td className="text-center py-3 px-2">
                                                        <Badge variant="secondary">{row.lessons_attended}</Badge>
                                                    </td>
                                                    <td className="text-center py-3 px-2">{row.joined_video}</td>
                                                    <td className="text-center py-3 px-2">{row.watched_replay}</td>
                                                    <td className="text-center py-3 px-2">{row.marked_complete}</td>
                                                    <td className="text-center py-3 px-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={function() { setDeleteUserId(row.user_id); }}
                                                            className="text-red-500 hover:text-red-700"
                                                            data-testid={'delete-attendance-' + row.user_id}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Reset Attendance</AlertDialogTitle>
                        <AlertDialogDescription>
                            {selectedCourse !== 'all'
                                ? 'This will delete all attendance records and lesson completions for the selected course. This action cannot be undone.'
                                : 'This will delete ALL attendance records and lesson completions across all courses. This action cannot be undone.'
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleResetAttendance} className="bg-red-600 hover:bg-red-700">
                            Reset
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!deleteUserId} onOpenChange={function(open) { if (!open) setDeleteUserId(null); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete User Attendance</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will remove all attendance records and lesson completions for this user. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteUserAttendance} className="bg-red-600 hover:bg-red-700">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );

    if (embedded) return attendanceContent;
    return <Layout>{attendanceContent}</Layout>;
}

export default AttendanceReport;
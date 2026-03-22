import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { progressAPI } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import {
    Trophy, Flame, BookOpen, CheckCircle, Clock, TrendingUp, Users
} from 'lucide-react';

const ProgressPage = () => {
    const { isTeacherOrAdmin } = useAuth();
    const [progress, setProgress] = useState(null);
    const [students, setStudents] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('my');

    useEffect(() => {
        loadData();
    }, []);

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

    if (loading) {
        return (
            <Layout>
                <div className="max-w-4xl mx-auto space-y-4">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-48 w-full" />
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="max-w-4xl mx-auto" data-testid="progress-page">
                <h1 className="text-3xl font-serif font-bold mb-6">Progress Dashboard</h1>
                
                {isTeacherOrAdmin && (
                    <div className="flex gap-2 mb-6">
                        <button
                            onClick={function() { setTab('my'); }}
                            className={'px-4 py-2 rounded-lg transition-colors ' + (tab === 'my' ? 'bg-primary text-primary-foreground' : 'bg-muted')}
                        >
                            My Progress
                        </button>
                        <button
                            onClick={function() { setTab('students'); }}
                            className={'px-4 py-2 rounded-lg transition-colors ' + (tab === 'students' ? 'bg-primary text-primary-foreground' : 'bg-muted')}
                        >
                            <Users className="w-4 h-4 inline mr-2" />
                            Student Progress
                        </button>
                    </div>
                )}

                {tab === 'my' && progress && <MyProgressSection data={progress} />}
                {tab === 'students' && students && <StudentProgressSection data={students} />}
            </div>
        </Layout>
    );
};

function MyProgressSection(props) {
    const data = props.data;
    
    let avgProgress = 0;
    const courseList = data.courses || [];
    if (courseList.length > 0) {
        let total = 0;
        for (let i = 0; i < courseList.length; i++) {
            total = total + courseList[i].progress_percent;
        }
        avgProgress = Math.round(total / courseList.length);
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-orange-50 border-orange-200">
                    <CardContent className="p-4 text-center">
                        <Flame className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-orange-700">{data.streak_days}</p>
                        <p className="text-xs text-orange-600">Day Streak</p>
                    </CardContent>
                </Card>
                <Card className="bg-green-50 border-green-200">
                    <CardContent className="p-4 text-center">
                        <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-green-700">{data.total_lessons_completed}</p>
                        <p className="text-xs text-green-600">Lessons Done</p>
                    </CardContent>
                </Card>
                <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4 text-center">
                        <BookOpen className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-blue-700">{data.total_courses_enrolled}</p>
                        <p className="text-xs text-blue-600">Courses</p>
                    </CardContent>
                </Card>
                <Card className="bg-purple-50 border-purple-200">
                    <CardContent className="p-4 text-center">
                        <TrendingUp className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-purple-700">{avgProgress}%</p>
                        <p className="text-xs text-purple-600">Avg Progress</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-yellow-500" />
                        Course Progress
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {courseList.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">
                            You haven't enrolled in any courses yet.
                        </p>
                    ) : (
                        courseList.map(function(course) {
                            return (
                                <div key={course.course_id} className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium text-sm">{course.course_title}</span>
                                        <Badge variant={course.progress_percent === 100 ? "default" : "secondary"}>
                                            {course.completed_lessons}/{course.total_lessons}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Progress value={course.progress_percent} className="flex-1" />
                                        <span className="text-sm text-muted-foreground w-12 text-right">
                                            {course.progress_percent}%
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function StudentProgressSection(props) {
    const studentList = props.data || [];
    
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Student Progress Overview
                </CardTitle>
            </CardHeader>
            <CardContent>
                {studentList.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No students enrolled yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left py-2">Student</th>
                                    <th className="text-center py-2">Courses</th>
                                    <th className="text-center py-2">Lessons</th>
                                    <th className="text-right py-2">Last Active</th>
                                </tr>
                            </thead>
                            <tbody>
                                {studentList.map(function(s) {
                                    return (
                                        <tr key={s.user_id} className="border-b">
                                            <td className="py-2">
                                                <p className="font-medium">{s.user_name}</p>
                                                <p className="text-xs text-muted-foreground">{s.email}</p>
                                            </td>
                                            <td className="text-center py-2">{s.courses_enrolled}</td>
                                            <td className="text-center py-2">
                                                <Badge variant="secondary">{s.lessons_completed}</Badge>
                                            </td>
                                            <td className="text-right py-2 text-muted-foreground">
                                                {s.last_activity 
                                                    ? new Date(s.last_activity).toLocaleDateString()
                                                    : 'Never'}
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
    );
}

export default ProgressPage;

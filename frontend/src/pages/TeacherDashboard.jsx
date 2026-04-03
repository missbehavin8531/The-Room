import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usersAPI, groupsAPI, analyticsAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { toast } from 'sonner';
import Layout from '../components/Layout';
import {
    Users, BookOpen, UserCheck, UserX, Copy, RefreshCw,
    CheckCircle, Clock, Loader2, Volume2, VolumeX
} from 'lucide-react';

const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?';

export const TeacherDashboard = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [group, setGroup] = useState(null);
    const [members, setMembers] = useState([]);
    const [pendingUsers, setPendingUsers] = useState([]);
    const [stats, setStats] = useState({ courses: 0, lessons: 0, attendance: 0 });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [groupRes, usersRes, pendingRes] = await Promise.all([
                groupsAPI.getMy(),
                usersAPI.getAll(),
                usersAPI.getPending()
            ]);
            setGroup(groupRes.data);
            setMembers(usersRes.data);
            setPendingUsers(pendingRes.data);

            try {
                const analyticsRes = await analyticsAPI.getOverview();
                setStats({
                    courses: analyticsRes.data.total_courses,
                    lessons: analyticsRes.data.total_lessons,
                    attendance: analyticsRes.data.attendance_records
                });
            } catch {}
        } catch (error) {
            console.error('Failed to fetch dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (userId) => {
        try {
            await usersAPI.approve(userId);
            toast.success('Member approved!');
            fetchData();
        } catch (error) {
            toast.error('Failed to approve');
        }
    };

    const handleToggleMute = async (userId, isMuted) => {
        try {
            await usersAPI.mute(userId, !isMuted);
            toast.success(isMuted ? 'Member unmuted' : 'Member muted');
            fetchData();
        } catch { toast.error('Failed'); }
    };

    if (loading) {
        return (
            <Layout>
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="space-y-6 max-w-4xl mx-auto" data-testid="teacher-dashboard">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-serif font-bold">My Group</h1>
                    {group && <p className="text-muted-foreground">{group.name}</p>}
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Card className="card-organic">
                        <CardContent className="p-4 text-center">
                            <Users className="w-5 h-5 mx-auto mb-1 text-primary" />
                            <p className="text-2xl font-bold">{group?.member_count || 0}</p>
                            <p className="text-xs text-muted-foreground">Members</p>
                        </CardContent>
                    </Card>
                    <Card className="card-organic">
                        <CardContent className="p-4 text-center">
                            <Clock className="w-5 h-5 mx-auto mb-1 text-amber-500" />
                            <p className="text-2xl font-bold">{pendingUsers.length}</p>
                            <p className="text-xs text-muted-foreground">Pending</p>
                        </CardContent>
                    </Card>
                    <Card className="card-organic">
                        <CardContent className="p-4 text-center">
                            <BookOpen className="w-5 h-5 mx-auto mb-1 text-blue-500" />
                            <p className="text-2xl font-bold">{stats.courses}</p>
                            <p className="text-xs text-muted-foreground">Courses</p>
                        </CardContent>
                    </Card>
                    <Card className="card-organic">
                        <CardContent className="p-4 text-center">
                            <CheckCircle className="w-5 h-5 mx-auto mb-1 text-green-500" />
                            <p className="text-2xl font-bold">{stats.attendance}</p>
                            <p className="text-xs text-muted-foreground">Attendance</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Invite Code Card */}
                {group && (
                    <Card className="card-organic bg-primary/5">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="flex-grow">
                                <p className="text-sm font-medium">Invite Code</p>
                                <p className="text-xs text-muted-foreground">Share with new members to join your group</p>
                            </div>
                            <code className="font-mono font-bold text-lg tracking-widest" data-testid="teacher-group-code">{group.invite_code}</code>
                            <Button
                                variant="outline"
                                size="icon"
                                className="shrink-0"
                                onClick={() => { navigator.clipboard.writeText(group.invite_code); toast.success('Copied!'); }}
                                data-testid="teacher-copy-code"
                            >
                                <Copy className="w-4 h-4" />
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Pending Approvals */}
                {pendingUsers.length > 0 && (
                    <Card className="card-organic border-amber-200 dark:border-amber-900/30">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Clock className="w-4 h-4 text-amber-500" />
                                Pending Approvals ({pendingUsers.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {pendingUsers.map(u => (
                                <div key={u.id} className="flex items-center gap-3 p-3 rounded-lg bg-amber-50/50 dark:bg-amber-900/10" data-testid={`pending-${u.id}`}>
                                    <Avatar className="w-8 h-8">
                                        <AvatarFallback className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30">{getInitials(u.name)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-grow min-w-0">
                                        <p className="text-sm font-medium truncate">{u.name}</p>
                                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                                    </div>
                                    <Button
                                        size="sm"
                                        onClick={() => handleApprove(u.id)}
                                        data-testid={`approve-${u.id}`}
                                    >
                                        <UserCheck className="w-3.5 h-3.5 mr-1.5" /> Approve
                                    </Button>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}

                {/* Group Members */}
                <Card className="card-organic">
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Group Members ({members.filter(m => m.is_approved).length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {members.filter(m => m.is_approved).length === 0 ? (
                            <p className="text-sm text-muted-foreground py-4 text-center">
                                No approved members yet. Share your invite code to get started!
                            </p>
                        ) : (
                            members.filter(m => m.is_approved).map(m => (
                                <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/30 transition-colors" data-testid={`member-${m.id}`}>
                                    <Avatar className="w-8 h-8">
                                        <AvatarFallback className="text-xs bg-primary/10 text-primary">{getInitials(m.name)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-grow min-w-0">
                                        <p className="text-sm font-medium truncate">{m.name}</p>
                                        <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                                    </div>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${
                                        m.role === 'teacher' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                        'bg-muted text-muted-foreground'
                                    }`}>{m.role}</span>
                                    {m.id !== user?.id && m.role !== 'admin' && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 shrink-0"
                                            onClick={() => handleToggleMute(m.id, m.is_muted)}
                                            title={m.is_muted ? 'Unmute' : 'Mute'}
                                        >
                                            {m.is_muted ? <VolumeX className="w-3.5 h-3.5 text-destructive" /> : <Volume2 className="w-3.5 h-3.5" />}
                                        </Button>
                                    )}
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
};

export default TeacherDashboard;

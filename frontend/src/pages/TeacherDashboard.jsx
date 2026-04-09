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
    CheckCircle, Clock, Loader2, Volume2, VolumeX,
    Share2, Mail, Link as LinkIcon, ClipboardCopy
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
                <div className="page-container py-6 space-y-6">
                    <div className="animate-pulse space-y-1">
                        <div className="h-7 w-48 bg-muted rounded-xl" />
                        <div className="h-4 w-64 bg-muted/60 rounded" />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="animate-pulse space-y-3 p-4 bg-muted/30 rounded-2xl" style={{ animationDelay: `${i * 100}ms` }}>
                                <div className="h-10 w-10 bg-muted rounded-xl" />
                                <div className="h-5 w-20 bg-muted rounded" />
                                <div className="h-3 w-16 bg-muted/60 rounded" />
                            </div>
                        ))}
                    </div>
                    <div className="space-y-3">
                        <div className="h-6 w-32 bg-muted rounded animate-pulse" />
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="animate-pulse flex items-center gap-3 p-3 bg-muted/30 rounded-xl" style={{ animationDelay: `${i * 80}ms` }}>
                                <div className="h-10 w-10 bg-muted rounded-full" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-32 bg-muted rounded" />
                                    <div className="h-3 w-48 bg-muted/60 rounded" />
                                </div>
                            </div>
                        ))}
                    </div>
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

                {/* Share Invite Section */}
                {group && (
                    <Card className="card-organic border-primary/20" data-testid="share-invite-card">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Share2 className="w-4 h-4 text-primary" />
                                Share Invite
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Invite Code Display */}
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5">
                                <div className="flex-grow">
                                    <p className="text-xs text-muted-foreground mb-0.5">Invite Code</p>
                                    <code className="font-mono font-bold text-lg tracking-widest" data-testid="teacher-group-code">{group.invite_code}</code>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => { navigator.clipboard.writeText(group.invite_code); toast.success('Code copied!'); }}
                                    data-testid="copy-invite-code"
                                >
                                    <Copy className="w-3.5 h-3.5 mr-1.5" /> Code
                                </Button>
                            </div>

                            {/* Share Actions */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <Button
                                    variant="outline"
                                    className="w-full justify-start"
                                    onClick={() => {
                                        var link = window.location.origin + '/register?code=' + group.invite_code;
                                        navigator.clipboard.writeText(link);
                                        toast.success('Registration link copied!');
                                    }}
                                    data-testid="copy-invite-link"
                                >
                                    <LinkIcon className="w-4 h-4 mr-2 text-blue-500" /> Copy Link
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full justify-start"
                                    onClick={() => {
                                        var link = window.location.origin + '/register?code=' + group.invite_code;
                                        var subject = encodeURIComponent('Join Our Sunday School Group on The Room');
                                        var body = encodeURIComponent(
                                            "Hi there,\n\nYou're invited to join our Sunday school group! We use an app called The Room to share lessons, resources, and stay connected throughout the week.\n\nHere's how to join:\n\n1. Click this link: " + link + "\n2. Enter your name\n3. The invite code " + group.invite_code + " will be pre-filled for you\n4. Create your account with your email and a password\n\nOnce you're in, I'll approve your account and you'll have access to all our lessons, discussions, and resources.\n\nSee you in class!"
                                        );
                                        window.open('mailto:?subject=' + subject + '&body=' + body);
                                    }}
                                    data-testid="send-invite-email"
                                >
                                    <Mail className="w-4 h-4 mr-2 text-green-600" /> Send Email
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full justify-start"
                                    onClick={() => {
                                        var link = window.location.origin + '/register?code=' + group.invite_code;
                                        var template = "Hi there,\n\nYou're invited to join our Sunday school group! We use an app called The Room to share lessons, resources, and stay connected throughout the week.\n\nHere's how to join:\n\n1. Click this link: " + link + "\n2. Enter your name\n3. The invite code " + group.invite_code + " will be pre-filled for you\n4. Create your account with your email and a password\n\nOnce you're in, I'll approve your account and you'll have access to all our lessons, discussions, and resources.\n\nSee you in class!";
                                        navigator.clipboard.writeText(template);
                                        toast.success('Email template copied!');
                                    }}
                                    data-testid="copy-email-template"
                                >
                                    <ClipboardCopy className="w-4 h-4 mr-2 text-purple-500" /> Copy Template
                                </Button>
                            </div>

                            <p className="text-xs text-muted-foreground">
                                New members who register with your code will appear in Pending Approvals above.
                            </p>
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

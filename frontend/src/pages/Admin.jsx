import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { usersAPI, analyticsAPI, seedAPI } from '../lib/api';
import { formatDate, getInitials, cn } from '../lib/utils';
import { toast } from 'sonner';
import { 
    Shield, 
    Users, 
    BookOpen, 
    MessageSquare, 
    CheckCircle,
    XCircle,
    UserCheck,
    UserX,
    BarChart3,
    Clock,
    Volume2,
    VolumeX,
    Trash2,
    Database
} from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../components/ui/select';
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

export const Admin = () => {
    const { user, isAdmin } = useAuth();
    const [users, setUsers] = useState([]);
    const [pendingUsers, setPendingUsers] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [participation, setParticipation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [deleteUserId, setDeleteUserId] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [usersRes, pendingRes, analyticsRes, participationRes] = await Promise.all([
                usersAPI.getAll(),
                usersAPI.getPending(),
                analyticsAPI.getOverview(),
                analyticsAPI.getParticipation()
            ]);
            setUsers(usersRes.data);
            setPendingUsers(pendingRes.data);
            setAnalytics(analyticsRes.data);
            setParticipation(participationRes.data);
        } catch (error) {
            console.error('Failed to fetch admin data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApproveUser = async (userId) => {
        try {
            await usersAPI.approve(userId);
            setPendingUsers(pendingUsers.filter(u => u.id !== userId));
            setUsers(users.map(u => u.id === userId ? { ...u, is_approved: true } : u));
            toast.success('User approved!');
            fetchData(); // Refresh analytics
        } catch (error) {
            toast.error('Failed to approve user');
        }
    };

    const handleUpdateRole = async (userId, role) => {
        try {
            await usersAPI.updateRole(userId, role);
            setUsers(users.map(u => u.id === userId ? { ...u, role } : u));
            toast.success(`Role updated to ${role}`);
        } catch (error) {
            toast.error('Failed to update role');
        }
    };

    const handleMuteUser = async (userId, muted) => {
        try {
            await usersAPI.mute(userId, muted);
            setUsers(users.map(u => u.id === userId ? { ...u, is_muted: muted } : u));
            toast.success(muted ? 'User muted' : 'User unmuted');
        } catch (error) {
            toast.error('Failed to update user');
        }
    };

    const handleDeleteUser = async () => {
        if (!deleteUserId) return;
        try {
            await usersAPI.delete(deleteUserId);
            setUsers(users.filter(u => u.id !== deleteUserId));
            setPendingUsers(pendingUsers.filter(u => u.id !== deleteUserId));
            toast.success('User deleted');
            fetchData();
        } catch (error) {
            toast.error('Failed to delete user');
        }
        setDeleteUserId(null);
    };

    const handleSeedData = async () => {
        try {
            const response = await seedAPI.seed();
            toast.success('Sample data created!');
            fetchData();
        } catch (error) {
            toast.error('Failed to seed data');
        }
    };

    const getRoleBadge = (role) => {
        const classes = {
            admin: 'bg-red-100 text-red-800',
            teacher: 'bg-blue-100 text-blue-800',
            member: 'bg-green-100 text-green-800'
        };
        return (
            <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium capitalize", classes[role])}>
                {role}
            </span>
        );
    };

    if (loading) {
        return (
            <Layout>
                <div className="page-container py-6">
                    <Skeleton className="h-8 w-48 mb-6" />
                    <div className="grid md:grid-cols-4 gap-4 mb-6">
                        {[1, 2, 3, 4].map(i => (
                            <Skeleton key={i} className="h-24 rounded-xl" />
                        ))}
                    </div>
                    <Skeleton className="h-64 rounded-xl" />
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
                        <h1 className="text-2xl font-serif font-bold flex items-center gap-2">
                            <Shield className="w-6 h-6 text-primary" />
                            Admin Panel
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            Manage users, moderate content, and view analytics
                        </p>
                    </div>
                    <Button onClick={handleSeedData} variant="outline" data-testid="seed-data-btn">
                        <Database className="w-4 h-4 mr-2" />
                        Seed Sample Data
                    </Button>
                </div>

                {/* Analytics Cards */}
                {analytics && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card className="card-organic">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 rounded-xl">
                                        <Users className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">{analytics.total_users}</p>
                                        <p className="text-xs text-muted-foreground">Total Users</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="card-organic">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-yellow-100 rounded-xl">
                                        <Clock className="w-5 h-5 text-yellow-600" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">{analytics.pending_users}</p>
                                        <p className="text-xs text-muted-foreground">Pending</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="card-organic">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-100 rounded-xl">
                                        <BookOpen className="w-5 h-5 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">{analytics.total_courses}</p>
                                        <p className="text-xs text-muted-foreground">Courses</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="card-organic">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-100 rounded-xl">
                                        <MessageSquare className="w-5 h-5 text-purple-600" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">{analytics.total_comments + analytics.total_chat_messages}</p>
                                        <p className="text-xs text-muted-foreground">Messages</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Tabs */}
                <Tabs defaultValue="pending" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-3 max-w-md">
                        <TabsTrigger value="pending" data-testid="pending-tab">
                            Pending ({pendingUsers.length})
                        </TabsTrigger>
                        <TabsTrigger value="users" data-testid="users-tab">All Users</TabsTrigger>
                        <TabsTrigger value="stats" data-testid="stats-tab">Stats</TabsTrigger>
                    </TabsList>

                    {/* Pending Users Tab */}
                    <TabsContent value="pending" className="space-y-4">
                        {pendingUsers.length > 0 ? (
                            <div className="space-y-3">
                                {pendingUsers.map(u => (
                                    <Card key={u.id} className="card-organic" data-testid={`pending-user-${u.id}`}>
                                        <CardContent className="p-4 flex items-center gap-4">
                                            <Avatar>
                                                <AvatarFallback className="bg-primary/10 text-primary">
                                                    {getInitials(u.name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-grow min-w-0">
                                                <p className="font-medium truncate">{u.name}</p>
                                                <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    Registered: {formatDate(u.created_at)}
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    onClick={() => handleApproveUser(u.id)}
                                                    size="sm"
                                                    className="bg-green-500 hover:bg-green-600 text-white"
                                                    data-testid={`approve-${u.id}`}
                                                >
                                                    <UserCheck className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    onClick={() => setDeleteUserId(u.id)}
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-destructive"
                                                    data-testid={`reject-${u.id}`}
                                                >
                                                    <UserX className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <Card className="card-organic p-8 text-center">
                                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                                <p className="text-muted-foreground">No pending approvals</p>
                            </Card>
                        )}
                    </TabsContent>

                    {/* All Users Tab */}
                    <TabsContent value="users" className="space-y-4">
                        <div className="space-y-3">
                            {users.filter(u => u.id !== user?.id).map(u => (
                                <Card key={u.id} className="card-organic" data-testid={`user-${u.id}`}>
                                    <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-4">
                                        <Avatar>
                                            <AvatarFallback className="bg-primary/10 text-primary">
                                                {getInitials(u.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-grow min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="font-medium">{u.name}</p>
                                                {getRoleBadge(u.role)}
                                                {!u.is_approved && (
                                                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                        Pending
                                                    </span>
                                                )}
                                                {u.is_muted && (
                                                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                        Muted
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {isAdmin && (
                                                <Select
                                                    value={u.role}
                                                    onValueChange={(value) => handleUpdateRole(u.id, value)}
                                                >
                                                    <SelectTrigger className="w-28" data-testid={`role-select-${u.id}`}>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="member">Member</SelectItem>
                                                        <SelectItem value="teacher">Teacher</SelectItem>
                                                        <SelectItem value="admin">Admin</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            )}
                                            <Button
                                                onClick={() => handleMuteUser(u.id, !u.is_muted)}
                                                variant="outline"
                                                size="sm"
                                                data-testid={`mute-${u.id}`}
                                            >
                                                {u.is_muted ? (
                                                    <Volume2 className="w-4 h-4" />
                                                ) : (
                                                    <VolumeX className="w-4 h-4" />
                                                )}
                                            </Button>
                                            {isAdmin && (
                                                <Button
                                                    onClick={() => setDeleteUserId(u.id)}
                                                    variant="outline"
                                                    size="sm"
                                                    className="text-destructive"
                                                    data-testid={`delete-${u.id}`}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </TabsContent>

                    {/* Stats Tab */}
                    <TabsContent value="stats" className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Top Commenters */}
                            <Card className="card-organic">
                                <CardHeader>
                                    <CardTitle className="text-lg">Top Discussion Participants</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {participation?.top_commenters?.length > 0 ? (
                                        <div className="space-y-3">
                                            {participation.top_commenters.map((item, index) => (
                                                <div key={item.user_id} className="flex items-center gap-3">
                                                    <span className="text-lg font-bold text-muted-foreground w-6">
                                                        {index + 1}
                                                    </span>
                                                    <Avatar className="w-8 h-8">
                                                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                                            {getInitials(item.user_name)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span className="flex-grow truncate">{item.user_name}</span>
                                                    <span className="text-sm text-muted-foreground">{item.count} posts</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-muted-foreground text-center py-4">No data yet</p>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Top Chatters */}
                            <Card className="card-organic">
                                <CardHeader>
                                    <CardTitle className="text-lg">Top Chat Participants</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {participation?.top_chatters?.length > 0 ? (
                                        <div className="space-y-3">
                                            {participation.top_chatters.map((item, index) => (
                                                <div key={item.user_id} className="flex items-center gap-3">
                                                    <span className="text-lg font-bold text-muted-foreground w-6">
                                                        {index + 1}
                                                    </span>
                                                    <Avatar className="w-8 h-8">
                                                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                                            {getInitials(item.user_name)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span className="flex-grow truncate">{item.user_name}</span>
                                                    <span className="text-sm text-muted-foreground">{item.count} msgs</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-muted-foreground text-center py-4">No data yet</p>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Summary Stats */}
                        {analytics && (
                            <Card className="card-organic">
                                <CardHeader>
                                    <CardTitle className="text-lg">Platform Summary</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                        <div>
                                            <p className="text-3xl font-bold text-primary">{analytics.total_lessons}</p>
                                            <p className="text-sm text-muted-foreground">Total Lessons</p>
                                        </div>
                                        <div>
                                            <p className="text-3xl font-bold text-primary">{analytics.total_comments}</p>
                                            <p className="text-sm text-muted-foreground">Discussion Posts</p>
                                        </div>
                                        <div>
                                            <p className="text-3xl font-bold text-primary">{analytics.total_chat_messages}</p>
                                            <p className="text-sm text-muted-foreground">Chat Messages</p>
                                        </div>
                                        <div>
                                            <p className="text-3xl font-bold text-primary">{analytics.attendance_records}</p>
                                            <p className="text-sm text-muted-foreground">Attendance Records</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>
                </Tabs>

                {/* Delete User Dialog */}
                <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete User?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will permanently remove this user. This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground">
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </Layout>
    );
};

export default Admin;

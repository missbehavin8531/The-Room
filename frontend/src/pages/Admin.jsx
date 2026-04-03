import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { usersAPI, analyticsAPI, groupsAPI } from '../lib/api';
import api from '../lib/api';
import { formatDate, getInitials, cn } from '../lib/utils';
import { toast } from 'sonner';
import { 
    Shield, Users, BookOpen, MessageSquare, CheckCircle,
    UserCheck, UserX, Clock, Volume2, VolumeX, Trash2, AlertTriangle,
    Copy, RefreshCw, UserPlus, Loader2, Plus, ChevronDown, ChevronUp, Edit3, X
} from 'lucide-react';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

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

export const Admin = () => {
    const { user, isAdmin, isTeacherOrAdmin } = useAuth();
    const [users, setUsers] = useState([]);
    const [pendingUsers, setPendingUsers] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [participation, setParticipation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [deleteUserId, setDeleteUserId] = useState(null);
    const [showCleanupDialog, setShowCleanupDialog] = useState(false);
    const [group, setGroup] = useState(null);
    const [allGroups, setAllGroups] = useState([]);
    const [editGroupName, setEditGroupName] = useState('');
    const [unassignedUsers, setUnassignedUsers] = useState([]);
    const [assigningUserId, setAssigningUserId] = useState(null);
    const [expandedGroupId, setExpandedGroupId] = useState(null);
    const [groupMembers, setGroupMembers] = useState({});
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [creatingGroup, setCreatingGroup] = useState(false);
    const [editingGroupId, setEditingGroupId] = useState(null);
    const [editingName, setEditingName] = useState('');
    const [deletingGroupId, setDeletingGroupId] = useState(null);
    const [assignTargetGroup, setAssignTargetGroup] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const usersRes = await usersAPI.getAll();
            const pendingRes = await usersAPI.getPending();
            const analyticsRes = await analyticsAPI.getOverview();
            const participationRes = await analyticsAPI.getParticipation();
            setUsers(usersRes.data);
            setPendingUsers(pendingRes.data);
            setAnalytics(analyticsRes.data);
            setParticipation(participationRes.data);
            
            try {
                const groupRes = await groupsAPI.getMy();
                setGroup(groupRes.data);
                setEditGroupName(groupRes.data.name);
            } catch {}

            try {
                const allGroupsRes = await groupsAPI.getAll();
                setAllGroups(allGroupsRes.data);
            } catch {}

            try {
                const unassignedRes = await usersAPI.getUnassigned();
                setUnassignedUsers(unassignedRes.data);
            } catch {}
        } catch (error) {
            console.error('Failed to fetch admin data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAssignToGroup = async (userId, groupId) => {
        setAssigningUserId(userId);
        try {
            const targetId = groupId || group?.id;
            if (!targetId) return;
            const res = await usersAPI.assignGroup(userId, targetId);
            toast.success(res.data.message);
            setUnassignedUsers(prev => prev.filter(u => u.id !== userId));
            setAssignTargetGroup(null);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to assign user');
        } finally {
            setAssigningUserId(null);
        }
    };

    const handleCreateGroup = async () => {
        if (!newGroupName.trim()) { toast.error('Enter a group name'); return; }
        setCreatingGroup(true);
        try {
            await groupsAPI.create({ name: newGroupName.trim() });
            toast.success(`Group "${newGroupName}" created`);
            setNewGroupName('');
            setShowCreateGroup(false);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to create group');
        } finally {
            setCreatingGroup(false);
        }
    };

    const handleDeleteGroup = async (groupId) => {
        try {
            const res = await groupsAPI.delete(groupId);
            toast.success(res.data.message);
            setDeletingGroupId(null);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to delete group');
        }
    };

    const handleUpdateGroupName = async (groupId, name) => {
        try {
            await groupsAPI.update(groupId, { name });
            toast.success('Group name updated');
            setEditingGroupId(null);
            fetchData();
        } catch { toast.error('Failed to update'); }
    };

    const toggleGroupMembers = async (groupId) => {
        if (expandedGroupId === groupId) {
            setExpandedGroupId(null);
            return;
        }
        setExpandedGroupId(groupId);
        if (!groupMembers[groupId]) {
            try {
                const res = await groupsAPI.getMembers(groupId);
                setGroupMembers(prev => ({ ...prev, [groupId]: res.data }));
            } catch {
                toast.error('Failed to load members');
            }
        }
    };

    const handleApproveUser = async (userId) => {
        try {
            await usersAPI.approve(userId);
            setPendingUsers(prev => prev.filter(u => u.id !== userId));
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_approved: true } : u));
            toast.success('User approved!');
            fetchData();
        } catch (error) {
            toast.error('Failed to approve user');
        }
    };

    const handleUpdateRole = async (userId, role) => {
        try {
            await usersAPI.updateRole(userId, role);
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
            toast.success(`Role updated to ${role}`);
        } catch (error) {
            toast.error('Failed to update role');
        }
    };

    const handleMuteUser = async (userId, muted) => {
        try {
            await usersAPI.mute(userId, muted);
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_muted: muted } : u));
            toast.success(muted ? 'User muted' : 'User unmuted');
        } catch (error) {
            toast.error('Failed to update user');
        }
    };

    const handleDeleteUser = async () => {
        if (!deleteUserId) return;
        try {
            await usersAPI.delete(deleteUserId);
            setUsers(prev => prev.filter(u => u.id !== deleteUserId));
            setPendingUsers(prev => prev.filter(u => u.id !== deleteUserId));
            toast.success('User deleted');
            fetchData();
        } catch (error) {
            toast.error('Failed to delete user');
        }
        setDeleteUserId(null);
    };

    const handleCleanupTestData = async () => {
        try {
            const res = await api.delete('/admin/cleanup-test-data');
            const data = res.data;
            if (data.deleted && data.deleted.length > 0) {
                toast.success(`Deleted ${data.deleted.length} members: ${data.deleted.join(', ')}`);
            } else {
                toast.info('No member accounts to delete');
            }
            setShowCleanupDialog(false);
            fetchData();
        } catch (error) {
            toast.error('Failed to cleanup test data');
            setShowCleanupDialog(false);
        }
    };

    if (loading) {
        return (
            <Layout>
                <div className="page-container py-6">
                    <Skeleton className="h-8 w-48 mb-6" />
                    <div className="grid md:grid-cols-4 gap-4 mb-6">
                        <Skeleton className="h-24 rounded-xl" />
                        <Skeleton className="h-24 rounded-xl" />
                        <Skeleton className="h-24 rounded-xl" />
                        <Skeleton className="h-24 rounded-xl" />
                    </div>
                </div>
            </Layout>
        );
    }

    const otherUsers = users.filter(u => u.id !== user?.id);
    const topCommenters = participation?.top_commenters || [];
    const topChatters = participation?.top_chatters || [];

    return (
        <Layout>
            <div className="page-container py-6 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-serif font-bold flex items-center gap-2">
                            <Shield className="w-6 h-6 text-primary" />Admin Panel
                        </h1>
                        <p className="text-muted-foreground text-sm">Manage users, moderate content, and view analytics</p>
                    </div>
                    <Button onClick={() => setShowCleanupDialog(true)} variant="destructive" size="sm" data-testid="cleanup-test-data-btn">
                        <Trash2 className="w-4 h-4 mr-2" />Delete All Members
                    </Button>
                </div>

                {analytics && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card className="card-organic">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 rounded-xl"><Users className="w-5 h-5 text-blue-600" /></div>
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
                                    <div className="p-2 bg-yellow-100 rounded-xl"><Clock className="w-5 h-5 text-yellow-600" /></div>
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
                                    <div className="p-2 bg-green-100 rounded-xl"><BookOpen className="w-5 h-5 text-green-600" /></div>
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
                                    <div className="p-2 bg-purple-100 rounded-xl"><MessageSquare className="w-5 h-5 text-purple-600" /></div>
                                    <div>
                                        <p className="text-2xl font-bold">{analytics.total_comments + analytics.total_chat_messages}</p>
                                        <p className="text-xs text-muted-foreground">Messages</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                <Tabs defaultValue="pending" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-4 max-w-lg">
                        <TabsTrigger value="pending" data-testid="pending-tab">Pending ({pendingUsers.length})</TabsTrigger>
                        <TabsTrigger value="users" data-testid="users-tab">Members</TabsTrigger>
                        <TabsTrigger value="group" data-testid="group-tab">Group</TabsTrigger>
                        <TabsTrigger value="stats" data-testid="stats-tab">Stats</TabsTrigger>
                    </TabsList>

                    <TabsContent value="pending" className="space-y-4">
                        {pendingUsers.length > 0 ? (
                            <div className="space-y-3">
                                {pendingUsers.map(u => (
                                    <Card key={u.id} className="card-organic" data-testid={`pending-user-${u.id}`}>
                                        <CardContent className="p-4 flex items-center gap-4">
                                            <Avatar><AvatarFallback className="bg-primary/10 text-primary">{getInitials(u.name)}</AvatarFallback></Avatar>
                                            <div className="flex-grow min-w-0">
                                                <p className="font-medium truncate">{u.name}</p>
                                                <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                                                <p className="text-xs text-muted-foreground">Registered: {formatDate(u.created_at)}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button onClick={() => handleApproveUser(u.id)} size="sm" className="bg-green-500 hover:bg-green-600 text-white" data-testid={`approve-${u.id}`}>
                                                    <UserCheck className="w-4 h-4" />
                                                </Button>
                                                <Button onClick={() => setDeleteUserId(u.id)} size="sm" variant="outline" className="text-destructive" data-testid={`reject-${u.id}`}>
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

                    <TabsContent value="users" className="space-y-4">
                        {unassignedUsers.length > 0 && (
                            <Card className="card-organic border-dashed border-2 border-primary/30">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <UserPlus className="w-4 h-4 text-primary" />
                                        Unassigned Members ({unassignedUsers.length})
                                    </CardTitle>
                                    <p className="text-xs text-muted-foreground">These members haven't been assigned to a group yet.</p>
                                </CardHeader>
                                <CardContent className="space-y-2 pt-0">
                                    {unassignedUsers.map(u => (
                                        <div key={u.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30" data-testid={`unassigned-user-${u.id}`}>
                                            <Avatar className="w-8 h-8"><AvatarFallback className="bg-primary/10 text-primary text-xs">{getInitials(u.name)}</AvatarFallback></Avatar>
                                            <div className="flex-grow min-w-0">
                                                <p className="text-sm font-medium truncate">{u.name}</p>
                                                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                                            </div>
                                            {allGroups.length > 1 ? (
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <select
                                                        className="text-xs px-2 py-1.5 border rounded-lg bg-background text-foreground max-w-[120px]"
                                                        defaultValue={group?.id || ''}
                                                        onChange={(e) => setAssignTargetGroup({ userId: u.id, groupId: e.target.value })}
                                                        data-testid={`assign-select-${u.id}`}
                                                    >
                                                        {allGroups.map(g => (
                                                            <option key={g.id} value={g.id}>{g.name}</option>
                                                        ))}
                                                    </select>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleAssignToGroup(u.id, assignTargetGroup?.userId === u.id ? assignTargetGroup.groupId : allGroups[0]?.id)}
                                                        disabled={assigningUserId === u.id}
                                                        data-testid={`assign-btn-${u.id}`}
                                                    >
                                                        {assigningUserId === u.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><UserPlus className="w-3.5 h-3.5 mr-1" />Add</>}
                                                    </Button>
                                                </div>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleAssignToGroup(u.id, group?.id)}
                                                    disabled={assigningUserId === u.id || !group}
                                                    data-testid={`assign-btn-${u.id}`}
                                                >
                                                    {assigningUserId === u.id
                                                        ? <Loader2 className="w-4 h-4 animate-spin" />
                                                        : <><UserPlus className="w-3.5 h-3.5 mr-1.5" />Add to {group?.name || 'Group'}</>
                                                    }
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        )}

                        <div className="space-y-3">
                            {otherUsers.map(u => (
                                <Card key={u.id} className="card-organic" data-testid={`user-${u.id}`}>
                                    <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-4">
                                        <Avatar><AvatarFallback className="bg-primary/10 text-primary">{getInitials(u.name)}</AvatarFallback></Avatar>
                                        <div className="flex-grow min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="font-medium">{u.name}</p>
                                                {getRoleBadge(u.role)}
                                                {!u.is_approved && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pending</span>}
                                                {u.is_muted && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Muted</span>}
                                            </div>
                                            <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {isTeacherOrAdmin && (
                                                <Select value={u.role} onValueChange={(value) => handleUpdateRole(u.id, value)}>
                                                    <SelectTrigger className="w-28" data-testid={`role-select-${u.id}`}><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="member">Member</SelectItem>
                                                        <SelectItem value="teacher">Teacher</SelectItem>
                                                        <SelectItem value="admin">Admin</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            )}
                                            <Button onClick={() => handleMuteUser(u.id, !u.is_muted)} variant="outline" size="sm" data-testid={`mute-${u.id}`}>
                                                {u.is_muted ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                                            </Button>
                                            {isTeacherOrAdmin && (
                                                <Button onClick={() => setDeleteUserId(u.id)} variant="outline" size="sm" className="text-destructive" data-testid={`delete-${u.id}`}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="stats" className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-6">
                            <Card className="card-organic">
                                <CardHeader><CardTitle className="text-lg">Top Discussion Participants</CardTitle></CardHeader>
                                <CardContent>
                                    {topCommenters.length > 0 ? (
                                        <div className="space-y-3">
                                            {topCommenters.map((item, index) => (
                                                <div key={item.user_id} className="flex items-center gap-3">
                                                    <span className="text-lg font-bold text-muted-foreground w-6">{index + 1}</span>
                                                    <Avatar className="w-8 h-8"><AvatarFallback className="bg-primary/10 text-primary text-xs">{getInitials(item.user_name)}</AvatarFallback></Avatar>
                                                    <span className="flex-grow truncate">{item.user_name}</span>
                                                    <span className="text-sm text-muted-foreground">{item.count} posts</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : <p className="text-muted-foreground text-center py-4">No data yet</p>}
                                </CardContent>
                            </Card>

                            <Card className="card-organic">
                                <CardHeader><CardTitle className="text-lg">Top Chat Participants</CardTitle></CardHeader>
                                <CardContent>
                                    {topChatters.length > 0 ? (
                                        <div className="space-y-3">
                                            {topChatters.map((item, index) => (
                                                <div key={item.user_id} className="flex items-center gap-3">
                                                    <span className="text-lg font-bold text-muted-foreground w-6">{index + 1}</span>
                                                    <Avatar className="w-8 h-8"><AvatarFallback className="bg-primary/10 text-primary text-xs">{getInitials(item.user_name)}</AvatarFallback></Avatar>
                                                    <span className="flex-grow truncate">{item.user_name}</span>
                                                    <span className="text-sm text-muted-foreground">{item.count} msgs</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : <p className="text-muted-foreground text-center py-4">No data yet</p>}
                                </CardContent>
                            </Card>
                        </div>

                        {analytics && (
                            <Card className="card-organic">
                                <CardHeader><CardTitle className="text-lg">Platform Summary</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                        <div><p className="text-3xl font-bold text-primary">{analytics.total_lessons}</p><p className="text-sm text-muted-foreground">Total Lessons</p></div>
                                        <div><p className="text-3xl font-bold text-primary">{analytics.total_comments}</p><p className="text-sm text-muted-foreground">Discussion Posts</p></div>
                                        <div><p className="text-3xl font-bold text-primary">{analytics.total_chat_messages}</p><p className="text-sm text-muted-foreground">Chat Messages</p></div>
                                        <div><p className="text-3xl font-bold text-primary">{analytics.attendance_records}</p><p className="text-sm text-muted-foreground">Attendance Records</p></div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    <TabsContent value="group" className="space-y-4">
                        {/* Create Group */}
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold">All Groups ({allGroups.length})</h3>
                            <Button onClick={() => setShowCreateGroup(true)} size="sm" data-testid="create-group-btn">
                                <Plus className="w-4 h-4 mr-1.5" /> New Group
                            </Button>
                        </div>

                        {showCreateGroup && (
                            <Card className="card-organic border-dashed border-2 border-primary/30 animate-fade-in">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={newGroupName}
                                            onChange={(e) => setNewGroupName(e.target.value)}
                                            placeholder="Group name (e.g. Sunday Study)"
                                            className="flex-1 px-3 py-2 border rounded-lg bg-background text-foreground text-sm"
                                            autoFocus
                                            data-testid="new-group-name-input"
                                            onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()}
                                        />
                                        <Button size="sm" onClick={handleCreateGroup} disabled={creatingGroup} data-testid="confirm-create-group">
                                            {creatingGroup ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={() => { setShowCreateGroup(false); setNewGroupName(''); }}>
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Groups List */}
                        {allGroups.map(g => {
                            const isExpanded = expandedGroupId === g.id;
                            const isMyGroup = group && group.id === g.id;
                            const members = groupMembers[g.id] || [];

                            return (
                                <Card key={g.id} className={cn("card-organic transition-all", isMyGroup && "ring-2 ring-primary/30")} data-testid={`group-card-${g.id}`}>
                                    <CardContent className="p-4 space-y-3">
                                        {/* Group header */}
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                                <Users className="w-5 h-5 text-primary" />
                                            </div>
                                            <div className="flex-grow min-w-0">
                                                {editingGroupId === g.id ? (
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            value={editingName}
                                                            onChange={(e) => setEditingName(e.target.value)}
                                                            className="flex-1 px-2 py-1 border rounded bg-background text-foreground text-sm"
                                                            autoFocus
                                                            onKeyDown={(e) => e.key === 'Enter' && handleUpdateGroupName(g.id, editingName)}
                                                            data-testid={`edit-group-name-${g.id}`}
                                                        />
                                                        <Button size="sm" variant="ghost" onClick={() => handleUpdateGroupName(g.id, editingName)}>
                                                            <CheckCircle className="w-4 h-4 text-green-600" />
                                                        </Button>
                                                        <Button size="sm" variant="ghost" onClick={() => setEditingGroupId(null)}>
                                                            <X className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-medium truncate">{g.name}</h4>
                                                        {isMyGroup && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium shrink-0">Your Group</span>}
                                                    </div>
                                                )}
                                                <p className="text-xs text-muted-foreground">{g.member_count} member{g.member_count !== 1 ? 's' : ''}</p>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8"
                                                    onClick={() => { setEditingGroupId(g.id); setEditingName(g.name); }}
                                                    data-testid={`edit-group-${g.id}`}
                                                >
                                                    <Edit3 className="w-3.5 h-3.5" />
                                                </Button>
                                                {!isMyGroup && (
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                                        onClick={() => setDeletingGroupId(g.id)}
                                                        data-testid={`delete-group-${g.id}`}
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                )}
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8"
                                                    onClick={() => toggleGroupMembers(g.id)}
                                                    data-testid={`toggle-members-${g.id}`}
                                                >
                                                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Invite code row */}
                                        <div className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2">
                                            <span className="text-xs text-muted-foreground shrink-0">Code:</span>
                                            <code className="font-mono font-bold text-sm tracking-widest" data-testid={`code-${g.id}`}>{g.invite_code}</code>
                                            <div className="ml-auto flex gap-1">
                                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { navigator.clipboard.writeText(g.invite_code); toast.success('Copied!'); }} data-testid={`copy-code-${g.id}`}>
                                                    <Copy className="w-3.5 h-3.5" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={async () => {
                                                    try { const res = await groupsAPI.regenerateCode(g.id); fetchData(); toast.success('New code generated'); } catch { toast.error('Failed'); }
                                                }} data-testid={`regen-code-${g.id}`}>
                                                    <RefreshCw className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Expanded members list */}
                                        {isExpanded && (
                                            <div className="border-t pt-3 space-y-2 animate-fade-in">
                                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Members</p>
                                                {members.length === 0 ? (
                                                    <p className="text-sm text-muted-foreground py-2">No members yet</p>
                                                ) : (
                                                    members.map(m => (
                                                        <div key={m.id} className="flex items-center gap-2 py-1.5">
                                                            <Avatar className="w-7 h-7"><AvatarFallback className="text-[10px] bg-primary/10 text-primary">{getInitials(m.name)}</AvatarFallback></Avatar>
                                                            <div className="flex-grow min-w-0">
                                                                <p className="text-sm truncate">{m.name}</p>
                                                            </div>
                                                            <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                                                                m.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                                                                m.role === 'teacher' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                                'bg-muted text-muted-foreground'
                                                            )}>{m.role}</span>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}

                        {allGroups.length === 0 && !loading && (
                            <Card className="card-organic">
                                <CardContent className="p-8 text-center">
                                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                    <h3 className="text-lg font-medium mb-2">No Groups Yet</h3>
                                    <p className="text-muted-foreground text-sm mb-4">Create your first group to get started.</p>
                                    <Button onClick={() => setShowCreateGroup(true)} data-testid="create-first-group-btn">
                                        <Plus className="w-4 h-4 mr-2" /> Create Group
                                    </Button>
                                </CardContent>
                            </Card>
                        )}

                        {/* Delete Group Dialog */}
                        <AlertDialog open={!!deletingGroupId} onOpenChange={() => setDeletingGroupId(null)}>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Group</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will delete the group and unassign all its members. Members will need to be reassigned to another group. This action cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteGroup(deletingGroupId)} className="bg-destructive text-destructive-foreground" data-testid="confirm-delete-group">
                                        Delete Group
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </TabsContent>
                </Tabs>

                <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete User?</AlertDialogTitle>
                            <AlertDialogDescription>This will permanently remove this user. This action cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                <AlertDialog open={showCleanupDialog} onOpenChange={setShowCleanupDialog}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-red-500" />
                                Delete All Members?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                This will permanently delete ALL member accounts and their associated data (enrollments, attendance, comments, messages, etc.). Teachers and admins will not be affected. This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleCleanupTestData} className="bg-red-600 hover:bg-red-700">
                                Delete All Members
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </Layout>
    );
};

export default Admin;

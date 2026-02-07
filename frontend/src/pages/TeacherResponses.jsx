import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { teacherPromptsAPI } from '../lib/api';
import { formatRelativeTime, getInitials, cn } from '../lib/utils';
import { toast } from 'sonner';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { 
    ArrowLeft, MessageSquare, Pin, CheckCircle, Clock, 
    AlertCircle, Trash2, ChevronDown, ChevronUp,
    Users, BarChart3
} from 'lucide-react';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';

const STATUS_OPTIONS = [
    { key: 'pending', label: 'Pending', color: 'bg-gray-100 text-gray-700', Icon: Clock },
    { key: 'answered', label: 'Answered', color: 'bg-green-100 text-green-700', Icon: CheckCircle },
    { key: 'needs_followup', label: 'Needs Follow-up', color: 'bg-amber-100 text-amber-700', Icon: AlertCircle }
];

const getStatusStyle = (status) => {
    const found = STATUS_OPTIONS.find(s => s.key === status);
    return found ? found.color : 'bg-gray-100 text-gray-700';
};

const getStatusLabel = (status) => {
    const found = STATUS_OPTIONS.find(s => s.key === status);
    return found ? found.label : 'Pending';
};

const StatusDropdownItems = ({ onSelect }) => (
    <>
        <DropdownMenuItem onClick={() => onSelect('pending')}>
            <Clock className="w-4 h-4 mr-2" />
            Pending
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSelect('answered')}>
            <CheckCircle className="w-4 h-4 mr-2" />
            Answered
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSelect('needs_followup')}>
            <AlertCircle className="w-4 h-4 mr-2" />
            Needs Follow-up
        </DropdownMenuItem>
    </>
);

export const TeacherResponses = () => {
    const { lessonId } = useParams();
    const navigate = useNavigate();
    const { isTeacherOrAdmin } = useAuth();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [expandedPrompts, setExpandedPrompts] = useState({});
    const [deleteReplyId, setDeleteReplyId] = useState(null);

    useEffect(() => {
        if (!isTeacherOrAdmin) {
            navigate('/');
            return;
        }
        fetchData();
    }, [lessonId, isTeacherOrAdmin]);

    const fetchData = async () => {
        try {
            const res = await teacherPromptsAPI.getAllReplies(lessonId);
            setData(res.data);
            // Expand all prompts by default
            const expanded = {};
            res.data.prompts_with_replies.forEach(p => {
                expanded[p.prompt.id] = true;
            });
            setExpandedPrompts(expanded);
        } catch (error) {
            toast.error('Failed to load responses');
            navigate('/courses');
        } finally {
            setLoading(false);
        }
    };

    const handlePinReply = async (replyId, pinned, promptId) => {
        try {
            await teacherPromptsAPI.pinReply(replyId, pinned);
            setData(prev => ({
                ...prev,
                prompts_with_replies: prev.prompts_with_replies.map(p => {
                    if (p.prompt.id === promptId) {
                        return {
                            ...p,
                            replies: p.replies.map(r => 
                                r.id === replyId ? { ...r, is_pinned: pinned } : r
                            ),
                            stats: {
                                ...p.stats,
                                pinned: pinned ? p.stats.pinned + 1 : p.stats.pinned - 1
                            }
                        };
                    }
                    return p;
                })
            }));
            toast.success(pinned ? 'Reply pinned' : 'Reply unpinned');
        } catch (error) {
            toast.error('Failed to update reply');
        }
    };

    const handleStatusChange = async (replyId, status, promptId, oldStatus) => {
        try {
            await teacherPromptsAPI.updateReplyStatus(replyId, status);
            setData(prev => ({
                ...prev,
                prompts_with_replies: prev.prompts_with_replies.map(p => {
                    if (p.prompt.id === promptId) {
                        const newStats = { ...p.stats };
                        newStats[oldStatus]--;
                        newStats[status]++;
                        return {
                            ...p,
                            replies: p.replies.map(r => 
                                r.id === replyId ? { ...r, status } : r
                            ),
                            stats: newStats
                        };
                    }
                    return p;
                })
            }));
            toast.success('Status updated');
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    const handleDeleteReply = async () => {
        if (!deleteReplyId) return;
        
        try {
            await teacherPromptsAPI.deleteReply(deleteReplyId.replyId);
            setData(prev => ({
                ...prev,
                prompts_with_replies: prev.prompts_with_replies.map(p => {
                    if (p.prompt.id === deleteReplyId.promptId) {
                        const deletedReply = p.replies.find(r => r.id === deleteReplyId.replyId);
                        const newStats = { ...p.stats };
                        newStats.total--;
                        newStats[deletedReply.status]--;
                        if (deletedReply.is_pinned) newStats.pinned--;
                        return {
                            ...p,
                            replies: p.replies.filter(r => r.id !== deleteReplyId.replyId),
                            stats: newStats
                        };
                    }
                    return p;
                }),
                total_replies: prev.total_replies - 1
            }));
            toast.success('Reply deleted');
        } catch (error) {
            toast.error('Failed to delete reply');
        }
        setDeleteReplyId(null);
    };

    const togglePrompt = (promptId) => {
        setExpandedPrompts(prev => ({
            ...prev,
            [promptId]: !prev[promptId]
        }));
    };

    if (loading) {
        return (
            <Layout>
                <div className="page-container py-6 space-y-6">
                    <LoadingSkeleton className="h-8 w-24" />
                    <LoadingSkeleton className="h-12 w-64" />
                    <LoadingSkeleton className="h-40 rounded-xl" />
                </div>
            </Layout>
        );
    }

    if (!data) return null;

    return (
        <Layout>
            <div className="page-container py-4 md:py-6 space-y-6">
                {/* Header */}
                <div className="animate-fade-in">
                    <Link to={`/lessons/${lessonId}`}>
                        <Button variant="ghost" className="gap-2 -ml-2 mb-2" data-testid="back-to-lesson-btn">
                            <ArrowLeft className="w-4 h-4" />
                            Back to Lesson
                        </Button>
                    </Link>
                    <h1 className="text-2xl md:text-3xl font-serif font-bold mb-1">
                        Student Responses
                    </h1>
                    <p className="text-muted-foreground">{data.lesson.title}</p>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-fade-in" style={{ animationDelay: '0.05s' }}>
                    <Card className="card-organic">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                <Users className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{data.total_replies}</p>
                                <p className="text-xs text-muted-foreground">Total Responses</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="card-organic">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                <Clock className="w-5 h-5 text-gray-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">
                                    {data.prompts_with_replies.reduce((acc, p) => acc + p.stats.pending, 0)}
                                </p>
                                <p className="text-xs text-muted-foreground">Pending</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="card-organic">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">
                                    {data.prompts_with_replies.reduce((acc, p) => acc + p.stats.answered, 0)}
                                </p>
                                <p className="text-xs text-muted-foreground">Answered</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="card-organic">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                                <AlertCircle className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">
                                    {data.prompts_with_replies.reduce((acc, p) => acc + p.stats.needs_followup, 0)}
                                </p>
                                <p className="text-xs text-muted-foreground">Follow-up</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Prompts with Replies */}
                <div className="space-y-4">
                    {data.prompts_with_replies.length > 0 ? (
                        data.prompts_with_replies.map((item, index) => (
                            <Card 
                                key={item.prompt.id} 
                                className="card-organic animate-fade-in"
                                style={{ animationDelay: `${0.1 + index * 0.05}s` }}
                            >
                                {/* Prompt Header */}
                                <div 
                                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
                                    onClick={() => togglePrompt(item.prompt.id)}
                                    data-testid={`prompt-header-${index}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                            <MessageSquare className="w-5 h-5 text-primary" />
                                        </div>
                                        <div>
                                            <p className="font-medium">Prompt {index + 1}</p>
                                            <p className="text-sm text-muted-foreground line-clamp-1">
                                                {item.prompt.question}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex gap-1">
                                            <Badge variant="outline" className="text-xs">
                                                {item.stats.total} responses
                                            </Badge>
                                            {item.stats.pinned > 0 && (
                                                <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                                                    {item.stats.pinned} pinned
                                                </Badge>
                                            )}
                                        </div>
                                        {expandedPrompts[item.prompt.id] ? (
                                            <ChevronUp className="w-5 h-5 text-muted-foreground" />
                                        ) : (
                                            <ChevronDown className="w-5 h-5 text-muted-foreground" />
                                        )}
                                    </div>
                                </div>

                                {/* Expanded Replies */}
                                {expandedPrompts[item.prompt.id] && (
                                    <div className="border-t">
                                        {/* Prompt Question */}
                                        <div className="p-4 bg-primary/5 border-b">
                                            <p className="font-medium text-primary">{item.prompt.question}</p>
                                        </div>

                                        {/* Replies List */}
                                        {item.replies.length > 0 ? (
                                            <div className="divide-y">
                                                {item.replies.map((reply) => {
                                                    const StatusIcon = STATUS_CONFIG[reply.status]?.icon || Clock;
                                                    return (
                                                        <div 
                                                            key={reply.id}
                                                            className={cn(
                                                                "p-4 transition-colors",
                                                                reply.is_pinned && "bg-amber-50/50 dark:bg-amber-900/10"
                                                            )}
                                                            data-testid={`reply-${reply.id}`}
                                                        >
                                                            <div className="flex items-start gap-3">
                                                                <Avatar className="w-10 h-10 flex-shrink-0">
                                                                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                                                        {getInitials(reply.user_name)}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <div className="flex-grow min-w-0">
                                                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                                                        <span className="font-semibold">{reply.user_name}</span>
                                                                        <span className="text-xs text-muted-foreground">
                                                                            {formatRelativeTime(reply.created_at)}
                                                                        </span>
                                                                        {reply.is_pinned && (
                                                                            <Badge variant="outline" className="text-xs text-amber-600 border-amber-400">
                                                                                <Pin className="w-3 h-3 mr-1" /> Pinned
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-sm mb-3">{reply.content}</p>
                                                                    
                                                                    {/* Actions */}
                                                                    <div className="flex items-center gap-2">
                                                                        {/* Status Dropdown */}
                                                                        <DropdownMenu>
                                                                            <DropdownMenuTrigger asChild>
                                                                                <Button 
                                                                                    variant="outline" 
                                                                                    size="sm"
                                                                                    className={cn(
                                                                                        "text-xs h-7",
                                                                                        STATUS_CONFIG[reply.status]?.color
                                                                                    )}
                                                                                    data-testid={`status-btn-${reply.id}`}
                                                                                >
                                                                                    <StatusIcon className="w-3 h-3 mr-1" />
                                                                                    {STATUS_CONFIG[reply.status]?.label}
                                                                                </Button>
                                                                            </DropdownMenuTrigger>
                                                                            <DropdownMenuContent align="start">
                                                                                {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                                                                                    const ConfigIcon = config.icon;
                                                                                    return (
                                                                                        <DropdownMenuItem
                                                                                            key={key}
                                                                                            onClick={() => handleStatusChange(reply.id, key, item.prompt.id, reply.status)}
                                                                                            data-testid={`status-option-${key}`}
                                                                                        >
                                                                                            <ConfigIcon className="w-4 h-4 mr-2" />
                                                                                            {config.label}
                                                                                        </DropdownMenuItem>
                                                                                    );
                                                                                })}
                                                                            </DropdownMenuContent>
                                                                        </DropdownMenu>

                                                                        {/* Pin Button */}
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className={cn(
                                                                                "h-7 text-xs",
                                                                                reply.is_pinned && "text-amber-600"
                                                                            )}
                                                                            onClick={() => handlePinReply(reply.id, !reply.is_pinned, item.prompt.id)}
                                                                            data-testid={`pin-btn-${reply.id}`}
                                                                        >
                                                                            <Pin className="w-3 h-3 mr-1" />
                                                                            {reply.is_pinned ? 'Unpin' : 'Pin'}
                                                                        </Button>

                                                                        {/* Delete Button */}
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="h-7 text-xs text-destructive"
                                                                            onClick={() => setDeleteReplyId({ replyId: reply.id, promptId: item.prompt.id })}
                                                                            data-testid={`delete-btn-${reply.id}`}
                                                                        >
                                                                            <Trash2 className="w-3 h-3 mr-1" />
                                                                            Delete
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="p-8 text-center text-muted-foreground">
                                                <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                                <p>No responses yet for this prompt</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </Card>
                        ))
                    ) : (
                        <Card className="card-organic p-8 text-center">
                            <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                            <h3 className="text-lg font-semibold mb-2">No prompts yet</h3>
                            <p className="text-muted-foreground mb-4">
                                Add discussion prompts to collect student responses
                            </p>
                            <Link to={`/lessons/${lessonId}/edit`}>
                                <Button className="btn-primary">Edit Lesson</Button>
                            </Link>
                        </Card>
                    )}
                </div>

                {/* Delete Confirmation */}
                <AlertDialog open={!!deleteReplyId} onOpenChange={() => setDeleteReplyId(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete Response?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will permanently delete this student's response. This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteReply} className="bg-destructive text-destructive-foreground">
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </Layout>
    );
};

export default TeacherResponses;

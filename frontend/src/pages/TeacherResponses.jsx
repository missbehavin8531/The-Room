import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { teacherPromptsAPI } from '../lib/api';
import { formatRelativeTime, getInitials, cn } from '../lib/utils';
import { toast } from 'sonner';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { 
    ArrowLeft, MessageSquare, CheckCircle, Clock, AlertCircle, 
    Users, Pin, Trash2, ChevronDown, ChevronUp
} from 'lucide-react';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../components/ui/select';

export const TeacherResponses = () => {
    const { lessonId } = useParams();
    const navigate = useNavigate();
    const { isTeacherOrAdmin } = useAuth();
    const [loading, setLoading] = useState(true);
    const [lesson, setLesson] = useState(null);
    const [prompts, setPrompts] = useState([]);
    const [replies, setReplies] = useState([]);
    const [selectedPromptId, setSelectedPromptId] = useState(null);
    const [deleteReplyId, setDeleteReplyId] = useState(null);
    const [stats, setStats] = useState({ total: 0, pending: 0, answered: 0, needs_followup: 0 });

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
            const data = res.data;
            setLesson(data.lesson);
            
            // Flatten prompts and replies
            const allPrompts = [];
            const allReplies = [];
            let totalStats = { total: 0, pending: 0, answered: 0, needs_followup: 0 };
            
            for (let i = 0; i < data.prompts_with_replies.length; i++) {
                const pwr = data.prompts_with_replies[i];
                allPrompts.push(pwr.prompt);
                
                for (let j = 0; j < pwr.replies.length; j++) {
                    allReplies.push({ ...pwr.replies[j], promptId: pwr.prompt.id });
                }
                
                totalStats.total += pwr.stats.total;
                totalStats.pending += pwr.stats.pending;
                totalStats.answered += pwr.stats.answered;
                totalStats.needs_followup += pwr.stats.needs_followup;
            }
            
            setPrompts(allPrompts);
            setReplies(allReplies);
            setStats(totalStats);
            
            if (allPrompts.length > 0) {
                setSelectedPromptId(allPrompts[0].id);
            }
        } catch (error) {
            toast.error('Failed to load responses');
            navigate('/courses');
        } finally {
            setLoading(false);
        }
    };

    const handlePinReply = async (replyId, isPinned) => {
        try {
            await teacherPromptsAPI.pinReply(replyId, !isPinned);
            setReplies(prev => prev.map(r => r.id === replyId ? { ...r, is_pinned: !isPinned } : r));
            toast.success(!isPinned ? 'Pinned' : 'Unpinned');
        } catch (error) {
            toast.error('Failed');
        }
    };

    const handleStatusChange = async (replyId, newStatus, oldStatus) => {
        try {
            await teacherPromptsAPI.updateReplyStatus(replyId, newStatus);
            setReplies(prev => prev.map(r => r.id === replyId ? { ...r, status: newStatus } : r));
            
            // Update stats
            setStats(prev => {
                const updated = { ...prev };
                updated[oldStatus || 'pending']--;
                updated[newStatus]++;
                return updated;
            });
            toast.success('Updated');
        } catch (error) {
            toast.error('Failed');
        }
    };

    const handleDeleteReply = async () => {
        if (!deleteReplyId) return;
        try {
            const reply = replies.find(r => r.id === deleteReplyId);
            await teacherPromptsAPI.deleteReply(deleteReplyId);
            setReplies(prev => prev.filter(r => r.id !== deleteReplyId));
            
            setStats(prev => ({
                ...prev,
                total: prev.total - 1,
                [reply?.status || 'pending']: prev[reply?.status || 'pending'] - 1
            }));
            toast.success('Deleted');
        } catch (error) {
            toast.error('Failed');
        }
        setDeleteReplyId(null);
    };

    const selectedPrompt = prompts.find(p => p.id === selectedPromptId);
    const filteredReplies = replies.filter(r => r.promptId === selectedPromptId);

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

    if (!lesson) return null;

    return (
        <Layout>
            <div className="page-container py-4 md:py-6 space-y-6">
                <div className="animate-fade-in">
                    <Link to={`/lessons/${lessonId}`}>
                        <Button variant="ghost" className="gap-2 -ml-2 mb-2" data-testid="back-to-lesson-btn">
                            <ArrowLeft className="w-4 h-4" /> Back to Lesson
                        </Button>
                    </Link>
                    <h1 className="text-2xl md:text-3xl font-serif font-bold mb-1">Student Responses</h1>
                    <p className="text-muted-foreground">{lesson.title}</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-fade-in">
                    <Card className="card-organic">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                <Users className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.total}</p>
                                <p className="text-xs text-muted-foreground">Total</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="card-organic">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                <Clock className="w-5 h-5 text-gray-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.pending}</p>
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
                                <p className="text-2xl font-bold">{stats.answered}</p>
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
                                <p className="text-2xl font-bold">{stats.needs_followup}</p>
                                <p className="text-xs text-muted-foreground">Follow-up</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Prompt Selector */}
                {prompts.length > 0 && (
                    <Card className="card-organic">
                        <CardContent className="p-4">
                            <label className="text-sm font-medium mb-2 block">Select Prompt</label>
                            <Select value={selectedPromptId} onValueChange={setSelectedPromptId}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select a prompt" />
                                </SelectTrigger>
                                <SelectContent>
                                    {prompts.map((p, i) => (
                                        <SelectItem key={p.id} value={p.id}>
                                            Prompt {i + 1}: {p.question.substring(0, 50)}...
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            
                            {selectedPrompt && (
                                <div className="mt-4 p-4 bg-primary/5 rounded-lg">
                                    <p className="font-medium text-primary">{selectedPrompt.question}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Replies List */}
                <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                        <MessageSquare className="w-5 h-5" />
                        Responses ({filteredReplies.length})
                    </h3>
                    
                    {filteredReplies.length > 0 ? (
                        filteredReplies.map(reply => (
                            <Card key={reply.id} className={cn("card-organic", reply.is_pinned && "ring-2 ring-amber-400")}>
                                <CardContent className="p-4">
                                    <div className="flex items-start gap-3">
                                        <Avatar className="w-10 h-10">
                                            <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                                {getInitials(reply.user_name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-grow">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <span className="font-semibold">{reply.user_name}</span>
                                                <span className="text-xs text-muted-foreground">{formatRelativeTime(reply.created_at)}</span>
                                                {reply.is_pinned && (
                                                    <Badge variant="outline" className="text-xs text-amber-600">
                                                        <Pin className="w-3 h-3 mr-1" /> Pinned
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-sm mb-3">{reply.content}</p>
                                            
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <Select 
                                                    value={reply.status || 'pending'} 
                                                    onValueChange={(v) => handleStatusChange(reply.id, v, reply.status)}
                                                >
                                                    <SelectTrigger className="w-36 h-8 text-xs">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="pending">Pending</SelectItem>
                                                        <SelectItem value="answered">Answered</SelectItem>
                                                        <SelectItem value="needs_followup">Follow-up</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className={cn("h-8 text-xs", reply.is_pinned && "text-amber-600")}
                                                    onClick={() => handlePinReply(reply.id, reply.is_pinned)}
                                                >
                                                    <Pin className="w-3 h-3 mr-1" />
                                                    {reply.is_pinned ? 'Unpin' : 'Pin'}
                                                </Button>
                                                
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 text-xs text-destructive"
                                                    onClick={() => setDeleteReplyId(reply.id)}
                                                >
                                                    <Trash2 className="w-3 h-3 mr-1" /> Delete
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <Card className="card-organic p-8 text-center">
                            <MessageSquare className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
                            <p className="text-muted-foreground">No responses for this prompt yet</p>
                        </Card>
                    )}
                </div>

                {prompts.length === 0 && (
                    <Card className="card-organic p-8 text-center">
                        <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                        <h3 className="text-lg font-semibold mb-2">No prompts yet</h3>
                        <p className="text-muted-foreground mb-4">Add prompts to collect responses</p>
                        <Link to={`/lessons/${lessonId}/edit`}>
                            <Button className="btn-primary">Edit Lesson</Button>
                        </Link>
                    </Card>
                )}

                <AlertDialog open={!!deleteReplyId} onOpenChange={() => setDeleteReplyId(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete Response?</AlertDialogTitle>
                            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteReply} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </Layout>
    );
};

export default TeacherResponses;

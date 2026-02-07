import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { PromptCard } from '../components/PromptCard';
import { teacherPromptsAPI } from '../lib/api';
import { toast } from 'sonner';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { 
    ArrowLeft, MessageSquare, CheckCircle, Clock, AlertCircle, Users
} from 'lucide-react';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog';

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

    const handlePinReply = async (reply, promptId) => {
        try {
            await teacherPromptsAPI.pinReply(reply.id, !reply.is_pinned);
            setData(prev => ({
                ...prev,
                prompts_with_replies: prev.prompts_with_replies.map(p => {
                    if (p.prompt.id === promptId) {
                        return {
                            ...p,
                            replies: p.replies.map(r => 
                                r.id === reply.id ? { ...r, is_pinned: !reply.is_pinned } : r
                            ),
                            stats: {
                                ...p.stats,
                                pinned: reply.is_pinned ? p.stats.pinned - 1 : p.stats.pinned + 1
                            }
                        };
                    }
                    return p;
                })
            }));
            toast.success(!reply.is_pinned ? 'Reply pinned' : 'Reply unpinned');
        } catch (error) {
            toast.error('Failed to update reply');
        }
    };

    const handleStatusChange = async (reply, status, promptId) => {
        try {
            await teacherPromptsAPI.updateReplyStatus(reply.id, status);
            setData(prev => ({
                ...prev,
                prompts_with_replies: prev.prompts_with_replies.map(p => {
                    if (p.prompt.id === promptId) {
                        const newStats = { ...p.stats };
                        newStats[reply.status]--;
                        newStats[status]++;
                        return {
                            ...p,
                            replies: p.replies.map(r => 
                                r.id === reply.id ? { ...r, status } : r
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
        setExpandedPrompts(prev => ({ ...prev, [promptId]: !prev[promptId] }));
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

    // Extract data to simpler variables to avoid babel plugin issues
    const lesson = data.lesson;
    const prompts = data.prompts_with_replies || [];
    const totalReplies = data.total_replies || 0;
    
    const totalPending = prompts.reduce((acc, p) => acc + p.stats.pending, 0);
    const totalAnswered = prompts.reduce((acc, p) => acc + p.stats.answered, 0);
    const totalFollowup = prompts.reduce((acc, p) => acc + p.stats.needs_followup, 0);

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
                    <p className="text-muted-foreground">{lesson.title}</p>
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
                                <p className="text-2xl font-bold">{totalPending}</p>
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
                                <p className="text-2xl font-bold">{totalAnswered}</p>
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
                                <p className="text-2xl font-bold">{totalFollowup}</p>
                                <p className="text-xs text-muted-foreground">Follow-up</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Prompts with Replies */}
                <div className="space-y-4">
                    {data.prompts_with_replies.length > 0 ? (
                        data.prompts_with_replies.map((item, index) => (
                            <PromptCard
                                key={item.prompt.id}
                                item={item}
                                index={index}
                                isExpanded={expandedPrompts[item.prompt.id]}
                                onToggle={() => togglePrompt(item.prompt.id)}
                                onStatusChange={(reply, status) => handleStatusChange(reply, status, item.prompt.id)}
                                onPinToggle={(reply) => handlePinReply(reply, item.prompt.id)}
                                onDelete={(reply) => setDeleteReplyId({ replyId: reply.id, promptId: item.prompt.id })}
                            />
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
                                This will permanently delete this student's response.
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

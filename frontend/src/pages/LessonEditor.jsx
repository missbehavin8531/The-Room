import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import { lessonsAPI, teacherPromptsAPI } from '../lib/api';
import { toast } from 'sonner';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { cn } from '../lib/utils';
import { 
    ArrowLeft, Save, Plus, Trash2, GripVertical, 
    MessageSquare, BookOpen, Calendar, Video, 
    Loader2, AlertCircle, MonitorPlay, ExternalLink,
    Play, Check, X, Eye, EyeOff
} from 'lucide-react';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog';

export const LessonEditor = () => {
    const { lessonId } = useParams();
    const navigate = useNavigate();
    const { isTeacherOrAdmin } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Lesson state
    const [lesson, setLesson] = useState({
        title: '',
        description: '',
        zoom_link: '',
        lesson_date: '',
        teacher_notes: '',
        reading_plan: '',
        hosting_method: 'in_app',
        recording_source: 'none',
        recording_url: '',
        is_published: false,
        order: 0
    });
    
    // Prompts state
    const [prompts, setPrompts] = useState([]);
    const [newPrompt, setNewPrompt] = useState('');
    const [addingPrompt, setAddingPrompt] = useState(false);
    const [deletePromptId, setDeletePromptId] = useState(null);

    useEffect(() => {
        if (!isTeacherOrAdmin) {
            navigate('/');
            return;
        }
        fetchLessonData();
    }, [lessonId, isTeacherOrAdmin]);

    const fetchLessonData = async () => {
        try {
            const lessonRes = await lessonsAPI.getOne(lessonId);
            const lessonData = lessonRes.data;
            setLesson({
                title: lessonData.title || '',
                description: lessonData.description || '',
                zoom_link: lessonData.zoom_link || '',
                lesson_date: lessonData.lesson_date || '',
                teacher_notes: lessonData.teacher_notes || '',
                reading_plan: lessonData.reading_plan || '',
                hosting_method: lessonData.hosting_method || 'in_app',
                recording_source: lessonData.recording_source || 'none',
                recording_url: lessonData.recording_url || lessonData.youtube_url || '',
                is_published: lessonData.is_published || false,
                order: lessonData.order || 0
            });
            setPrompts(lessonData.prompts || []);
        } catch (error) {
            toast.error('Failed to load lesson');
            navigate('/courses');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveLesson = async () => {
        if (!lesson.title || !lesson.description) {
            toast.error('Title and description are required');
            return;
        }

        setSaving(true);
        try {
            await lessonsAPI.update(lessonId, lesson);
            toast.success('Lesson saved!');
        } catch (error) {
            toast.error('Failed to save lesson');
        } finally {
            setSaving(false);
        }
    };

    const handleAddPrompt = async () => {
        if (!newPrompt.trim()) {
            toast.error('Please enter a prompt question');
            return;
        }

        if (prompts.length >= 3) {
            toast.error('Maximum 3 prompts per lesson');
            return;
        }

        setAddingPrompt(true);
        try {
            const res = await teacherPromptsAPI.create(lessonId, newPrompt.trim(), prompts.length);
            setPrompts([...prompts, res.data]);
            setNewPrompt('');
            toast.success('Prompt added!');
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to add prompt');
        } finally {
            setAddingPrompt(false);
        }
    };

    const handleUpdatePrompt = async (promptId, question) => {
        const prompt = prompts.find(p => p.id === promptId);
        if (!prompt) return;

        try {
            await teacherPromptsAPI.update(promptId, question, prompt.order);
            setPrompts(prompts.map(p => 
                p.id === promptId ? { ...p, question } : p
            ));
            toast.success('Prompt updated');
        } catch (error) {
            toast.error('Failed to update prompt');
        }
    };

    const handleDeletePrompt = async () => {
        if (!deletePromptId) return;

        try {
            await teacherPromptsAPI.delete(deletePromptId);
            setPrompts(prompts.filter(p => p.id !== deletePromptId));
            toast.success('Prompt deleted');
        } catch (error) {
            toast.error('Failed to delete prompt');
        }
        setDeletePromptId(null);
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

    return (
        <Layout>
            <div className="page-container py-4 md:py-6 space-y-6 max-w-3xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between animate-fade-in">
                    <Link to={`/lessons/${lessonId}`}>
                        <Button variant="ghost" className="gap-2 -ml-2" data-testid="back-to-lesson-btn">
                            <ArrowLeft className="w-4 h-4" />
                            Back to Lesson
                        </Button>
                    </Link>
                    <Button 
                        onClick={handleSaveLesson} 
                        disabled={saving} 
                        className="btn-primary"
                        data-testid="save-lesson-btn"
                    >
                        {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                            <Save className="w-4 h-4 mr-2" />
                        )}
                        Save Changes
                    </Button>
                </div>

                <h1 className="text-2xl md:text-3xl font-serif font-bold animate-fade-in">
                    Edit Lesson
                </h1>

                {/* Basic Info */}
                <Card className="card-organic animate-fade-in" style={{ animationDelay: '0.05s' }}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <BookOpen className="w-5 h-5" />
                            Basic Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Title *</Label>
                            <Input
                                value={lesson.title}
                                onChange={(e) => setLesson({ ...lesson, title: e.target.value })}
                                placeholder="Lesson title"
                                data-testid="lesson-title-input"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Description *</Label>
                            <Textarea
                                value={lesson.description}
                                onChange={(e) => setLesson({ ...lesson, description: e.target.value })}
                                placeholder="Brief description of the lesson"
                                rows={3}
                                data-testid="lesson-description-input"
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    Lesson Date
                                </Label>
                                <Input
                                    type="date"
                                    value={lesson.lesson_date}
                                    onChange={(e) => setLesson({ ...lesson, lesson_date: e.target.value })}
                                    data-testid="lesson-date-input"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Video className="w-4 h-4" />
                                    Zoom Link
                                </Label>
                                <Input
                                    value={lesson.zoom_link}
                                    onChange={(e) => setLesson({ ...lesson, zoom_link: e.target.value })}
                                    placeholder="https://zoom.us/j/..."
                                    data-testid="lesson-zoom-input"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Publishing Status */}
                <Card className="card-organic animate-fade-in" style={{ animationDelay: '0.075s' }}>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {lesson.is_published ? (
                                    <Eye className="w-5 h-5 text-green-600" />
                                ) : (
                                    <EyeOff className="w-5 h-5 text-muted-foreground" />
                                )}
                                <div>
                                    <p className="font-medium">
                                        {lesson.is_published ? 'Published' : 'Draft'}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {lesson.is_published 
                                            ? 'Students can see this lesson' 
                                            : 'Only you can see this lesson'}
                                    </p>
                                </div>
                            </div>
                            <Switch
                                checked={lesson.is_published}
                                onCheckedChange={(checked) => setLesson({ ...lesson, is_published: checked })}
                                data-testid="publish-toggle"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Hosting Method */}
                <Card className="card-organic animate-fade-in" style={{ animationDelay: '0.1s' }}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <MonitorPlay className="w-5 h-5" />
                            Live Session Hosting
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Choose how you'll host the live session. Students will only see this option.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setLesson({ ...lesson, hosting_method: 'in_app' })}
                                className={cn(
                                    "p-4 rounded-xl border-2 transition-all text-left flex items-start gap-3",
                                    lesson.hosting_method === 'in_app'
                                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                                        : "border-muted hover:border-primary/50"
                                )}
                                data-testid="hosting-in-app"
                            >
                                <div className={cn(
                                    "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                                    lesson.hosting_method === 'in_app' ? "bg-primary text-primary-foreground" : "bg-muted"
                                )}>
                                    <Video className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium">In-App Video Room</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Built-in video with recording, screen share & chat
                                    </p>
                                </div>
                                {lesson.hosting_method === 'in_app' && (
                                    <Check className="w-5 h-5 text-primary flex-shrink-0" />
                                )}
                            </button>
                            
                            <button
                                type="button"
                                onClick={() => setLesson({ ...lesson, hosting_method: 'zoom' })}
                                className={cn(
                                    "p-4 rounded-xl border-2 transition-all text-left flex items-start gap-3",
                                    lesson.hosting_method === 'zoom'
                                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                                        : "border-muted hover:border-primary/50"
                                )}
                                data-testid="hosting-zoom"
                            >
                                <div className={cn(
                                    "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                                    lesson.hosting_method === 'zoom' ? "bg-primary text-primary-foreground" : "bg-muted"
                                )}>
                                    <ExternalLink className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium">Zoom Meeting</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Use your existing Zoom account
                                    </p>
                                </div>
                                {lesson.hosting_method === 'zoom' && (
                                    <Check className="w-5 h-5 text-primary flex-shrink-0" />
                                )}
                            </button>
                        </div>
                        
                        {lesson.hosting_method === 'zoom' && (
                            <div className="space-y-2 animate-fade-in">
                                <Label>Zoom Meeting Link *</Label>
                                <Input
                                    value={lesson.zoom_link}
                                    onChange={(e) => setLesson({ ...lesson, zoom_link: e.target.value })}
                                    placeholder="https://zoom.us/j/..."
                                    data-testid="zoom-link-input"
                                />
                            </div>
                        )}
                        
                        {lesson.hosting_method === 'zoom' && !lesson.zoom_link && (
                            <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
                                <AlertCircle className="w-4 h-4" />
                                Add a Zoom link for students to join
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Recording Source */}
                <Card className="card-organic animate-fade-in" style={{ animationDelay: '0.125s' }}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Play className="w-5 h-5" />
                            Recording / Replay
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Where can students watch the replay after the live session?
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            {[
                                { value: 'daily', label: 'In-App Recording', icon: Video, color: 'purple' },
                                { value: 'upload', label: 'Upload Video', icon: Play, color: 'green' },
                                { value: 'youtube', label: 'YouTube', icon: Play, color: 'red' },
                                { value: 'external', label: 'External URL', icon: ExternalLink, color: 'blue' },
                                { value: 'none', label: 'None', icon: X, color: 'gray' },
                            ].map(option => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setLesson({ ...lesson, recording_source: option.value })}
                                    className={cn(
                                        "p-3 rounded-xl border-2 transition-all text-center",
                                        lesson.recording_source === option.value
                                            ? "border-primary bg-primary/5"
                                            : "border-muted hover:border-primary/50"
                                    )}
                                    data-testid={`recording-${option.value}`}
                                >
                                    <option.icon className={cn(
                                        "w-6 h-6 mx-auto mb-1",
                                        lesson.recording_source === option.value ? "text-primary" : "text-muted-foreground"
                                    )} />
                                    <p className="text-xs font-medium">{option.label}</p>
                                </button>
                            ))}
                        </div>
                        
                        {(lesson.recording_source === 'youtube' || lesson.recording_source === 'external') && (
                            <div className="space-y-2 animate-fade-in">
                                <Label>{lesson.recording_source === 'youtube' ? 'YouTube URL' : 'Video URL'} <span className="text-muted-foreground text-xs">(optional)</span></Label>
                                <Input
                                    value={lesson.recording_url}
                                    onChange={(e) => setLesson({ ...lesson, recording_url: e.target.value })}
                                    placeholder={lesson.recording_source === 'youtube' 
                                        ? "https://youtube.com/watch?v=..." 
                                        : "https://..."
                                    }
                                    data-testid="recording-url-input"
                                />
                            </div>
                        )}
                        
                        {lesson.recording_source === 'daily' && (
                            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-sm text-purple-700 dark:text-purple-300">
                                Recordings will be saved automatically when you use the in-app video room and click record.
                            </div>
                        )}

                        {lesson.recording_source === 'upload' && (
                            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-sm text-green-700 dark:text-green-300">
                                Upload a Zoom or other video recording from the lesson page's "Watch Replay" tab. Supports MP4, MOV, WebM up to 125MB.
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Teacher Notes */}
                <Card className="card-organic animate-fade-in" style={{ animationDelay: '0.15s' }}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <BookOpen className="w-5 h-5" />
                            Teacher Notes
                            <Badge variant="secondary" className="ml-2">Markdown</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                            value={lesson.teacher_notes}
                            onChange={(e) => setLesson({ ...lesson, teacher_notes: e.target.value })}
                            placeholder="**Key Points:**&#10;&#10;1. First point&#10;2. Second point&#10;&#10;*Scripture reference here*"
                            rows={8}
                            className="font-mono text-sm"
                            data-testid="teacher-notes-input"
                        />
                        <p className="text-xs text-muted-foreground mt-2">
                            Supports Markdown: **bold**, *italic*, - lists, etc.
                        </p>
                    </CardContent>
                </Card>

                {/* Reading Plan */}
                <Card className="card-organic animate-fade-in" style={{ animationDelay: '0.15s' }}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <BookOpen className="w-5 h-5" />
                            Reading Plan
                            <Badge variant="secondary" className="ml-2">Markdown</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                            value={lesson.reading_plan}
                            onChange={(e) => setLesson({ ...lesson, reading_plan: e.target.value })}
                            placeholder="**This Week's Reading:**&#10;&#10;- Monday: John 3:1-21&#10;- Tuesday: Romans 1:16-17&#10;- Wednesday: 1 Cor 15:1-11"
                            rows={6}
                            className="font-mono text-sm"
                            data-testid="reading-plan-input"
                        />
                    </CardContent>
                </Card>

                {/* Discussion Prompts */}
                <Card className="card-organic animate-fade-in" style={{ animationDelay: '0.2s' }}>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-lg">
                                <MessageSquare className="w-5 h-5" />
                                Discussion Prompts
                            </span>
                            <Badge variant="outline">{prompts.length}/3</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Existing Prompts */}
                        {prompts.length > 0 ? (
                            <div className="space-y-3">
                                {prompts.map((prompt, index) => (
                                    <div 
                                        key={prompt.id}
                                        className="flex gap-3 p-3 bg-muted rounded-lg group"
                                        data-testid={`prompt-item-${index}`}
                                    >
                                        <div className="flex items-center text-muted-foreground">
                                            <GripVertical className="w-4 h-4" />
                                        </div>
                                        <div className="flex-grow">
                                            <Input
                                                value={prompt.question}
                                                onChange={(e) => {
                                                    setPrompts(prompts.map(p =>
                                                        p.id === prompt.id ? { ...p, question: e.target.value } : p
                                                    ));
                                                }}
                                                onBlur={(e) => handleUpdatePrompt(prompt.id, e.target.value)}
                                                className="bg-background"
                                                data-testid={`prompt-input-${index}`}
                                            />
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setDeletePromptId(prompt.id)}
                                            className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                            data-testid={`delete-prompt-${index}`}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-6 text-muted-foreground">
                                <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                <p>No discussion prompts yet</p>
                                <p className="text-sm">Add prompts to encourage student engagement</p>
                            </div>
                        )}

                        {/* Add New Prompt */}
                        {prompts.length < 3 && (
                            <div className="flex gap-2 pt-2 border-t">
                                <Input
                                    value={newPrompt}
                                    onChange={(e) => setNewPrompt(e.target.value)}
                                    placeholder="Enter a new discussion prompt..."
                                    onKeyPress={(e) => e.key === 'Enter' && handleAddPrompt()}
                                    data-testid="new-prompt-input"
                                />
                                <Button
                                    onClick={handleAddPrompt}
                                    disabled={addingPrompt || !newPrompt.trim()}
                                    className="btn-secondary flex-shrink-0"
                                    data-testid="add-prompt-btn"
                                >
                                    {addingPrompt ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Plus className="w-4 h-4" />
                                    )}
                                </Button>
                            </div>
                        )}

                        {prompts.length >= 3 && (
                            <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
                                <AlertCircle className="w-4 h-4" />
                                Maximum 3 prompts per lesson reached
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Delete Prompt Dialog */}
                <AlertDialog open={!!deletePromptId} onOpenChange={() => setDeletePromptId(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete Prompt?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will also delete all student replies to this prompt. This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeletePrompt} className="bg-destructive text-destructive-foreground">
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </Layout>
    );
};

export default LessonEditor;

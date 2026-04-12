import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { lessonsAPI } from '../lib/api';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import {
    ArrowLeft, ArrowRight, Check, Video, ExternalLink, 
    Calendar, BookOpen, Loader2, FileText, Play, X
} from 'lucide-react';

const STEPS = [
    { id: 'basics', title: 'Basics', icon: FileText },
    { id: 'hosting', title: 'Hosting', icon: Video },
    { id: 'recording', title: 'Recording', icon: Play },
    { id: 'content', title: 'Content', icon: BookOpen },
    { id: 'review', title: 'Review', icon: Check },
];

export const LessonWizard = ({ courseId, courseName, onClose, onSuccess }) => {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(0);
    const [saving, setSaving] = useState(false);
    
    const [lesson, setLesson] = useState({
        title: '',
        description: '',
        lesson_date: '',
        hosting_method: 'in_app',
        zoom_link: '',
        recording_source: 'none',
        recording_url: '',
        teacher_notes: '',
        reading_plan: '',
        is_published: false,
    });
    
    const updateField = (field, value) => {
        setLesson(prev => ({ ...prev, [field]: value }));
    };
    
    const canProceed = () => {
        switch (STEPS[currentStep].id) {
            case 'basics':
                return lesson.title.trim() && lesson.description.trim();
            case 'hosting':
                if (lesson.hosting_method === 'zoom') {
                    return lesson.zoom_link.trim().length > 0;
                }
                return true;
            case 'recording':
                if (lesson.recording_source === 'youtube' || lesson.recording_source === 'external') {
                    return true; // Recording URL is optional
                }
                return true;
            default:
                return true;
        }
    };
    
    const handleNext = () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        }
    };
    
    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };
    
    const handleSave = async (publish = false) => {
        setSaving(true);
        try {
            const data = {
                ...lesson,
                course_id: courseId,
                is_published: publish,
            };
            
            const res = await lessonsAPI.create(data);
            toast.success(publish ? 'Lesson created and published!' : 'Lesson saved as draft');
            onSuccess?.(res.data);
            onClose?.();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to create lesson');
        } finally {
            setSaving(false);
        }
    };
    
    const renderStepContent = () => {
        switch (STEPS[currentStep].id) {
            case 'basics':
                return (
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="title">Lesson Title *</Label>
                            <Input
                                id="title"
                                value={lesson.title}
                                onChange={(e) => updateField('title', e.target.value)}
                                placeholder="e.g., Introduction to Prayer"
                                className="text-lg"
                                data-testid="lesson-title-input"
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="description">Description *</Label>
                            <Textarea
                                id="description"
                                value={lesson.description}
                                onChange={(e) => updateField('description', e.target.value)}
                                placeholder="What will students learn in this lesson?"
                                rows={3}
                                data-testid="lesson-description-input"
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="date">Lesson Date</Label>
                            <Input
                                id="date"
                                type="date"
                                value={lesson.lesson_date}
                                onChange={(e) => updateField('lesson_date', e.target.value)}
                                data-testid="lesson-date-input"
                            />
                            <p className="text-xs text-muted-foreground">
                                When will this lesson be taught? Used for scheduling.
                            </p>
                        </div>
                    </div>
                );
                
            case 'hosting':
                return (
                    <div className="space-y-6">
                        <p className="text-sm text-muted-foreground">
                            Choose how you'll host this live session. Students will only see the option you select.
                        </p>
                        
                        <div className="grid gap-4">
                            <button
                                type="button"
                                onClick={() => updateField('hosting_method', 'in_app')}
                                className={cn(
                                    "p-5 rounded-xl border-2 transition-all text-left flex items-start gap-4",
                                    lesson.hosting_method === 'in_app'
                                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                                        : "border-muted hover:border-primary/50"
                                )}
                                data-testid="hosting-in-app"
                            >
                                <div className={cn(
                                    "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
                                    lesson.hosting_method === 'in_app' ? "bg-primary text-primary-foreground" : "bg-muted"
                                )}>
                                    <Video className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold">In-App Video Room</p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Built-in video conferencing with automatic cloud recording. 
                                        Students join directly in the app.
                                    </p>
                                    <div className="flex gap-2 mt-2">
                                        <Badge variant="secondary" className="text-xs">Recording</Badge>
                                        <Badge variant="secondary" className="text-xs">Screen Share</Badge>
                                        <Badge variant="secondary" className="text-xs">Chat</Badge>
                                    </div>
                                </div>
                                {lesson.hosting_method === 'in_app' && (
                                    <Check className="w-5 h-5 text-primary flex-shrink-0" />
                                )}
                            </button>
                            
                            <button
                                type="button"
                                onClick={() => updateField('hosting_method', 'zoom')}
                                className={cn(
                                    "p-5 rounded-xl border-2 transition-all text-left flex items-start gap-4",
                                    lesson.hosting_method === 'zoom'
                                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                                        : "border-muted hover:border-primary/50"
                                )}
                                data-testid="hosting-zoom"
                            >
                                <div className={cn(
                                    "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
                                    lesson.hosting_method === 'zoom' ? "bg-primary text-primary-foreground" : "bg-muted"
                                )}>
                                    <ExternalLink className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold">Zoom Meeting</p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Use your existing Zoom account. Students click to join externally.
                                    </p>
                                    <Badge variant="secondary" className="text-xs mt-2">External Link</Badge>
                                </div>
                                {lesson.hosting_method === 'zoom' && (
                                    <Check className="w-5 h-5 text-primary flex-shrink-0" />
                                )}
                            </button>
                        </div>
                        
                        {lesson.hosting_method === 'zoom' && (
                            <div className="space-y-2 animate-fade-in">
                                <Label htmlFor="zoom_link">Zoom Meeting Link *</Label>
                                <Input
                                    id="zoom_link"
                                    value={lesson.zoom_link}
                                    onChange={(e) => updateField('zoom_link', e.target.value)}
                                    placeholder="https://zoom.us/j/..."
                                    data-testid="zoom-link-input"
                                />
                            </div>
                        )}
                    </div>
                );
                
            case 'recording':
                return (
                    <div className="space-y-6">
                        <p className="text-sm text-muted-foreground">
                            Where can students watch the replay after the live session?
                        </p>
                        
                        <div className="grid gap-3">
                            {[
                                { 
                                    value: 'daily', 
                                    label: 'In-App Recording', 
                                    desc: 'Automatic from live sessions',
                                    icon: Video,
                                    color: 'purple'
                                },
                                { 
                                    value: 'youtube', 
                                    label: 'YouTube Video', 
                                    desc: 'Link to your uploaded video',
                                    icon: Play,
                                    color: 'red'
                                },
                                { 
                                    value: 'external', 
                                    label: 'External URL', 
                                    desc: 'Vimeo, Google Drive, etc.',
                                    icon: ExternalLink,
                                    color: 'blue'
                                },
                                { 
                                    value: 'none', 
                                    label: 'No Recording', 
                                    desc: 'Live attendance only',
                                    icon: X,
                                    color: 'gray'
                                },
                            ].map(option => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => updateField('recording_source', option.value)}
                                    className={cn(
                                        "p-4 rounded-xl border-2 transition-all text-left flex items-center gap-4",
                                        lesson.recording_source === option.value
                                            ? "border-primary bg-primary/5"
                                            : "border-muted hover:border-primary/50"
                                    )}
                                    data-testid={`recording-${option.value}`}
                                >
                                    <div className={cn(
                                        "w-10 h-10 rounded-lg flex items-center justify-center",
                                        `bg-${option.color}-100 dark:bg-${option.color}-900/30`
                                    )}>
                                        <option.icon className={cn("w-5 h-5", `text-${option.color}-600`)} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium">{option.label}</p>
                                        <p className="text-xs text-muted-foreground">{option.desc}</p>
                                    </div>
                                    {lesson.recording_source === option.value && (
                                        <Check className="w-5 h-5 text-primary" />
                                    )}
                                </button>
                            ))}
                        </div>
                        
                        {(lesson.recording_source === 'youtube' || lesson.recording_source === 'external') && (
                            <div className="space-y-2 animate-fade-in">
                                <Label htmlFor="recording_url">
                                    {lesson.recording_source === 'youtube' ? 'YouTube URL' : 'Video URL'} <span className="text-muted-foreground text-xs">(optional)</span>
                                </Label>
                                <Input
                                    id="recording_url"
                                    value={lesson.recording_url}
                                    onChange={(e) => updateField('recording_url', e.target.value)}
                                    placeholder={lesson.recording_source === 'youtube' 
                                        ? "https://youtube.com/watch?v=..." 
                                        : "https://..."
                                    }
                                    data-testid="recording-url-input"
                                />
                            </div>
                        )}
                        
                        {lesson.recording_source === 'daily' && (
                            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-sm">
                                <p className="text-purple-700 dark:text-purple-300">
                                    Recordings will be automatically saved when you use the in-app video room 
                                    and click the record button during the session.
                                </p>
                            </div>
                        )}
                    </div>
                );
                
            case 'content':
                return (
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="teacher_notes">Teacher Notes</Label>
                            <Textarea
                                id="teacher_notes"
                                value={lesson.teacher_notes}
                                onChange={(e) => updateField('teacher_notes', e.target.value)}
                                placeholder="Key points, outline, or study notes for this lesson..."
                                rows={4}
                                data-testid="teacher-notes-input"
                            />
                            <p className="text-xs text-muted-foreground">
                                Supports Markdown formatting. Students see this in the Watch Replay tab.
                            </p>
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="reading_plan">Reading Plan</Label>
                            <Textarea
                                id="reading_plan"
                                value={lesson.reading_plan}
                                onChange={(e) => updateField('reading_plan', e.target.value)}
                                placeholder="Scripture or readings for the week..."
                                rows={3}
                                data-testid="reading-plan-input"
                            />
                            <p className="text-xs text-muted-foreground">
                                Suggested readings or homework for students.
                            </p>
                        </div>
                    </div>
                );
                
            case 'review':
                return (
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <FileText className="w-5 h-5 text-muted-foreground mt-0.5" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Title</p>
                                    <p className="font-medium">{lesson.title || 'Not set'}</p>
                                </div>
                            </div>
                            
                            <div className="flex items-start gap-3">
                                <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Date</p>
                                    <p className="font-medium">{lesson.lesson_date || 'Not scheduled'}</p>
                                </div>
                            </div>
                            
                            <div className="flex items-start gap-3">
                                <Video className="w-5 h-5 text-muted-foreground mt-0.5" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Hosting</p>
                                    <p className="font-medium">
                                        {lesson.hosting_method === 'in_app' ? 'In-App Video Room' : 'Zoom Meeting'}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex items-start gap-3">
                                <Play className="w-5 h-5 text-muted-foreground mt-0.5" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Recording</p>
                                    <p className="font-medium">
                                        {lesson.recording_source === 'daily' && 'In-App Recording'}
                                        {lesson.recording_source === 'youtube' && 'YouTube Video'}
                                        {lesson.recording_source === 'external' && 'External URL'}
                                        {lesson.recording_source === 'none' && 'No recording'}
                                    </p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-4 bg-muted/50 rounded-xl">
                            <p className="text-sm text-muted-foreground">
                                You can add discussion prompts and upload resources after creating the lesson.
                            </p>
                        </div>
                    </div>
                );
        }
    };
    
    return (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl animate-fade-in shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
                <CardHeader className="border-b flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">{courseName}</p>
                            <CardTitle>Create New Lesson</CardTitle>
                        </div>
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                    
                    {/* Progress steps */}
                    <div className="flex items-center justify-between mt-4">
                        {STEPS.map((step, idx) => {
                            const Icon = step.icon;
                            const isActive = idx === currentStep;
                            const isComplete = idx < currentStep;
                            
                            return (
                                <React.Fragment key={step.id}>
                                    <button
                                        onClick={() => idx < currentStep && setCurrentStep(idx)}
                                        disabled={idx > currentStep}
                                        className={cn(
                                            "flex flex-col items-center gap-1 transition-all",
                                            isActive && "scale-110",
                                            idx > currentStep && "opacity-40"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                                            isComplete && "bg-primary text-primary-foreground",
                                            isActive && "bg-primary/20 text-primary ring-2 ring-primary",
                                            !isComplete && !isActive && "bg-muted"
                                        )}>
                                            {isComplete ? (
                                                <Check className="w-5 h-5" />
                                            ) : (
                                                <Icon className="w-5 h-5" />
                                            )}
                                        </div>
                                        <span className={cn(
                                            "text-xs font-medium",
                                            isActive ? "text-primary" : "text-muted-foreground"
                                        )}>
                                            {step.title}
                                        </span>
                                    </button>
                                    {idx < STEPS.length - 1 && (
                                        <div className={cn(
                                            "flex-1 h-0.5 mx-2",
                                            idx < currentStep ? "bg-primary" : "bg-muted"
                                        )} />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                </CardHeader>
                
                <CardContent className="p-6 overflow-y-auto flex-1">
                    {renderStepContent()}
                </CardContent>
                
                <div className="p-4 border-t flex items-center justify-between flex-shrink-0">
                    <Button
                        variant="ghost"
                        onClick={currentStep === 0 ? onClose : handleBack}
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        {currentStep === 0 ? 'Cancel' : 'Back'}
                    </Button>
                    
                    {currentStep === STEPS.length - 1 ? (
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() => handleSave(false)}
                                disabled={saving}
                            >
                                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Save as Draft
                            </Button>
                            <Button
                                onClick={() => handleSave(true)}
                                disabled={saving}
                                className="btn-primary"
                            >
                                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Publish Lesson
                            </Button>
                        </div>
                    ) : (
                        <Button
                            onClick={handleNext}
                            disabled={!canProceed()}
                            className="btn-primary"
                        >
                            Next
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default LessonWizard;

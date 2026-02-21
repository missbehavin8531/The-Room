import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { coursesAPI } from '../lib/api';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import {
    ArrowLeft, ArrowRight, Check, BookOpen, 
    Loader2, FileText, Users, X, Sparkles, Calendar, ListOrdered
} from 'lucide-react';

const STEPS = [
    { id: 'basics', title: 'Course Details', icon: FileText },
    { id: 'settings', title: 'Settings', icon: ListOrdered },
    { id: 'review', title: 'Review & Create', icon: Check },
];

export const CourseWizard = ({ onClose, onSuccess }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [saving, setSaving] = useState(false);
    
    const [course, setCourse] = useState({
        title: '',
        description: '',
        thumbnail_url: '',
        is_published: false,
        unlock_type: 'sequential',
    });
    
    const updateField = (field, value) => {
        setCourse(prev => ({ ...prev, [field]: value }));
    };
    
    const canProceed = () => {
        switch (STEPS[currentStep].id) {
            case 'basics':
                return course.title.trim() && course.description.trim();
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
                ...course,
                is_published: publish,
            };
            
            const res = await coursesAPI.create(data);
            toast.success('Course created! Now let\'s add your first lesson.');
            // Pass the created course to trigger lesson wizard
            onSuccess?.(res.data, true); // true = should start lesson wizard
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to create course');
            setSaving(false);
        }
    };
    
    const renderStepContent = () => {
        switch (STEPS[currentStep].id) {
            case 'basics':
                return (
                    <div className="space-y-6">
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <BookOpen className="w-8 h-8 text-primary" />
                            </div>
                            <h3 className="text-lg font-medium">Create a New Course</h3>
                            <p className="text-sm text-muted-foreground">
                                Courses organize lessons into a structured learning journey.
                            </p>
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="title">Course Title *</Label>
                            <Input
                                id="title"
                                value={course.title}
                                onChange={(e) => updateField('title', e.target.value)}
                                placeholder="e.g., Foundations of Faith"
                                className="text-lg"
                                data-testid="course-title-input"
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="description">Description *</Label>
                            <Textarea
                                id="description"
                                value={course.description}
                                onChange={(e) => updateField('description', e.target.value)}
                                placeholder="What will students learn in this course?"
                                rows={4}
                                data-testid="course-description-input"
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="thumbnail">Thumbnail URL (optional)</Label>
                            <Input
                                id="thumbnail"
                                value={course.thumbnail_url}
                                onChange={(e) => updateField('thumbnail_url', e.target.value)}
                                placeholder="https://..."
                                data-testid="course-thumbnail-input"
                            />
                            <p className="text-xs text-muted-foreground">
                                Image to display on the course card. Leave blank for default.
                            </p>
                        </div>
                    </div>
                );
                
            case 'review':
                return (
                    <div className="space-y-6">
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Sparkles className="w-8 h-8 text-green-600" />
                            </div>
                            <h3 className="text-lg font-medium">Almost There!</h3>
                            <p className="text-sm text-muted-foreground">
                                Review your course details before creating.
                            </p>
                        </div>
                        
                        <Card className="bg-muted/30">
                            <CardContent className="p-4 space-y-4">
                                <div className="flex items-start gap-3">
                                    <BookOpen className="w-5 h-5 text-muted-foreground mt-0.5" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">Title</p>
                                        <p className="font-medium">{course.title}</p>
                                    </div>
                                </div>
                                
                                <div className="flex items-start gap-3">
                                    <FileText className="w-5 h-5 text-muted-foreground mt-0.5" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">Description</p>
                                        <p className="text-sm">{course.description}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                                <strong>Next steps:</strong> After creating the course, you'll add lessons 
                                using the step-by-step lesson wizard. Lessons can be saved as drafts until 
                                you're ready to publish.
                            </p>
                        </div>
                    </div>
                );
        }
    };
    
    return (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
            <Card className="w-full max-w-lg animate-fade-in shadow-xl">
                <CardHeader className="border-b">
                    <div className="flex items-center justify-between">
                        <CardTitle>New Course</CardTitle>
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                    
                    {/* Progress steps */}
                    <div className="flex items-center justify-center gap-4 mt-4">
                        {STEPS.map((step, idx) => {
                            const Icon = step.icon;
                            const isActive = idx === currentStep;
                            const isComplete = idx < currentStep;
                            
                            return (
                                <React.Fragment key={step.id}>
                                    <div className={cn(
                                        "flex items-center gap-2 transition-all",
                                        isActive && "scale-105",
                                        idx > currentStep && "opacity-40"
                                    )}>
                                        <div className={cn(
                                            "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                                            isComplete && "bg-primary text-primary-foreground",
                                            isActive && "bg-primary/20 text-primary ring-2 ring-primary",
                                            !isComplete && !isActive && "bg-muted"
                                        )}>
                                            {isComplete ? (
                                                <Check className="w-4 h-4" />
                                            ) : (
                                                <Icon className="w-4 h-4" />
                                            )}
                                        </div>
                                        <span className={cn(
                                            "text-sm font-medium",
                                            isActive ? "text-primary" : "text-muted-foreground"
                                        )}>
                                            {step.title}
                                        </span>
                                    </div>
                                    {idx < STEPS.length - 1 && (
                                        <div className={cn(
                                            "w-8 h-0.5",
                                            idx < currentStep ? "bg-primary" : "bg-muted"
                                        )} />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                </CardHeader>
                
                <CardContent className="p-6">
                    {renderStepContent()}
                </CardContent>
                
                <div className="p-4 border-t flex items-center justify-between">
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
                                Create & Publish
                            </Button>
                        </div>
                    ) : (
                        <Button
                            onClick={handleNext}
                            disabled={!canProceed()}
                            className="btn-primary"
                        >
                            Continue
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default CourseWizard;

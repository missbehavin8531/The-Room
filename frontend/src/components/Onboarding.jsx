import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../lib/api';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { cn } from '../lib/utils';
import { 
    BookOpen, Users, Video, MessageCircle, CheckCircle, 
    ArrowRight, ArrowLeft, Sparkles, GraduationCap, Settings
} from 'lucide-react';

const teacherSteps = [
    {
        id: 'welcome',
        title: 'Welcome to The Room',
        description: 'Your discipleship hub for leading small groups. Let\'s get you set up.',
        icon: Sparkles,
        content: (
            <div className="text-center space-y-4">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <Sparkles className="w-10 h-10 text-primary" />
                </div>
                <p className="text-muted-foreground">
                    As a teacher, you can create courses, schedule lessons, and guide your group through 
                    meaningful discussions. This quick tour will show you the essentials.
                </p>
            </div>
        )
    },
    {
        id: 'courses',
        title: 'Create Your First Course',
        description: 'Courses organize your lessons into a structured learning journey.',
        icon: BookOpen,
        content: (
            <div className="space-y-4">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <h4 className="font-medium">Structured Learning</h4>
                        <p className="text-sm text-muted-foreground">
                            Create a course with multiple lessons that students complete in sequence.
                        </p>
                    </div>
                </div>
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                        <h4 className="font-medium">Progress Tracking</h4>
                        <p className="text-sm text-muted-foreground">
                            Lessons unlock sequentially as students complete each one.
                        </p>
                    </div>
                </div>
            </div>
        )
    },
    {
        id: 'hosting',
        title: 'Choose Your Hosting Method',
        description: 'Decide how you\'ll meet with your group for each lesson.',
        icon: Video,
        content: (
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border-2 border-primary bg-primary/5">
                        <Video className="w-8 h-8 text-primary mb-2" />
                        <h4 className="font-medium">In-App Video</h4>
                        <p className="text-xs text-muted-foreground">
                            Built-in video room with recording
                        </p>
                    </div>
                    <div className="p-4 rounded-xl border-2 border-muted">
                        <Settings className="w-8 h-8 text-muted-foreground mb-2" />
                        <h4 className="font-medium">Zoom</h4>
                        <p className="text-xs text-muted-foreground">
                            Use your existing Zoom setup
                        </p>
                    </div>
                </div>
                <p className="text-sm text-muted-foreground text-center">
                    Choose one method per lesson. Students will only see the option you select.
                </p>
            </div>
        )
    },
    {
        id: 'recordings',
        title: 'Set Up Recordings',
        description: 'Let students catch up with lesson recordings.',
        icon: Video,
        content: (
            <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                    For each lesson, choose where students can watch the replay:
                </p>
                <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                            <Video className="w-4 h-4 text-purple-600" />
                        </div>
                        <div>
                            <p className="font-medium text-sm">Daily.co Recording</p>
                            <p className="text-xs text-muted-foreground">Auto-saved from live sessions</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                            <span className="text-red-600 font-bold text-xs">YT</span>
                        </div>
                        <div>
                            <p className="font-medium text-sm">YouTube</p>
                            <p className="text-xs text-muted-foreground">Link to uploaded video</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <span className="text-blue-600 font-bold text-xs">URL</span>
                        </div>
                        <div>
                            <p className="font-medium text-sm">External URL</p>
                            <p className="text-xs text-muted-foreground">Vimeo, Drive, etc.</p>
                        </div>
                    </div>
                </div>
            </div>
        )
    },
    {
        id: 'ready',
        title: 'You\'re Ready!',
        description: 'Start creating your first course and invite your group.',
        icon: GraduationCap,
        content: (
            <div className="text-center space-y-4">
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                    <GraduationCap className="w-10 h-10 text-green-600" />
                </div>
                <p className="text-muted-foreground">
                    You're all set! Head to <strong>Courses</strong> to create your first course, 
                    or explore the app to see what's possible.
                </p>
            </div>
        )
    }
];

const memberSteps = [
    {
        id: 'welcome',
        title: 'Welcome to The Room',
        description: 'Your weekly discipleship hub. Let\'s show you around.',
        icon: Sparkles,
        content: (
            <div className="text-center space-y-4">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <Sparkles className="w-10 h-10 text-primary" />
                </div>
                <p className="text-muted-foreground">
                    Join your group for live sessions, watch replays, and engage in meaningful discussions. 
                    This quick tour will help you get started.
                </p>
            </div>
        )
    },
    {
        id: 'courses',
        title: 'Your Courses',
        description: 'Enroll in courses to access lessons and track your progress.',
        icon: BookOpen,
        content: (
            <div className="space-y-4">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <h4 className="font-medium">Sequential Lessons</h4>
                        <p className="text-sm text-muted-foreground">
                            Complete lessons in order to unlock the next one in the course.
                        </p>
                    </div>
                </div>
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                        <h4 className="font-medium">Track Progress</h4>
                        <p className="text-sm text-muted-foreground">
                            See your progress through each course and celebrate completions.
                        </p>
                    </div>
                </div>
            </div>
        )
    },
    {
        id: 'lessons',
        title: 'Lesson Experience',
        description: 'Each lesson has three phases: NOW, NEXT, and AFTER.',
        icon: Video,
        content: (
            <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10">
                    <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                        <Video className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                        <p className="font-medium">NOW - Join Live</p>
                        <p className="text-xs text-muted-foreground">Attend live video sessions</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                        <Video className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="font-medium">NEXT - Watch Replay</p>
                        <p className="text-xs text-muted-foreground">Catch up with recordings</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                        <MessageCircle className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="font-medium">AFTER - Engage</p>
                        <p className="text-xs text-muted-foreground">Discuss, read, and reflect</p>
                    </div>
                </div>
            </div>
        )
    },
    {
        id: 'ready',
        title: 'You\'re Ready!',
        description: 'Start exploring your courses and join your group.',
        icon: GraduationCap,
        content: (
            <div className="text-center space-y-4">
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                    <GraduationCap className="w-10 h-10 text-green-600" />
                </div>
                <p className="text-muted-foreground">
                    You're all set! Head to <strong>Courses</strong> to see what's available, 
                    or check the <strong>Dashboard</strong> for your upcoming lessons.
                </p>
            </div>
        )
    }
];

export const Onboarding = ({ onComplete }) => {
    const { user, isTeacher } = useAuth();
    const [currentStep, setCurrentStep] = useState(0);
    const [isVisible, setIsVisible] = useState(true);
    
    const steps = isTeacher ? teacherSteps : memberSteps;
    const step = steps[currentStep];
    const Icon = step.icon;
    
    const handleNext = async () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
            await authAPI.completeOnboardingStep(steps[currentStep].id).catch(() => {});
        } else {
            await handleComplete();
        }
    };
    
    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };
    
    const handleComplete = async () => {
        try {
            await authAPI.completeOnboarding();
        } catch (e) {
            console.error('Failed to save onboarding status:', e);
        }
        setIsVisible(false);
        onComplete?.();
    };
    
    const handleSkip = async () => {
        await handleComplete();
    };
    
    if (!isVisible) return null;
    
    return (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
            <Card className="w-full max-w-lg animate-fade-in shadow-xl">
                <CardContent className="p-6">
                    {/* Progress dots */}
                    <div className="flex justify-center gap-2 mb-6">
                        {steps.map((_, idx) => (
                            <div
                                key={idx}
                                className={cn(
                                    "w-2 h-2 rounded-full transition-all",
                                    idx === currentStep 
                                        ? "w-6 bg-primary" 
                                        : idx < currentStep 
                                            ? "bg-primary/50" 
                                            : "bg-muted"
                                )}
                            />
                        ))}
                    </div>
                    
                    {/* Step content */}
                    <div className="text-center mb-6">
                        <h2 className="text-xl font-semibold mb-2">{step.title}</h2>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                    
                    <div className="min-h-[200px] flex items-center justify-center mb-6">
                        {step.content}
                    </div>
                    
                    {/* Navigation */}
                    <div className="flex items-center justify-between">
                        <Button
                            variant="ghost"
                            onClick={handleBack}
                            disabled={currentStep === 0}
                            className={cn(currentStep === 0 && "invisible")}
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back
                        </Button>
                        
                        <Button
                            variant="ghost"
                            onClick={handleSkip}
                            className="text-muted-foreground"
                        >
                            Skip tour
                        </Button>
                        
                        <Button onClick={handleNext} className="btn-primary">
                            {currentStep === steps.length - 1 ? (
                                <>
                                    Get Started
                                    <Sparkles className="w-4 h-4 ml-2" />
                                </>
                            ) : (
                                <>
                                    Next
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default Onboarding;

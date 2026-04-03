import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { toast } from 'sonner';
import { Loader2, ArrowRight, Users, Copy, BookOpen, UserPlus, CheckCircle } from 'lucide-react';
import { groupsAPI } from '../lib/api';

export const TeacherSetup = () => {
    const [step, setStep] = useState(1);
    const [groupName, setGroupName] = useState('');
    const [createdGroup, setCreatedGroup] = useState(null);
    const [loading, setLoading] = useState(false);
    const { refreshUser } = useAuth();
    const navigate = useNavigate();

    const handleCreateGroup = async () => {
        if (!groupName.trim()) {
            toast.error('Please name your group');
            return;
        }
        setLoading(true);
        try {
            const res = await groupsAPI.create({ name: groupName.trim() });
            setCreatedGroup(res.data);
            setStep(2);
            toast.success('Group created!');
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to create group');
        } finally {
            setLoading(false);
        }
    };

    const handleFinish = async () => {
        if (refreshUser) await refreshUser();
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-lg">
                <div className="text-center mb-8 animate-fade-in">
                    <img src="/logo.png" alt="The Room" className="w-16 h-16 mx-auto mb-4 rounded-2xl" />
                    <h1 className="font-serif text-2xl font-bold">Welcome, Teacher!</h1>
                    <p className="text-muted-foreground mt-2">Let's set up your group in just a few steps</p>
                </div>

                <div className="flex items-center justify-center gap-2 mb-8">
                    {[1, 2, 3].map((s) => (
                        <div
                            key={s}
                            className={`h-2 rounded-full transition-all duration-300 ${
                                s === step ? 'w-10 bg-primary' : s < step ? 'w-10 bg-primary/50' : 'w-2 bg-muted'
                            }`}
                        />
                    ))}
                </div>

                {/* Step 1: Name Your Group */}
                {step === 1 && (
                    <Card className="card-organic animate-fade-in">
                        <CardContent className="p-8 space-y-6">
                            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
                                <Users className="w-8 h-8 text-primary" />
                            </div>
                            <div className="text-center">
                                <h2 className="text-xl font-serif font-bold mb-2">Name Your Group</h2>
                                <p className="text-muted-foreground text-sm">This is what your members will see when they join.</p>
                            </div>
                            <Input
                                type="text"
                                placeholder="e.g. Sunday Study Group"
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                                className="input-clean text-center text-lg py-6"
                                autoFocus
                                data-testid="teacher-group-name"
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()}
                            />
                            <Button
                                onClick={handleCreateGroup}
                                className="w-full btn-primary py-6 text-lg"
                                disabled={loading}
                                data-testid="teacher-create-group-btn"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Create Group <ArrowRight className="w-5 h-5 ml-2" /></>}
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Step 2: Share Invite Code */}
                {step === 2 && createdGroup && (
                    <Card className="card-organic animate-fade-in">
                        <CardContent className="p-8 space-y-6">
                            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mx-auto">
                                <UserPlus className="w-8 h-8 text-green-600" />
                            </div>
                            <div className="text-center">
                                <h2 className="text-xl font-serif font-bold mb-2">Invite Your Members</h2>
                                <p className="text-muted-foreground text-sm">Share this code with your group members so they can sign up.</p>
                            </div>
                            <div className="bg-muted/50 rounded-xl p-5">
                                <p className="text-xs text-muted-foreground text-center mb-2">Your invite code</p>
                                <div className="flex items-center justify-center gap-3">
                                    <code className="text-3xl font-mono font-bold tracking-[0.3em]" data-testid="teacher-invite-code">
                                        {createdGroup.invite_code}
                                    </code>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => {
                                            navigator.clipboard.writeText(createdGroup.invite_code);
                                            toast.success('Code copied!');
                                        }}
                                        data-testid="teacher-copy-code"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                            <p className="text-xs text-center text-muted-foreground">
                                Members will enter this code when they register. You'll approve them from your dashboard.
                            </p>
                            <Button onClick={() => setStep(3)} className="w-full btn-primary py-6 text-lg" data-testid="teacher-next-step">
                                Next <ArrowRight className="w-5 h-5 ml-2" />
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Step 3: What's Next */}
                {step === 3 && (
                    <Card className="card-organic animate-fade-in">
                        <CardContent className="p-8 space-y-6">
                            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
                                <BookOpen className="w-8 h-8 text-primary" />
                            </div>
                            <div className="text-center">
                                <h2 className="text-xl font-serif font-bold mb-2">You're All Set!</h2>
                                <p className="text-muted-foreground text-sm">Here's what you can do as a Teacher:</p>
                            </div>
                            <div className="space-y-4">
                                {[
                                    { icon: BookOpen, title: 'Create Courses & Lessons', desc: 'Build your curriculum with videos, notes, and discussion prompts' },
                                    { icon: UserPlus, title: 'Approve New Members', desc: 'Review and approve members who join with your invite code' },
                                    { icon: Users, title: 'Track Attendance & Progress', desc: 'See who\'s attending lessons and completing courses' },
                                    { icon: CheckCircle, title: 'Lead Live Sessions', desc: 'Start video meetings right from any lesson' },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-start gap-3">
                                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                                            <item.icon className="w-4 h-4 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">{item.title}</p>
                                            <p className="text-xs text-muted-foreground">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <Button onClick={handleFinish} className="w-full btn-primary py-6 text-lg" data-testid="teacher-get-started">
                                Start Teaching <ArrowRight className="w-5 h-5 ml-2" />
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
};

export default TeacherSetup;

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { toast } from 'sonner';
import { Loader2, CheckCircle, ArrowRight, ArrowLeft, Users, Plus, Copy } from 'lucide-react';
import { groupsAPI } from '../lib/api';

export const Register = () => {
    const [step, setStep] = useState(1);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [groupMode, setGroupMode] = useState(null);
    const [groupName, setGroupName] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    const [groupPreview, setGroupPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [resultData, setResultData] = useState(null);
    const { register } = useAuth();

    const handleNext = async () => {
        if (step === 1 && !name.trim()) {
            toast.error('Please enter your name');
            return;
        }
        if (step === 2) {
            if (!groupMode) {
                toast.error('Please choose an option');
                return;
            }
            if (groupMode === 'create' && !groupName.trim()) {
                toast.error('Please enter your group name');
                return;
            }
            if (groupMode === 'join') {
                if (!inviteCode.trim()) {
                    toast.error('Please enter an invite code');
                    return;
                }
                try {
                    const res = await groupsAPI.lookup(inviteCode.trim());
                    setGroupPreview(res.data);
                } catch {
                    toast.error('Invalid invite code. Check with your group leader.');
                    return;
                }
            }
        }
        if (step === 3 && (!email.trim() || !email.includes('@'))) {
            toast.error('Please enter a valid email');
            return;
        }
        setStep(step + 1);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!password || password.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }
        setLoading(true);
        try {
            const result = await register(
                name,
                email,
                password,
                groupMode === 'create' ? groupName : null,
                groupMode === 'join' ? inviteCode : null
            );
            setResultData(result);
            setSuccess(true);
            toast.success('Welcome to The Room!');
        } catch (error) {
            const message = error.response?.data?.detail || 'Registration failed';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        const isCreator = groupMode === 'create';
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    <Card className="card-organic text-center animate-fade-in">
                        <CardContent className="pt-10 pb-10 space-y-6">
                            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle className="w-10 h-10 text-green-600" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-serif font-bold mb-2">
                                    {isCreator ? "Your Group is Ready!" : "You're In!"}
                                </h2>
                                <p className="text-muted-foreground">
                                    Welcome, <strong>{name.split(' ')[0]}</strong>!
                                </p>
                            </div>

                            {isCreator && (
                                <div className="bg-muted/50 rounded-xl p-5 text-left space-y-3">
                                    <p className="text-sm font-medium">Share this invite code with your group members:</p>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 bg-background rounded-lg px-4 py-3 font-mono text-xl tracking-[0.25em] text-center font-bold">
                                            {resultData?.group_id ? '...' : 'Loading'}
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        You can always find this in Admin &rarr; Group Settings after signing in.
                                    </p>
                                </div>
                            )}

                            {!isCreator && (
                                <p className="text-muted-foreground text-sm">
                                    Your group leader will approve your account shortly. Once approved, you'll have access to lessons, discussions, video meetings, and more.
                                </p>
                            )}

                            <Link to="/login">
                                <Button className="btn-primary w-full py-6 text-lg" data-testid="go-to-login-btn">
                                    {isCreator ? 'Start Setting Up' : 'Go to Sign In'}
                                    <ArrowRight className="w-5 h-5 ml-2" />
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8 animate-fade-in">
                    <img src="/logo.png" alt="The Room" className="w-20 h-20 mx-auto mb-4 rounded-2xl" />
                    <h1 className="font-serif text-3xl font-bold">The Room</h1>
                    <p className="text-muted-foreground mt-2">Join your small group community</p>
                </div>

                <div className="flex items-center justify-center gap-2 mb-8">
                    {[1, 2, 3, 4].map((s) => (
                        <div
                            key={s}
                            className={`h-2 rounded-full transition-all duration-300 ${
                                s === step ? 'w-8 bg-primary' : s < step ? 'w-8 bg-primary/50' : 'w-2 bg-muted'
                            }`}
                        />
                    ))}
                </div>

                <Card className="card-organic animate-fade-in">
                    <CardContent className="p-6">
                        {/* Step 1: Name */}
                        {step === 1 && (
                            <div className="space-y-6">
                                <div className="text-center">
                                    <h2 className="text-xl font-serif font-bold mb-2">What's your name?</h2>
                                    <p className="text-muted-foreground text-sm">We'd love to know who's joining us</p>
                                </div>
                                <Input
                                    type="text"
                                    placeholder="Your full name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="input-clean text-center text-lg py-6"
                                    autoFocus
                                    data-testid="register-name-input"
                                    onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                                />
                                <Button onClick={handleNext} className="w-full btn-primary py-6 text-lg" data-testid="step1-continue">
                                    Continue <ArrowRight className="w-5 h-5 ml-2" />
                                </Button>
                            </div>
                        )}

                        {/* Step 2: Group Selection */}
                        {step === 2 && (
                            <div className="space-y-5">
                                <div className="text-center">
                                    <h2 className="text-xl font-serif font-bold mb-2">Your Group</h2>
                                    <p className="text-muted-foreground text-sm">Start a new group or join an existing one</p>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => { setGroupMode('create'); setGroupPreview(null); }}
                                        className={`p-4 rounded-xl border-2 text-center transition-all ${
                                            groupMode === 'create'
                                                ? 'border-primary bg-primary/5'
                                                : 'border-muted hover:border-primary/50'
                                        }`}
                                        data-testid="group-create-option"
                                    >
                                        <Plus className="w-6 h-6 mx-auto mb-2 text-primary" />
                                        <span className="text-sm font-medium">Start New Group</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setGroupMode('join'); setGroupPreview(null); }}
                                        className={`p-4 rounded-xl border-2 text-center transition-all ${
                                            groupMode === 'join'
                                                ? 'border-primary bg-primary/5'
                                                : 'border-muted hover:border-primary/50'
                                        }`}
                                        data-testid="group-join-option"
                                    >
                                        <Users className="w-6 h-6 mx-auto mb-2 text-primary" />
                                        <span className="text-sm font-medium">Join Existing</span>
                                    </button>
                                </div>

                                {groupMode === 'create' && (
                                    <div className="space-y-2 animate-fade-in">
                                        <Input
                                            type="text"
                                            placeholder="e.g. Sunday Study Group"
                                            value={groupName}
                                            onChange={(e) => setGroupName(e.target.value)}
                                            className="input-clean text-center text-lg py-5"
                                            autoFocus
                                            data-testid="group-name-input"
                                        />
                                        <p className="text-xs text-muted-foreground text-center">
                                            You'll be the admin and can invite members after setup.
                                        </p>
                                    </div>
                                )}

                                {groupMode === 'join' && (
                                    <div className="space-y-2 animate-fade-in">
                                        <Input
                                            type="text"
                                            placeholder="Enter invite code"
                                            value={inviteCode}
                                            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                                            className="input-clean text-center text-lg py-5 font-mono tracking-widest"
                                            autoFocus
                                            data-testid="invite-code-input"
                                        />
                                        {groupPreview && (
                                            <div className="flex items-center justify-center gap-2 text-sm text-green-600 font-medium animate-fade-in">
                                                <CheckCircle className="w-4 h-4" />
                                                Joining: {groupPreview.group_name}
                                            </div>
                                        )}
                                        <p className="text-xs text-muted-foreground text-center">
                                            Ask your group leader for the code.
                                        </p>
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    <Button variant="outline" onClick={() => setStep(1)} className="flex-1 py-6">
                                        <ArrowLeft className="w-4 h-4 mr-2" /> Back
                                    </Button>
                                    <Button onClick={handleNext} className="flex-1 btn-primary py-6" disabled={!groupMode} data-testid="step2-continue">
                                        Continue <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Email */}
                        {step === 3 && (
                            <div className="space-y-6">
                                <div className="text-center">
                                    <h2 className="text-xl font-serif font-bold mb-2">Hi {name.split(' ')[0]}!</h2>
                                    <p className="text-muted-foreground text-sm">What's your email address?</p>
                                </div>
                                <Input
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="input-clean text-center text-lg py-6"
                                    autoFocus
                                    data-testid="register-email-input"
                                    onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                                />
                                <div className="flex gap-3">
                                    <Button variant="outline" onClick={() => setStep(2)} className="flex-1 py-6">
                                        <ArrowLeft className="w-4 h-4 mr-2" /> Back
                                    </Button>
                                    <Button onClick={handleNext} className="flex-1 btn-primary py-6" data-testid="step3-continue">
                                        Continue <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Step 4: Password */}
                        {step === 4 && (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="text-center">
                                    <h2 className="text-xl font-serif font-bold mb-2">Almost done!</h2>
                                    <p className="text-muted-foreground text-sm">Create a password to secure your account</p>
                                </div>
                                <Input
                                    type="password"
                                    placeholder="At least 6 characters"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input-clean text-center text-lg py-6"
                                    autoFocus
                                    data-testid="register-password-input"
                                />

                                {/* Summary */}
                                <div className="bg-muted/40 rounded-xl p-4 text-sm space-y-1.5">
                                    <p><span className="text-muted-foreground">Name:</span> <strong>{name}</strong></p>
                                    <p><span className="text-muted-foreground">Email:</span> <strong>{email}</strong></p>
                                    <p>
                                        <span className="text-muted-foreground">Group:</span>{' '}
                                        <strong>{groupMode === 'create' ? groupName : groupPreview?.group_name || inviteCode}</strong>
                                        <span className="text-muted-foreground ml-1">({groupMode === 'create' ? 'new' : 'joining'})</span>
                                    </p>
                                </div>

                                <div className="flex gap-3">
                                    <Button type="button" variant="outline" onClick={() => setStep(3)} className="flex-1 py-6">
                                        <ArrowLeft className="w-4 h-4 mr-2" /> Back
                                    </Button>
                                    <Button type="submit" className="flex-1 btn-primary py-6" disabled={loading} data-testid="register-submit-btn">
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Join Now <ArrowRight className="w-4 h-4 ml-2" /></>}
                                    </Button>
                                </div>
                            </form>
                        )}

                        <div className="mt-6 text-center">
                            <p className="text-sm text-muted-foreground">
                                Already have an account?{' '}
                                <Link to="/login" className="text-primary hover:underline font-medium" data-testid="login-link">
                                    Sign in
                                </Link>
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default Register;

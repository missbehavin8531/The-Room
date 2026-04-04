import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { toast } from 'sonner';
import { Loader2, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { groupsAPI } from '../lib/api';

export const Register = () => {
    const [searchParams] = useSearchParams();
    const [step, setStep] = useState(1);
    const [name, setName] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    const [groupPreview, setGroupPreview] = useState(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const { register } = useAuth();

    useEffect(() => {
        const codeParam = searchParams.get('code');
        if (codeParam) setInviteCode(codeParam.toUpperCase());
    }, [searchParams]);

    const handleNext = async () => {
        if (step === 1 && !name.trim()) {
            toast.error('Please enter your name');
            return;
        }
        if (step === 2) {
            if (!inviteCode.trim()) {
                toast.error('Please enter the invite code from your group leader');
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
        setStep(step + 1);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email.trim() || !email.includes('@')) {
            toast.error('Please enter a valid email');
            return;
        }
        if (!password || password.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }
        setLoading(true);
        try {
            await register(name, email, password, inviteCode.trim());
            setSuccess(true);
            toast.success('Welcome!');
        } catch (error) {
            const message = error.response?.data?.detail || 'Registration failed';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    <Card className="card-organic text-center animate-fade-in">
                        <CardContent className="pt-10 pb-10 space-y-6">
                            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle className="w-10 h-10 text-green-600" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-serif font-bold mb-2">You're In!</h2>
                                <p className="text-muted-foreground">Welcome, <strong>{name.split(' ')[0]}</strong>!</p>
                            </div>
                            <div className="bg-muted/40 rounded-xl p-4 text-sm text-left space-y-2">
                                <p className="font-medium">What happens next:</p>
                                <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground">
                                    <li>Your group leader <strong>{groupPreview?.group_name}</strong> will approve your account</li>
                                    <li>You'll get access to lessons, discussions, and video meetings</li>
                                    <li>Check back shortly or wait for an email notification</li>
                                </ol>
                            </div>
                            <Link to="/login">
                                <Button className="btn-primary w-full py-6 text-lg" data-testid="go-to-login-btn">
                                    Go to Sign In <ArrowRight className="w-5 h-5 ml-2" />
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
                    <p className="text-muted-foreground mt-2">Join your small group</p>
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

                <Card className="card-organic animate-fade-in">
                    <CardContent className="p-6">
                        {/* Step 1: Name */}
                        {step === 1 && (
                            <div className="space-y-6">
                                <div className="text-center">
                                    <h2 className="text-xl font-serif font-bold mb-2">What's your name?</h2>
                                    <p className="text-muted-foreground text-sm">We'd love to know who's joining</p>
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

                        {/* Step 2: Invite Code */}
                        {step === 2 && (
                            <div className="space-y-5">
                                <div className="text-center">
                                    <h2 className="text-xl font-serif font-bold mb-2">Enter Your Invite Code</h2>
                                    <p className="text-muted-foreground text-sm">Your group leader should have shared a code with you</p>
                                </div>
                                <Input
                                    type="text"
                                    placeholder="e.g. ABCD1234"
                                    value={inviteCode}
                                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                                    className="input-clean text-center text-xl py-6 font-mono tracking-[0.3em]"
                                    autoFocus
                                    data-testid="invite-code-input"
                                    onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                                />
                                {groupPreview && (
                                    <div className="flex items-center justify-center gap-2 text-sm text-green-600 font-medium animate-fade-in">
                                        <CheckCircle className="w-4 h-4" />
                                        {groupPreview.group_name}
                                    </div>
                                )}
                                <div className="flex gap-3">
                                    <Button variant="outline" onClick={() => setStep(1)} className="flex-1 py-6">
                                        <ArrowLeft className="w-4 h-4 mr-2" /> Back
                                    </Button>
                                    <Button onClick={handleNext} className="flex-1 btn-primary py-6" data-testid="step2-continue">
                                        Continue <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Email & Password */}
                        {step === 3 && (
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="text-center">
                                    <h2 className="text-xl font-serif font-bold mb-1">Create Your Account</h2>
                                    <p className="text-sm text-green-600 font-medium">Joining: {groupPreview?.group_name}</p>
                                </div>

                                <div className="space-y-3">
                                    <Input
                                        type="email"
                                        placeholder="Email address"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="input-clean py-5"
                                        autoFocus
                                        data-testid="register-email-input"
                                    />
                                    <Input
                                        type="password"
                                        placeholder="Password (6+ characters)"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="input-clean py-5"
                                        data-testid="register-password-input"
                                    />
                                </div>

                                <div className="bg-muted/40 rounded-xl p-3 text-sm">
                                    <p><span className="text-muted-foreground">Name:</span> <strong>{name}</strong></p>
                                    <p><span className="text-muted-foreground">Group:</span> <strong>{groupPreview?.group_name}</strong></p>
                                </div>

                                <div className="flex gap-3">
                                    <Button type="button" variant="outline" onClick={() => setStep(2)} className="flex-1 py-6">
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

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { toast } from 'sonner';
import { Loader2, CheckCircle, ArrowRight, ArrowLeft, Church, Users, Plus } from 'lucide-react';
import { churchesAPI } from '../lib/api';

export const Register = () => {
    const [step, setStep] = useState(1);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [churchMode, setChurchMode] = useState(null); // 'create' | 'join'
    const [churchName, setChurchName] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    const [churchPreview, setChurchPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const { register } = useAuth();

    const handleNext = async () => {
        if (step === 1 && !name.trim()) {
            toast.error('Please enter your name');
            return;
        }
        if (step === 2) {
            if (!churchMode) {
                toast.error('Please choose an option');
                return;
            }
            if (churchMode === 'create' && !churchName.trim()) {
                toast.error('Please enter your church name');
                return;
            }
            if (churchMode === 'join') {
                if (!inviteCode.trim()) {
                    toast.error('Please enter an invite code');
                    return;
                }
                try {
                    const res = await churchesAPI.lookup(inviteCode.trim());
                    setChurchPreview(res.data);
                } catch {
                    toast.error('Invalid invite code');
                    return;
                }
            }
        }
        if (step === 3 && !email.trim()) {
            toast.error('Please enter your email');
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
                churchMode === 'create' ? churchName : null,
                churchMode === 'join' ? inviteCode : null
            );
            setIsAdmin(churchMode === 'create');
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
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    <Card className="card-organic text-center animate-fade-in">
                        <CardContent className="pt-10 pb-10">
                            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle className="w-10 h-10 text-green-600" />
                            </div>
                            <h2 className="text-2xl font-serif font-bold mb-3">
                                {isAdmin ? "Your Church is Ready!" : "You're Almost There!"}
                            </h2>
                            <p className="text-muted-foreground mb-2">
                                Welcome, <strong>{name.split(' ')[0]}</strong>!
                            </p>
                            <p className="text-muted-foreground mb-8">
                                {isAdmin
                                    ? `You're the admin of "${churchName}". Sign in to start setting up courses.`
                                    : 'An admin will approve your account shortly. You\'ll get access to lessons, discussions, and more!'}
                            </p>
                            <Link to="/login">
                                <Button className="btn-primary w-full py-6 text-lg" data-testid="go-to-login-btn">
                                    Go to Sign In
                                    <ArrowRight className="w-5 h-5 ml-2" />
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    const totalSteps = 4;

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8 animate-fade-in">
                    <img src="/logo.png" alt="The Room" className="w-20 h-20 mx-auto mb-4 rounded-2xl" />
                    <h1 className="font-serif text-3xl font-bold">The Room</h1>
                    <p className="text-muted-foreground mt-2">Join our small group community</p>
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
                                <Button onClick={handleNext} className="w-full btn-primary py-6 text-lg">
                                    Continue <ArrowRight className="w-5 h-5 ml-2" />
                                </Button>
                            </div>
                        )}

                        {/* Step 2: Church Selection */}
                        {step === 2 && (
                            <div className="space-y-5">
                                <div className="text-center">
                                    <h2 className="text-xl font-serif font-bold mb-2">Your Church</h2>
                                    <p className="text-muted-foreground text-sm">Create a new church or join an existing one</p>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => { setChurchMode('create'); setChurchPreview(null); }}
                                        className={`p-4 rounded-xl border-2 text-center transition-all ${
                                            churchMode === 'create'
                                                ? 'border-primary bg-primary/5'
                                                : 'border-muted hover:border-primary/50'
                                        }`}
                                        data-testid="church-create-option"
                                    >
                                        <Plus className="w-6 h-6 mx-auto mb-2 text-primary" />
                                        <span className="text-sm font-medium">Create New</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setChurchMode('join'); setChurchPreview(null); }}
                                        className={`p-4 rounded-xl border-2 text-center transition-all ${
                                            churchMode === 'join'
                                                ? 'border-primary bg-primary/5'
                                                : 'border-muted hover:border-primary/50'
                                        }`}
                                        data-testid="church-join-option"
                                    >
                                        <Users className="w-6 h-6 mx-auto mb-2 text-primary" />
                                        <span className="text-sm font-medium">Join Existing</span>
                                    </button>
                                </div>

                                {churchMode === 'create' && (
                                    <Input
                                        type="text"
                                        placeholder="Your church name"
                                        value={churchName}
                                        onChange={(e) => setChurchName(e.target.value)}
                                        className="input-clean text-center text-lg py-5"
                                        autoFocus
                                        data-testid="church-name-input"
                                    />
                                )}

                                {churchMode === 'join' && (
                                    <div className="space-y-2">
                                        <Input
                                            type="text"
                                            placeholder="Enter invite code"
                                            value={inviteCode}
                                            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                                            className="input-clean text-center text-lg py-5 font-mono tracking-widest"
                                            autoFocus
                                            data-testid="invite-code-input"
                                        />
                                        {churchPreview && (
                                            <p className="text-center text-sm text-green-600 font-medium">
                                                Joining: {churchPreview.church_name}
                                            </p>
                                        )}
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    <Button variant="outline" onClick={() => setStep(1)} className="flex-1 py-6">
                                        <ArrowLeft className="w-4 h-4 mr-2" /> Back
                                    </Button>
                                    <Button onClick={handleNext} className="flex-1 btn-primary py-6" disabled={!churchMode}>
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
                                    <Button onClick={handleNext} className="flex-1 btn-primary py-6">
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

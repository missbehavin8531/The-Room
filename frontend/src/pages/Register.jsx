import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { toast } from 'sonner';
import { BookOpen, Loader2, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';

export const Register = () => {
    const [step, setStep] = useState(1);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const { register } = useAuth();

    const handleNext = () => {
        if (step === 1 && !name.trim()) {
            toast.error('Please enter your name');
            return;
        }
        if (step === 2 && !email.trim()) {
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
            await register(name, email, password);
            setSuccess(true);
            toast.success('Welcome to Rooted!');
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
                            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle className="w-10 h-10 text-green-600" />
                            </div>
                            <h2 className="text-2xl font-serif font-bold mb-3">You're Almost There!</h2>
                            <p className="text-muted-foreground mb-2">
                                Welcome, <strong>{name.split(' ')[0]}</strong>! 👋
                            </p>
                            <p className="text-muted-foreground mb-8">
                                An admin will approve your account shortly. You'll get access to lessons, discussions, and more!
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

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8 animate-fade-in">
                    <img 
                        src="/logo.png" 
                        alt="Rooted" 
                        className="w-20 h-20 mx-auto mb-4 rounded-2xl"
                    />
                    <h1 className="font-serif text-3xl font-bold">Rooted</h1>
                    <p className="text-muted-foreground mt-2">Join our small group community</p>
                </div>

                {/* Progress Indicator */}
                <div className="flex items-center justify-center gap-2 mb-8">
                    {[1, 2, 3].map((s) => (
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
                                <div className="space-y-2">
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
                                </div>
                                <Button onClick={handleNext} className="w-full btn-primary py-6 text-lg">
                                    Continue
                                    <ArrowRight className="w-5 h-5 ml-2" />
                                </Button>
                            </div>
                        )}

                        {/* Step 2: Email */}
                        {step === 2 && (
                            <div className="space-y-6">
                                <div className="text-center">
                                    <h2 className="text-xl font-serif font-bold mb-2">Hi {name.split(' ')[0]}! 👋</h2>
                                    <p className="text-muted-foreground text-sm">What's your email address?</p>
                                </div>
                                <div className="space-y-2">
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
                                </div>
                                <div className="flex gap-3">
                                    <Button variant="outline" onClick={() => setStep(1)} className="flex-1 py-6">
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        Back
                                    </Button>
                                    <Button onClick={handleNext} className="flex-1 btn-primary py-6">
                                        Continue
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Password */}
                        {step === 3 && (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="text-center">
                                    <h2 className="text-xl font-serif font-bold mb-2">Almost done!</h2>
                                    <p className="text-muted-foreground text-sm">Create a password to secure your account</p>
                                </div>
                                <div className="space-y-2">
                                    <Input
                                        type="password"
                                        placeholder="At least 6 characters"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="input-clean text-center text-lg py-6"
                                        autoFocus
                                        data-testid="register-password-input"
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <Button type="button" variant="outline" onClick={() => setStep(2)} className="flex-1 py-6">
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        Back
                                    </Button>
                                    <Button type="submit" className="flex-1 btn-primary py-6" disabled={loading} data-testid="register-submit-btn">
                                        {loading ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>
                                                Join Now
                                                <ArrowRight className="w-4 h-4 ml-2" />
                                            </>
                                        )}
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

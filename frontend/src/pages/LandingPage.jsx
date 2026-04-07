import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogTitle } from '../components/ui/dialog';
import { toast } from 'sonner';
import {
    BookOpen, Users, MessageCircle, PlayCircle, Shield,
    ChevronRight, ArrowRight, Star, Sparkles, Check,
    Eye
} from 'lucide-react';

const HERO_IMG = 'https://images.unsplash.com/photo-1761370981247-1dfd749ec96b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2ODl8MHwxfHNlYXJjaHwxfHxkaXZlcnNlJTIwcGVvcGxlJTIwc3R1ZHlpbmclMjB0b2dldGhlciUyMHdhcm18ZW58MHx8fHwxNzc1NTIyMTAzfDA&ixlib=rb-4.1.0&q=85';
const COLLAB_IMG = 'https://images.unsplash.com/photo-1758525860435-502240649c59?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2ODl8MHwxfHNlYXJjaHwzfHxkaXZlcnNlJTIwcGVvcGxlJTIwc3R1ZHlpbmclMjB0b2dldGhlciUyMHdhcm18ZW58MHx8fHwxNzc1NTIyMTAzfDA&ixlib=rb-4.1.0&q=85';
const AVATARS = [
    'https://images.pexels.com/photos/33646670/pexels-photo-33646670.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=100&w=100',
    'https://images.pexels.com/photos/29852895/pexels-photo-29852895.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=100&w=100',
    'https://images.unsplash.com/photo-1609371497456-3a55a205d5eb?crop=entropy&cs=srgb&fm=jpg&w=100&h=100&fit=crop',
];

export default function LandingPage() {
    const [authOpen, setAuthOpen] = useState(false);
    const [authMode, setAuthMode] = useState('login'); // login | register
    const navigate = useNavigate();
    const { login, guestLogin, register } = useAuth();

    const handleGuestDemo = async () => {
        try {
            await guestLogin();
            navigate('/dashboard');
        } catch {
            toast.error('Could not start demo. Please try again.');
        }
    };

    return (
        <div className="min-h-screen bg-background" data-testid="landing-page">
            {/* ─── Sticky Header ─── */}
            <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/50">
                <div className="max-w-7xl mx-auto px-6 md:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                            <BookOpen className="w-4 h-4 text-primary-foreground" />
                        </div>
                        <span className="text-lg font-bold tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
                            The Room
                        </span>
                    </div>
                    <nav className="hidden md:flex items-center gap-8">
                        <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors" style={{ fontFamily: "'Manrope', sans-serif" }}>Features</a>
                        <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors" style={{ fontFamily: "'Manrope', sans-serif" }}>How It Works</a>
                        <a href="#testimonials" className="text-sm text-muted-foreground hover:text-foreground transition-colors" style={{ fontFamily: "'Manrope', sans-serif" }}>Community</a>
                    </nav>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleGuestDemo}
                            className="hidden sm:inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                            data-testid="header-try-demo"
                            style={{ fontFamily: "'Manrope', sans-serif" }}
                        >
                            <Eye className="w-4 h-4 mr-1.5" /> Try Demo
                        </button>
                        <Button
                            onClick={() => { setAuthMode('login'); setAuthOpen(true); }}
                            variant="outline"
                            className="rounded-full h-9 px-5 text-sm"
                            data-testid="header-login-btn"
                        >
                            Log in
                        </Button>
                        <Button
                            onClick={() => { setAuthMode('register'); setAuthOpen(true); }}
                            className="rounded-full h-9 px-5 text-sm bg-primary text-primary-foreground hover:bg-primary/90"
                            data-testid="header-signup-btn"
                        >
                            Sign up free
                        </Button>
                    </div>
                </div>
            </header>

            {/* ─── Hero Section ─── */}
            <section className="max-w-7xl mx-auto px-6 md:px-8 pt-20 pb-20 md:pt-32 md:pb-28">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
                    <div className="lg:col-span-6 space-y-8 animate-fade-in">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold tracking-wide uppercase" style={{ fontFamily: "'Manrope', sans-serif" }}>
                            <Sparkles className="w-3.5 h-3.5" /> Now open for communities
                        </div>
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tighter leading-[1.1]" style={{ fontFamily: "'Fraunces', serif" }}>
                            Where small groups<br />
                            <span className="text-primary">learn together.</span>
                        </h1>
                        <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-lg" style={{ fontFamily: "'Manrope', sans-serif" }}>
                            Host courses, spark discussions, and grow together in one beautiful space. Built for churches, study groups, and learning communities.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Button
                                onClick={() => { setAuthMode('register'); setAuthOpen(true); }}
                                className="rounded-full h-12 px-8 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 hover:-translate-y-0.5 transition-all shadow-sm"
                                data-testid="hero-get-started-btn"
                            >
                                Get started free <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                            <Button
                                onClick={handleGuestDemo}
                                variant="outline"
                                className="rounded-full h-12 px-8 text-base font-medium border-border hover:bg-muted/50 hover:-translate-y-0.5 transition-all"
                                data-testid="hero-try-demo-btn"
                            >
                                <Eye className="w-4 h-4 mr-2" /> Try the demo
                            </Button>
                        </div>
                        {/* Social proof */}
                        <div className="flex items-center gap-4 pt-2">
                            <div className="flex -space-x-3">
                                {AVATARS.map((src, i) => (
                                    <img key={i} src={src} alt="" className="w-9 h-9 rounded-full border-2 border-background object-cover" />
                                ))}
                            </div>
                            <div>
                                <div className="flex items-center gap-0.5">
                                    {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5" style={{ fontFamily: "'Manrope', sans-serif" }}>
                                    Loved by community leaders
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="lg:col-span-6 relative animate-fade-in" style={{ animationDelay: '0.2s' }}>
                        <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                            <img src={HERO_IMG} alt="People learning together" className="w-full aspect-[4/3] object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                        </div>
                        {/* Floating card — top right */}
                        <div className="absolute -top-4 -right-4 md:top-4 md:right-4 bg-white/80 backdrop-blur-xl border border-white/50 rounded-xl shadow-lg p-3 flex items-center gap-2.5 animate-fade-in" style={{ animationDelay: '0.5s' }}>
                            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                                <Check className="w-4 h-4 text-green-600" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-foreground" style={{ fontFamily: "'Manrope', sans-serif" }}>New lesson unlocked</p>
                                <p className="text-[10px] text-muted-foreground">What Is AI? — just now</p>
                            </div>
                        </div>
                        {/* Floating card — bottom left */}
                        <div className="absolute -bottom-4 -left-4 md:bottom-4 md:left-4 bg-white/80 backdrop-blur-xl border border-white/50 rounded-xl shadow-lg p-3 flex items-center gap-2.5 animate-fade-in" style={{ animationDelay: '0.7s' }}>
                            <div className="flex -space-x-2">
                                {AVATARS.slice(0, 2).map((src, i) => (
                                    <img key={i} src={src} alt="" className="w-6 h-6 rounded-full border-2 border-white object-cover" />
                                ))}
                            </div>
                            <p className="text-xs font-semibold text-foreground" style={{ fontFamily: "'Manrope', sans-serif" }}>12 members online</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── Features Bento Grid ─── */}
            <section id="features" className="max-w-7xl mx-auto px-6 md:px-8 py-20 md:py-32">
                <div className="text-center mb-16 space-y-4 animate-fade-in">
                    <p className="text-xs uppercase tracking-[0.2em] font-bold text-primary" style={{ fontFamily: "'Manrope', sans-serif" }}>Features</p>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
                        Everything your group needs
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto" style={{ fontFamily: "'Manrope', sans-serif" }}>
                        From structured courses to live discussions, The Room gives your community the tools to learn and grow — together.
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 lg:gap-6">
                    {/* Wide card — Courses */}
                    <div className="md:col-span-8 bg-card border border-border/50 rounded-2xl p-8 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 overflow-hidden relative group" data-testid="feature-courses">
                        <div className="relative z-10">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
                                <BookOpen className="w-6 h-6 text-primary" />
                            </div>
                            <h3 className="text-xl sm:text-2xl font-bold mb-2" style={{ fontFamily: "'Fraunces', serif" }}>Host Your Own Courses</h3>
                            <p className="text-muted-foreground max-w-md" style={{ fontFamily: "'Manrope', sans-serif" }}>
                                Create structured courses with lessons, resources, discussion questions, and video recordings. Track progress across your entire group.
                            </p>
                        </div>
                        <div className="absolute -bottom-4 -right-4 w-40 h-40 rounded-full bg-primary/5 group-hover:bg-primary/10 transition-colors duration-500" />
                    </div>
                    {/* Square card — Groups */}
                    <div className="md:col-span-4 bg-card border border-border/50 rounded-2xl p-8 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 overflow-hidden relative" data-testid="feature-groups">
                        <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-5">
                            <Users className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                        </div>
                        <h3 className="text-xl font-bold mb-2" style={{ fontFamily: "'Fraunces', serif" }}>Join Groups</h3>
                        <p className="text-sm text-muted-foreground" style={{ fontFamily: "'Manrope', sans-serif" }}>
                            Join with an invite code. Belong to multiple groups. One account, many communities.
                        </p>
                    </div>
                    {/* Tall card with image */}
                    <div className="md:col-span-4 md:row-span-2 rounded-2xl overflow-hidden border border-border/50 relative group" data-testid="feature-collaborate-img">
                        <img src={COLLAB_IMG} alt="People collaborating" className="w-full h-full object-cover min-h-[280px] md:min-h-0" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-6">
                            <h3 className="text-xl font-bold text-white mb-1" style={{ fontFamily: "'Fraunces', serif" }}>Real Collaboration</h3>
                            <p className="text-sm text-white/70" style={{ fontFamily: "'Manrope', sans-serif" }}>Not just content delivery — real community.</p>
                        </div>
                    </div>
                    {/* Chat */}
                    <div className="md:col-span-4 bg-card border border-border/50 rounded-2xl p-8 hover:-translate-y-1 hover:shadow-lg transition-all duration-300" data-testid="feature-chat">
                        <div className="w-12 h-12 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-5">
                            <MessageCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                        <h3 className="text-xl font-bold mb-2" style={{ fontFamily: "'Fraunces', serif" }}>Live Chat</h3>
                        <p className="text-sm text-muted-foreground" style={{ fontFamily: "'Manrope', sans-serif" }}>
                            Real-time group messaging that keeps conversations flowing between sessions.
                        </p>
                    </div>
                    {/* Video */}
                    <div className="md:col-span-4 bg-card border border-border/50 rounded-2xl p-8 hover:-translate-y-1 hover:shadow-lg transition-all duration-300" data-testid="feature-video">
                        <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-5">
                            <PlayCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h3 className="text-xl font-bold mb-2" style={{ fontFamily: "'Fraunces', serif" }}>Video Meetings</h3>
                        <p className="text-sm text-muted-foreground" style={{ fontFamily: "'Manrope', sans-serif" }}>
                            Meet face-to-face with in-app video or Zoom recordings attached to every lesson.
                        </p>
                    </div>
                </div>
            </section>

            {/* ─── How It Works ─── */}
            <section id="how-it-works" className="bg-muted/30 py-20 md:py-32">
                <div className="max-w-7xl mx-auto px-6 md:px-8">
                    <div className="text-center mb-16 space-y-4">
                        <p className="text-xs uppercase tracking-[0.2em] font-bold text-primary" style={{ fontFamily: "'Manrope', sans-serif" }}>How It Works</p>
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
                            Up and running in minutes
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
                        {[
                            { step: '01', title: 'Create your group', desc: 'Set up your community and get a unique invite code to share with members.', icon: Users },
                            { step: '02', title: 'Build your courses', desc: 'Add lessons, upload resources, set discussion questions, and attach video recordings.', icon: BookOpen },
                            { step: '03', title: 'Learn together', desc: 'Members join, engage with content, discuss in real-time, and track their progress.', icon: Sparkles },
                        ].map((item) => (
                            <div key={item.step} className="text-center space-y-4 group">
                                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto group-hover:-translate-y-1 transition-transform duration-300">
                                    <item.icon className="w-7 h-7 text-primary" />
                                </div>
                                <p className="text-xs font-bold text-primary tracking-widest" style={{ fontFamily: "'Manrope', sans-serif" }}>STEP {item.step}</p>
                                <h3 className="text-xl font-bold" style={{ fontFamily: "'Fraunces', serif" }}>{item.title}</h3>
                                <p className="text-sm text-muted-foreground max-w-xs mx-auto" style={{ fontFamily: "'Manrope', sans-serif" }}>{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── Social Proof ─── */}
            <section id="testimonials" className="max-w-7xl mx-auto px-6 md:px-8 py-20 md:py-32">
                <div className="bg-card border border-border/50 rounded-2xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-8 md:gap-12">
                    <div className="flex-shrink-0 text-center md:text-left">
                        <div className="flex -space-x-3 justify-center md:justify-start mb-4">
                            {AVATARS.map((src, i) => (
                                <img key={i} src={src} alt="" className="w-12 h-12 rounded-full border-3 border-background object-cover" />
                            ))}
                            <div className="w-12 h-12 rounded-full bg-primary/10 border-3 border-background flex items-center justify-center text-xs font-bold text-primary">+50</div>
                        </div>
                        <div className="flex items-center gap-0.5 justify-center md:justify-start">
                            {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
                        </div>
                    </div>
                    <div className="space-y-3">
                        <blockquote className="text-lg sm:text-xl font-medium leading-relaxed" style={{ fontFamily: "'Fraunces', serif" }}>
                            "The Room transformed how our church does small groups. Members actually complete the curriculum now, and the discussion features keep people engaged all week."
                        </blockquote>
                        <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-primary" />
                            <p className="text-sm text-muted-foreground" style={{ fontFamily: "'Manrope', sans-serif" }}>
                                <span className="font-semibold text-foreground">Community Leader</span> — Small Group Ministry
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── CTA Section ─── */}
            <section className="max-w-7xl mx-auto px-6 md:px-8 pb-20 md:pb-32">
                <div className="bg-primary rounded-2xl p-8 md:p-16 text-center space-y-6">
                    <h2 className="text-3xl sm:text-4xl font-bold text-primary-foreground tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
                        Ready to bring your group together?
                    </h2>
                    <p className="text-primary-foreground/80 text-lg max-w-xl mx-auto" style={{ fontFamily: "'Manrope', sans-serif" }}>
                        Start hosting courses, building community, and tracking progress — all in one place. Free to get started.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button
                            onClick={() => { setAuthMode('register'); setAuthOpen(true); }}
                            className="rounded-full h-12 px-8 text-base font-semibold bg-white text-primary hover:bg-white/90 hover:-translate-y-0.5 transition-all"
                            data-testid="cta-get-started-btn"
                        >
                            Get started free <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                        <Button
                            onClick={handleGuestDemo}
                            variant="outline"
                            className="rounded-full h-12 px-8 text-base font-medium bg-transparent border-white/30 text-primary-foreground hover:bg-white/10 hover:-translate-y-0.5 transition-all"
                            data-testid="cta-try-demo-btn"
                        >
                            <Eye className="w-4 h-4 mr-2" /> Try the demo
                        </Button>
                    </div>
                </div>
            </section>

            {/* ─── Footer ─── */}
            <footer className="border-t border-border/50 py-8">
                <div className="max-w-7xl mx-auto px-6 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
                            <BookOpen className="w-3 h-3 text-primary-foreground" />
                        </div>
                        <span className="text-sm font-semibold" style={{ fontFamily: "'Fraunces', serif" }}>The Room</span>
                    </div>
                    <p className="text-xs text-muted-foreground" style={{ fontFamily: "'Manrope', sans-serif" }}>
                        Built for communities that grow together.
                    </p>
                </div>
            </footer>

            {/* ─── Auth Modal ─── */}
            <AuthModal
                open={authOpen}
                onClose={() => setAuthOpen(false)}
                mode={authMode}
                setMode={setAuthMode}
                onGuestDemo={handleGuestDemo}
            />
        </div>
    );
}

function AuthModal({ open, onClose, mode, setMode, onGuestDemo }) {
    const { login, register } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', password: '', inviteCode: '' });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (mode === 'login') {
                await login(form.email, form.password);
                navigate('/dashboard');
            } else {
                await register(form.name, form.email, form.password, form.inviteCode);
                toast.success('Account created! Awaiting approval from your group leader.');
                setMode('login');
            }
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-2xl border-border/50">
                <div className="p-6 pb-0">
                    <DialogTitle className="text-2xl font-bold tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
                        {mode === 'login' ? 'Welcome back' : 'Join The Room'}
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground mt-1" style={{ fontFamily: "'Manrope', sans-serif" }}>
                        {mode === 'login'
                            ? 'Sign in to continue to your group.'
                            : 'Create your account to join a learning community.'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {mode === 'register' && (
                        <>
                            <Input
                                placeholder="Full name"
                                value={form.name}
                                onChange={set('name')}
                                required
                                className="h-11 rounded-xl bg-muted/50 border-transparent focus:bg-card focus:border-primary"
                                data-testid="auth-name-input"
                            />
                            <Input
                                placeholder="Invite code"
                                value={form.inviteCode}
                                onChange={set('inviteCode')}
                                required
                                className="h-11 rounded-xl bg-muted/50 border-transparent focus:bg-card focus:border-primary"
                                data-testid="auth-invite-input"
                            />
                        </>
                    )}
                    <Input
                        type="email"
                        placeholder="Email address"
                        value={form.email}
                        onChange={set('email')}
                        required
                        className="h-11 rounded-xl bg-muted/50 border-transparent focus:bg-card focus:border-primary"
                        data-testid="auth-email-input"
                    />
                    <Input
                        type="password"
                        placeholder="Password"
                        value={form.password}
                        onChange={set('password')}
                        required
                        className="h-11 rounded-xl bg-muted/50 border-transparent focus:bg-card focus:border-primary"
                        data-testid="auth-password-input"
                    />

                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-xl h-11 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
                        data-testid="auth-submit-btn"
                    >
                        {loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
                    </Button>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border/50" /></div>
                        <div className="relative flex justify-center text-xs"><span className="bg-background px-3 text-muted-foreground">or</span></div>
                    </div>

                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => { onClose(); onGuestDemo(); }}
                        className="w-full rounded-xl h-11 text-sm font-medium border-border hover:bg-muted/50"
                        data-testid="auth-try-demo-btn"
                    >
                        <Eye className="w-4 h-4 mr-2" /> Try demo (read-only)
                    </Button>
                </form>

                <div className="px-6 pb-6 text-center">
                    <p className="text-sm text-muted-foreground" style={{ fontFamily: "'Manrope', sans-serif" }}>
                        {mode === 'login' ? (
                            <>Don't have an account? <button onClick={() => setMode('register')} className="text-primary font-semibold hover:underline" data-testid="auth-switch-register">Sign up</button></>
                        ) : (
                            <>Already have an account? <button onClick={() => setMode('login')} className="text-primary font-semibold hover:underline" data-testid="auth-switch-login">Log in</button></>
                        )}
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}

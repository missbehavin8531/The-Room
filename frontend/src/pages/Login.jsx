import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import { Loader2, ArrowRight } from 'lucide-react';

const LOGIN_BG = "https://images.unsplash.com/photo-1761342352872-d50e9b69ebf2?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MjJ8MHwxfHNlYXJjaHwxfHxjYWxtJTIwbmF0dXJlJTIwZm9yZXN0JTIwbW9ybmluZyUyMGxpZ2h0fGVufDB8fHx8MTc3NTUxMjY4OXww&ixlib=rb-4.1.0&q=85&w=1200";

export const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email || !password) {
            toast.error('Please fill in all fields');
            return;
        }
        setLoading(true);
        try {
            const user = await login(email, password);
            toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
            if (user.needs_group_setup) {
                navigate('/teacher-setup');
            } else {
                navigate('/');
            }
        } catch (error) {
            const message = error.response?.data?.detail || 'Login failed';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative flex items-end sm:items-center justify-center overflow-hidden">
            {/* Background Image */}
            <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${LOGIN_BG})` }}
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

            {/* Card */}
            <div className="relative z-10 w-full max-w-md p-5 pb-10 sm:pb-5 animate-fade-in">
                <div className="rounded-3xl border border-white/20 overflow-hidden"
                    style={{
                        background: 'rgba(255,255,255,0.82)',
                        backdropFilter: 'blur(24px)',
                        WebkitBackdropFilter: 'blur(24px)',
                        boxShadow: '0 20px 60px rgb(0 0 0 / 0.2)',
                    }}
                >
                    <div className="p-8 sm:p-10">
                        {/* Logo & Title */}
                        <div className="text-center mb-8">
                            <img
                                src="/logo.png"
                                alt="The Room"
                                className="w-20 h-20 mx-auto mb-4 rounded-2xl shadow-lg"
                            />
                            <h1 className="text-3xl font-medium tracking-tight text-[#2A3324]" style={{ fontFamily: "'Fraunces', serif" }}>
                                The Room
                            </h1>
                            <p className="text-[#5a6b52] text-sm mt-1.5" style={{ fontFamily: "'Manrope', sans-serif" }}>
                                Meet live, share resources, discuss, and follow up.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <Input
                                type="email"
                                placeholder="Email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="py-6 text-base !bg-white/50 !border-transparent focus:!bg-white focus:!border-[#4a5d3a] rounded-xl"
                                data-testid="login-email-input"
                            />
                            <Input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="py-6 text-base !bg-white/50 !border-transparent focus:!bg-white focus:!border-[#4a5d3a] rounded-xl"
                                data-testid="login-password-input"
                            />
                            <Button
                                type="submit"
                                className="w-full btn-primary py-6 text-lg rounded-xl"
                                disabled={loading}
                                data-testid="login-submit-btn"
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        Sign In
                                        <ArrowRight className="w-5 h-5 ml-2" />
                                    </>
                                )}
                            </Button>
                        </form>

                        <div className="mt-5 text-center space-y-2">
                            <Link
                                to="/forgot-password"
                                className="text-sm text-[#5a6b52] hover:text-[#4a5d3a] hover:underline"
                                data-testid="forgot-password-link"
                            >
                                Forgot your password?
                            </Link>
                            <p className="text-sm text-[#5a6b52]">
                                New here?{' '}
                                <Link
                                    to="/register"
                                    className="text-[#4a5d3a] hover:underline font-semibold"
                                    data-testid="register-link"
                                >
                                    Create account
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;

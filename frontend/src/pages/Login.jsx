import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { toast } from 'sonner';
import { BookOpen, Loader2, ArrowRight } from 'lucide-react';

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
            navigate('/');
        } catch (error) {
            const message = error.response?.data?.detail || 'Login failed';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8 animate-fade-in">
                    <img 
                        src="/logo.png" 
                        alt="The Room" 
                        className="w-32 h-32 mx-auto mb-4 rounded-2xl"
                    />
                    <h1 className="font-serif text-3xl font-bold">The Room</h1>
                    <p className="text-muted-foreground mt-2 text-sm max-w-xs mx-auto">
                        A weekly discipleship hub: meet live, share resources, discuss, and follow up.
                    </p>
                </div>

                <Card className="card-organic animate-fade-in" style={{ animationDelay: '0.1s' }}>
                    <CardContent className="p-6">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Input
                                    type="email"
                                    placeholder="Email address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="input-clean py-6 text-base"
                                    data-testid="login-email-input"
                                />
                            </div>
                            <div className="space-y-2">
                                <Input
                                    type="password"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input-clean py-6 text-base"
                                    data-testid="login-password-input"
                                />
                            </div>
                            <Button
                                type="submit"
                                className="w-full btn-primary py-6 text-lg"
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

                        <div className="mt-6 text-center">
                            <p className="text-sm text-muted-foreground">
                                New here?{' '}
                                <Link 
                                    to="/register" 
                                    className="text-primary hover:underline font-medium"
                                    data-testid="register-link"
                                >
                                    Create account
                                </Link>
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default Login;

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Mail, KeyRound, Check } from 'lucide-react';
import api from '../lib/api';

function ForgotPassword() {
    var stepState = useState('email');
    var step = stepState[0];
    var setStep = stepState[1];

    var emailState = useState('');
    var email = emailState[0];
    var setEmail = emailState[1];

    var tokenState = useState('');
    var token = tokenState[0];
    var setToken = tokenState[1];

    var passwordState = useState('');
    var password = passwordState[0];
    var setPassword = passwordState[1];

    var confirmState = useState('');
    var confirmPassword = confirmState[0];
    var setConfirmPassword = confirmState[1];

    var loadingState = useState(false);
    var loading = loadingState[0];
    var setLoading = loadingState[1];

    function handleRequestReset(e) {
        e.preventDefault();
        if (!email.trim()) {
            toast.error('Please enter your email');
            return;
        }
        setLoading(true);
        api.post('/auth/forgot-password', { email: email.trim() })
            .then(function(res) {
                var data = res.data;
                if (data.reset_token) {
                    setToken(data.reset_token);
                }
                toast.success('If an account exists with that email, a reset link has been sent.');
                setStep('reset');
                setLoading(false);
            })
            .catch(function() {
                toast.success('If an account exists with that email, a reset link has been sent.');
                setStep('reset');
                setLoading(false);
            });
    }

    function handleResetPassword(e) {
        e.preventDefault();
        if (!token.trim()) {
            toast.error('Please enter the reset token');
            return;
        }
        if (!password || password.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }
        if (password !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }
        setLoading(true);
        api.post('/auth/reset-password', { token: token.trim(), password: password })
            .then(function() {
                toast.success('Password reset successfully!');
                setStep('done');
                setLoading(false);
            })
            .catch(function(err) {
                var msg = err.response && err.response.data && err.response.data.detail;
                toast.error(msg || 'Failed to reset password');
                setLoading(false);
            });
    }

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <img src="/logo.png" alt="The Room" className="w-20 h-20 mx-auto mb-4 rounded-2xl" />
                    <h1 className="font-serif text-2xl font-bold">Reset Password</h1>
                </div>

                <Card className="card-organic">
                    <CardContent className="p-6">
                        {step === 'email' && (
                            <form onSubmit={handleRequestReset} className="space-y-4">
                                <div className="text-center mb-4">
                                    <Mail className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                                    <p className="text-sm text-muted-foreground">
                                        Enter your email address and we'll send you a reset link.
                                    </p>
                                </div>
                                <Input
                                    type="email"
                                    placeholder="Email address"
                                    value={email}
                                    onChange={function(e) { setEmail(e.target.value); }}
                                    className="input-clean py-6 text-base"
                                    data-testid="forgot-email-input"
                                />
                                <Button
                                    type="submit"
                                    className="w-full btn-primary py-6"
                                    disabled={loading}
                                    data-testid="forgot-submit-btn"
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Reset Link'}
                                </Button>
                            </form>
                        )}

                        {step === 'reset' && (
                            <form onSubmit={handleResetPassword} className="space-y-4">
                                <div className="text-center mb-4">
                                    <KeyRound className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                                    <p className="text-sm text-muted-foreground">
                                        Paste the reset token from your email and enter your new password.
                                    </p>
                                </div>
                                <Input
                                    type="text"
                                    placeholder="Reset token"
                                    value={token}
                                    onChange={function(e) { setToken(e.target.value); }}
                                    className="input-clean py-6 text-base font-mono text-xs"
                                    data-testid="reset-token-input"
                                />
                                <Input
                                    type="password"
                                    placeholder="New password"
                                    value={password}
                                    onChange={function(e) { setPassword(e.target.value); }}
                                    className="input-clean py-6 text-base"
                                    data-testid="reset-password-input"
                                />
                                <Input
                                    type="password"
                                    placeholder="Confirm new password"
                                    value={confirmPassword}
                                    onChange={function(e) { setConfirmPassword(e.target.value); }}
                                    className="input-clean py-6 text-base"
                                    data-testid="reset-confirm-input"
                                />
                                <Button
                                    type="submit"
                                    className="w-full btn-primary py-6"
                                    disabled={loading}
                                    data-testid="reset-submit-btn"
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Reset Password'}
                                </Button>
                            </form>
                        )}

                        {step === 'done' && (
                            <div className="text-center space-y-4">
                                <Check className="w-12 h-12 mx-auto text-green-600" />
                                <h2 className="text-lg font-semibold">Password Reset!</h2>
                                <p className="text-sm text-muted-foreground">
                                    Your password has been updated. You can now sign in with your new password.
                                </p>
                                <Link to="/login">
                                    <Button className="w-full btn-primary py-6 mt-4" data-testid="back-to-login-btn">
                                        Back to Sign In
                                    </Button>
                                </Link>
                            </div>
                        )}

                        {step !== 'done' && (
                            <div className="mt-4 text-center">
                                <Link
                                    to="/login"
                                    className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1"
                                    data-testid="back-to-login-link"
                                >
                                    <ArrowLeft className="w-3 h-3" />
                                    Back to Sign In
                                </Link>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default ForgotPassword;

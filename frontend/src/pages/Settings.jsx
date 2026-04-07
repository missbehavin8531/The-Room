import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import NotificationSettings from '../components/NotificationSettings';
import ThemeToggle from '../components/ThemeToggle';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useAuth } from '../context/AuthContext';
import { profileAPI, groupsAPI, zoomAPI } from '../lib/api';
import { toast } from 'sonner';
import { Settings as SettingsIcon, User, KeyRound, Loader2, Users, Video, ExternalLink, CheckCircle, XCircle } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

function Settings() {
    var auth = useAuth();
    var currentUser = auth.user;
    var refreshUser = auth.refreshUser;
    var isTeacherOrAdmin = auth.isTeacherOrAdmin;
    var isGuest = currentUser?.role === 'guest';

    var [searchParams, setSearchParams] = useSearchParams();

    var [name, setName] = useState(currentUser ? currentUser.name : '');
    var [savingName, setSavingName] = useState(false);

    var [currentPw, setCurrentPw] = useState('');
    var [newPw, setNewPw] = useState('');
    var [confirmPw, setConfirmPw] = useState('');
    var [savingPw, setSavingPw] = useState(false);

    var [joinCode, setJoinCode] = useState('');
    var [joiningGroup, setJoiningGroup] = useState(false);

    // Zoom state
    var [zoomStatus, setZoomStatus] = useState(null);
    var [zoomLoading, setZoomLoading] = useState(false);
    var [zoomConnecting, setZoomConnecting] = useState(false);

    // Handle Zoom callback params
    useEffect(function() {
        var zoomResult = searchParams.get('zoom');
        if (zoomResult === 'connected') {
            toast.success('Zoom account connected successfully!');
            setSearchParams({});
            fetchZoomStatus();
        } else if (zoomResult === 'error') {
            toast.error('Failed to connect Zoom account. Please try again.');
            setSearchParams({});
        }
    }, []);

    // Fetch Zoom status on mount
    useEffect(function() {
        if (isTeacherOrAdmin) {
            fetchZoomStatus();
        }
    }, [isTeacherOrAdmin]);

    function fetchZoomStatus() {
        setZoomLoading(true);
        zoomAPI.getStatus()
            .then(function(res) {
                setZoomStatus(res.data);
                setZoomLoading(false);
            })
            .catch(function() {
                setZoomLoading(false);
            });
    }

    function handleZoomConnect() {
        setZoomConnecting(true);
        zoomAPI.connect()
            .then(function(res) {
                if (res.data.authorization_url) {
                    window.location.href = res.data.authorization_url;
                }
            })
            .catch(function(err) {
                var msg = err.response && err.response.data && err.response.data.detail;
                toast.error(msg || 'Failed to start Zoom connection');
                setZoomConnecting(false);
            });
    }

    function handleZoomDisconnect() {
        zoomAPI.disconnect()
            .then(function() {
                toast.success('Zoom account disconnected');
                setZoomStatus({ configured: true, connected: false });
            })
            .catch(function() {
                toast.error('Failed to disconnect Zoom');
            });
    }

    function handleNameSave(e) {
        e.preventDefault();
        if (!name.trim()) {
            toast.error('Name cannot be empty');
            return;
        }
        setSavingName(true);
        profileAPI.updateName(name.trim())
            .then(function() {
                toast.success('Name updated successfully');
                setSavingName(false);
            })
            .catch(function(err) {
                var msg = err.response && err.response.data && err.response.data.detail;
                toast.error(msg || 'Failed to update name');
                setSavingName(false);
            });
    }

    function handlePasswordChange(e) {
        e.preventDefault();
        if (!currentPw || !newPw) {
            toast.error('Please fill in all password fields');
            return;
        }
        if (newPw.length < 6) {
            toast.error('New password must be at least 6 characters');
            return;
        }
        if (newPw !== confirmPw) {
            toast.error('New passwords do not match');
            return;
        }
        setSavingPw(true);
        profileAPI.changePassword(currentPw, newPw)
            .then(function() {
                toast.success('Password changed successfully');
                setCurrentPw('');
                setNewPw('');
                setConfirmPw('');
                setSavingPw(false);
            })
            .catch(function(err) {
                var msg = err.response && err.response.data && err.response.data.detail;
                toast.error(msg || 'Failed to change password');
                setSavingPw(false);
            });
    }

    function handleJoinGroup(e) {
        e.preventDefault();
        if (!joinCode.trim()) {
            toast.error('Please enter an invite code');
            return;
        }
        setJoiningGroup(true);
        groupsAPI.join(joinCode.trim().toUpperCase())
            .then(function(res) {
                toast.success(res.data.message || 'Joined group!');
                setJoinCode('');
                setJoiningGroup(false);
                if (refreshUser) refreshUser();
            })
            .catch(function(err) {
                var msg = err.response && err.response.data && err.response.data.detail;
                toast.error(msg || 'Failed to join group');
                setJoiningGroup(false);
            });
    }

    return (
        <Layout>
            <div className="max-w-2xl mx-auto space-y-6" data-testid="settings-page">
                <h1 className="text-3xl font-serif font-bold flex items-center gap-3">
                    <SettingsIcon className="w-8 h-8" />
                    Settings
                </h1>

                {/* Theme toggle — available to everyone including guests */}
                <ThemeToggle />

                {/* Everything below is hidden for guests */}
                {isGuest ? (
                    <Card>
                        <CardContent className="p-6 text-center">
                            <p className="text-sm text-muted-foreground mb-2">Sign up to access full settings</p>
                            <a href="/" className="text-sm text-primary font-semibold hover:underline">Sign up free</a>
                        </CardContent>
                    </Card>
                ) : (
                <>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <User className="w-5 h-5" />
                            Display Name
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleNameSave} className="flex gap-2">
                            <Input
                                value={name}
                                onChange={function(e) { setName(e.target.value); }}
                                placeholder="Your name"
                                className="flex-1"
                                data-testid="settings-name-input"
                            />
                            <Button type="submit" disabled={savingName} data-testid="settings-name-save-btn">
                                {savingName ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <KeyRound className="w-5 h-5" />
                            Change Password
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handlePasswordChange} className="space-y-3">
                            <Input
                                type="password"
                                value={currentPw}
                                onChange={function(e) { setCurrentPw(e.target.value); }}
                                placeholder="Current password"
                                data-testid="settings-current-pw-input"
                            />
                            <Input
                                type="password"
                                value={newPw}
                                onChange={function(e) { setNewPw(e.target.value); }}
                                placeholder="New password"
                                data-testid="settings-new-pw-input"
                            />
                            <Input
                                type="password"
                                value={confirmPw}
                                onChange={function(e) { setConfirmPw(e.target.value); }}
                                placeholder="Confirm new password"
                                data-testid="settings-confirm-pw-input"
                            />
                            <Button type="submit" disabled={savingPw} data-testid="settings-change-pw-btn">
                                {savingPw ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Change Password'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Users className="w-5 h-5" />
                            Join Another Group
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-3">
                            Have an invite code? Enter it below to join another group.
                        </p>
                        <form onSubmit={handleJoinGroup} className="flex gap-2">
                            <Input
                                value={joinCode}
                                onChange={function(e) { setJoinCode(e.target.value.toUpperCase()); }}
                                placeholder="Enter invite code"
                                className="flex-1 font-mono tracking-widest uppercase"
                                data-testid="settings-join-code-input"
                            />
                            <Button type="submit" disabled={joiningGroup} data-testid="settings-join-group-btn">
                                {joiningGroup ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Join'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Zoom Integration — Teacher/Admin only */}
                {isTeacherOrAdmin && (
                    <Card data-testid="zoom-integration-card">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Video className="w-5 h-5" />
                                Zoom Integration
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {zoomLoading ? (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Checking Zoom status...
                                </div>
                            ) : zoomStatus?.connected ? (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                                        <div className="flex-grow">
                                            <p className="font-medium text-green-700 dark:text-green-300">Zoom Connected</p>
                                            {zoomStatus.zoom_email && (
                                                <p className="text-sm text-green-600 dark:text-green-400">{zoomStatus.zoom_email}</p>
                                            )}
                                        </div>
                                        <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                            Active
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Zoom cloud recordings will be automatically imported into your most recent lesson when a meeting ends.
                                    </p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleZoomDisconnect}
                                        className="text-destructive"
                                        data-testid="zoom-disconnect-btn"
                                    >
                                        <XCircle className="w-4 h-4 mr-1" />
                                        Disconnect Zoom
                                    </Button>
                                </div>
                            ) : zoomStatus?.configured === false ? (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                                        <Video className="w-5 h-5 text-amber-600" />
                                        <div>
                                            <p className="font-medium text-amber-700 dark:text-amber-300">Not Configured</p>
                                            <p className="text-sm text-amber-600 dark:text-amber-400">
                                                Zoom integration credentials haven't been set up by the platform admin yet.
                                            </p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Once configured, you'll be able to connect your Zoom account and have recordings auto-imported.
                                        You can still manually upload recordings from the lesson page.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <p className="text-sm text-muted-foreground">
                                        Connect your Zoom account to automatically import cloud recordings into your lessons.
                                        When a Zoom meeting ends, the recording will appear in your most recent lesson's "Watch Replay" tab.
                                    </p>
                                    <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
                                        <ExternalLink className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                        <span className="text-blue-700 dark:text-blue-300">
                                            You'll be redirected to Zoom to authorize access to your recordings.
                                        </span>
                                    </div>
                                    <Button
                                        onClick={handleZoomConnect}
                                        disabled={zoomConnecting}
                                        className="btn-primary"
                                        data-testid="zoom-connect-btn"
                                    >
                                        {zoomConnecting ? (
                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        ) : (
                                            <Video className="w-4 h-4 mr-2" />
                                        )}
                                        Connect Zoom Account
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                )}

                <ThemeToggle />
                <NotificationSettings />
                </>
                )}
            </div>
        </Layout>
    );
}

export default Settings;

import React, { useState } from 'react';
import { Layout } from '../components/Layout';
import NotificationSettings from '../components/NotificationSettings';
import ThemeToggle from '../components/ThemeToggle';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import { profileAPI } from '../lib/api';
import { toast } from 'sonner';
import { Settings as SettingsIcon, User, KeyRound, Loader2 } from 'lucide-react';

function Settings() {
    var auth = useAuth();
    var currentUser = auth.user;

    var nameState = useState(currentUser ? currentUser.name : '');
    var name = nameState[0];
    var setName = nameState[1];
    var nameLoading = useState(false);
    var savingName = nameLoading[0];
    var setSavingName = nameLoading[1];

    var curPwState = useState('');
    var currentPw = curPwState[0];
    var setCurrentPw = curPwState[1];
    var newPwState = useState('');
    var newPw = newPwState[0];
    var setNewPw = newPwState[1];
    var confirmPwState = useState('');
    var confirmPw = confirmPwState[0];
    var setConfirmPw = confirmPwState[1];
    var pwLoading = useState(false);
    var savingPw = pwLoading[0];
    var setSavingPw = pwLoading[1];

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

    return (
        <Layout>
            <div className="max-w-2xl mx-auto space-y-6" data-testid="settings-page">
                <h1 className="text-3xl font-serif font-bold flex items-center gap-3">
                    <SettingsIcon className="w-8 h-8" />
                    Settings
                </h1>

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

                <ThemeToggle />
                <NotificationSettings />
            </div>
        </Layout>
    );
}

export default Settings;

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { pushService } from '../lib/pushService';
import api from '../lib/api';
import { toast } from 'sonner';
import { Bell, BellOff, Clock, BookOpen, Loader2 } from 'lucide-react';

function NotificationSettings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [pushSupported, setPushSupported] = useState(false);
    const [pushEnabled, setPushEnabled] = useState(false);
    const [pushPermission, setPushPermission] = useState('default');
    const [readingReminder, setReadingReminder] = useState({
        enabled: false,
        reminder_time: '08:00'
    });

    useEffect(() => {
        initializeSettings();
    }, []);

    const initializeSettings = async () => {
        try {
            // Initialize push service
            const supported = await pushService.init();
            setPushSupported(supported);
            
            if (supported) {
                const subscribed = await pushService.isSubscribed();
                setPushEnabled(subscribed);
                const permission = await pushService.getPermissionState();
                setPushPermission(permission);
            }

            // Load reading reminder settings
            const res = await api.get('/reading-reminders/settings');
            setReadingReminder(res.data);
        } catch (error) {
            console.error('Failed to load settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePushToggle = async (enabled) => {
        setSaving(true);
        try {
            if (enabled) {
                await pushService.subscribe();
                setPushEnabled(true);
                toast.success('Push notifications enabled');
            } else {
                await pushService.unsubscribe();
                setPushEnabled(false);
                toast.success('Push notifications disabled');
            }
            setPushPermission(await pushService.getPermissionState());
        } catch (error) {
            toast.error(error.message || 'Failed to update push settings');
        } finally {
            setSaving(false);
        }
    };

    const handleReadingReminderToggle = async (enabled) => {
        setSaving(true);
        try {
            const newSettings = { ...readingReminder, enabled };
            await api.put('/reading-reminders/settings', newSettings);
            setReadingReminder(newSettings);
            toast.success(enabled ? 'Reading reminders enabled' : 'Reading reminders disabled');
        } catch (error) {
            toast.error('Failed to update settings');
        } finally {
            setSaving(false);
        }
    };

    const handleTimeChange = async (time) => {
        setReadingReminder(prev => ({ ...prev, reminder_time: time }));
    };

    const saveReminderTime = async () => {
        setSaving(true);
        try {
            await api.put('/reading-reminders/settings', readingReminder);
            toast.success('Reminder time updated');
        } catch (error) {
            toast.error('Failed to update reminder time');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="p-6 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6" data-testid="notification-settings">
            {/* Push Notifications */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bell className="w-5 h-5" />
                        Push Notifications
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {!pushSupported ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <BellOff className="w-4 h-4" />
                            <span>Push notifications are not supported in this browser</span>
                        </div>
                    ) : pushPermission === 'denied' ? (
                        <div className="flex items-center gap-2 text-destructive">
                            <BellOff className="w-4 h-4" />
                            <span>Notifications are blocked. Please enable them in your browser settings.</span>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <Label htmlFor="push-toggle">Enable push notifications</Label>
                                <p className="text-sm text-muted-foreground">
                                    Receive notifications for mentions, feedback, and reminders
                                </p>
                            </div>
                            <Switch
                                id="push-toggle"
                                checked={pushEnabled}
                                onCheckedChange={handlePushToggle}
                                disabled={saving}
                                data-testid="push-toggle"
                            />
                        </div>
                    )}
                    
                    {pushEnabled && (
                        <Badge variant="secondary" className="mt-2">
                            <Bell className="w-3 h-3 mr-1" />
                            Notifications active
                        </Badge>
                    )}
                </CardContent>
            </Card>

            {/* Reading Reminders */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5" />
                        Daily Reading Reminders
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <Label htmlFor="reading-toggle">Enable daily reminders</Label>
                            <p className="text-sm text-muted-foreground">
                                Get a daily reminder for your scripture reading
                            </p>
                        </div>
                        <Switch
                            id="reading-toggle"
                            checked={readingReminder.enabled}
                            onCheckedChange={handleReadingReminderToggle}
                            disabled={saving}
                            data-testid="reading-reminder-toggle"
                        />
                    </div>

                    {readingReminder.enabled && (
                        <div className="flex items-center gap-3 pt-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <Label htmlFor="reminder-time" className="text-sm">Reminder time:</Label>
                            <Input
                                id="reminder-time"
                                type="time"
                                value={readingReminder.reminder_time}
                                onChange={(e) => handleTimeChange(e.target.value)}
                                className="w-32"
                                data-testid="reminder-time-input"
                            />
                            <Button 
                                variant="outline" 
                                size="sm"
                                onClick={saveReminderTime}
                                disabled={saving}
                            >
                                Save
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default NotificationSettings;

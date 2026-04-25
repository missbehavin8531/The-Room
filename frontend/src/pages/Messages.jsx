import React, { useEffect, useState } from 'react';
import GuestMessagesPage from '../components/GuestMessagesPage';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { ScrollArea } from '../components/ui/scroll-area';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Skeleton } from '../components/ui/skeleton';
import { messagesAPI, usersAPI } from '../lib/api';
import { formatRelativeTime, getInitials, cn } from '../lib/utils';
import { toast } from 'sonner';
import { 
    Mail, 
    Send, 
    Loader2, 
    User,
    ChevronRight,
    Check,
    Inbox
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '../components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../components/ui/select';
import { Label } from '../components/ui/label';

export const Messages = ({ embedded }) => {
    const { user, isTeacher, isGuest } = useAuth();
    const [messages, setMessages] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedTeacher, setSelectedTeacher] = useState('');
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);

    useEffect(() => {
        if (!isGuest) fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [messagesRes, teachersRes] = await Promise.all([
                messagesAPI.getInbox(),
                usersAPI.getTeachers()
            ]);
            setMessages(messagesRes.data);
            setTeachers(teachersRes.data);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!selectedTeacher || !newMessage.trim()) {
            toast.error('Please select a teacher and write a message');
            return;
        }

        setSending(true);
        try {
            const response = await messagesAPI.send(selectedTeacher, newMessage.trim());
            setMessages([response.data, ...messages]);
            setDialogOpen(false);
            setSelectedTeacher('');
            setNewMessage('');
            toast.success('Message sent!');
        } catch (error) {
            toast.error('Failed to send message');
        } finally {
            setSending(false);
        }
    };

    const handleMarkRead = async (messageId) => {
        try {
            await messagesAPI.markRead(messageId);
            setMessages(messages.map(m => 
                m.id === messageId ? { ...m, is_read: true } : m
            ));
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    };

    // Group messages by thread (sender or teacher)
    const groupedMessages = messages.reduce((acc, message) => {
        const key = isTeacher ? message.sender_id : message.teacher_id;
        const name = isTeacher ? message.sender_name : message.teacher_name;
        if (!acc[key]) {
            acc[key] = { name, messages: [] };
        }
        acc[key].messages.push(message);
        return acc;
    }, {});

    if (isGuest) {
        if (embedded) {
            return (
                <div className="flex flex-col items-center justify-center py-12 text-center" data-testid="guest-messages-embedded">
                    <Inbox className="w-12 h-12 text-muted-foreground/30 mb-4" />
                    <p className="text-sm text-muted-foreground mb-2">Sign up to message teachers</p>
                    <a href="/" className="text-sm text-primary font-semibold hover:underline">Sign up free</a>
                </div>
            );
        }
        return <GuestMessagesPage />;
    }

    if (loading) {
        return (
            <Layout>
                <div className="page-container py-6">
                    <Skeleton className="h-8 w-48 mb-6" />
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <Skeleton key={i} className="h-24 rounded-xl" />
                        ))}
                    </div>
                </div>
            </Layout>
        );
    }

    var messagesContent = (
        <div className={embedded ? "space-y-4 h-full flex flex-col" : "page-container py-6 space-y-6"}>
            {/* Header */}
            <div className={cn("flex flex-col md:flex-row md:items-center justify-between gap-4", embedded && "flex-row items-center")}>
                {!embedded && (
                    <div>
                        <h1 className="text-2xl font-serif font-bold flex items-center gap-2">
                            <Mail className="w-6 h-6 text-primary" />
                            {isTeacher ? 'Inbox' : 'Message Teacher'}
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            {isTeacher 
                                ? 'Messages from members'
                                : 'Private messages to your teachers'
                            }
                        </p>
                    </div>
                )}

                {!isTeacher && (
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className={embedded ? "btn-primary h-8 text-xs" : "btn-primary"} data-testid="new-message-btn">
                                <Send className="w-4 h-4 mr-2" />
                                New Message
                            </Button>
                        </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle className="font-serif">Message a Teacher</DialogTitle>
                                </DialogHeader>
                                <form onSubmit={handleSendMessage} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Select Teacher</Label>
                                        <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                                            <SelectTrigger data-testid="teacher-select">
                                                <SelectValue placeholder="Choose a teacher" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {teachers.map(teacher => (
                                                    <SelectItem key={teacher.id} value={teacher.id}>
                                                        {teacher.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Message</Label>
                                        <Textarea
                                            placeholder="Write your message..."
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            rows={4}
                                            maxLength={2000}
                                            data-testid="message-content-input"
                                        />
                                        {newMessage.length > 1600 && (
                                            <p className={cn("text-xs text-right", newMessage.length >= 2000 ? "text-destructive font-semibold" : "text-muted-foreground")} data-testid="message-char-count">
                                                {newMessage.length}/2000
                                            </p>
                                        )}
                                    </div>
                                    <Button 
                                        type="submit" 
                                        className="w-full btn-primary" 
                                        disabled={sending}
                                        data-testid="send-message-btn"
                                    >
                                        {sending ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Sending...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="w-4 h-4 mr-2" />
                                                Send Message
                                            </>
                                        )}
                                    </Button>
                                </form>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>

                {/* Messages List */}
                {Object.keys(groupedMessages).length > 0 ? (
                    <div className="space-y-4">
                        {Object.entries(groupedMessages).map(([id, thread]) => (
                            <Card key={id} className="card-organic">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center gap-3">
                                        <Avatar>
                                            <AvatarFallback className="bg-primary/10 text-primary">
                                                {getInitials(thread.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <CardTitle className="text-base">{thread.name}</CardTitle>
                                            <p className="text-xs text-muted-foreground">
                                                {thread.messages.length} message{thread.messages.length !== 1 ? 's' : ''}
                                            </p>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {thread.messages.slice(0, 5).map(message => (
                                        <div 
                                            key={message.id}
                                            className={cn(
                                                "p-3 rounded-xl",
                                                !message.is_read && isTeacher ? "bg-primary/5 border border-primary/10" : "bg-muted/30"
                                            )}
                                            onClick={() => isTeacher && !message.is_read && handleMarkRead(message.id)}
                                            data-testid={`message-${message.id}`}
                                        >
                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                <span className="text-xs text-muted-foreground">
                                                    {formatRelativeTime(message.created_at)}
                                                </span>
                                                {message.is_read && (
                                                    <Check className="w-3 h-3 text-primary" />
                                                )}
                                            </div>
                                            <p className="text-sm">{message.content}</p>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <Card className="card-organic p-12 text-center">
                        <Inbox className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No messages yet</h3>
                        <p className="text-muted-foreground">
                            {isTeacher 
                                ? 'You haven\'t received any messages from members yet.'
                                : 'Send a message to your teacher to get started.'
                            }
                        </p>
                    </Card>
                )}
            </div>
    );

    if (embedded) return messagesContent;
    return <Layout>{messagesContent}</Layout>;
};

export default Messages;

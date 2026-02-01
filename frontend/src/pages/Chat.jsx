import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ScrollArea } from '../components/ui/scroll-area';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { chatAPI } from '../lib/api';
import { formatRelativeTime, getInitials, cn } from '../lib/utils';
import { toast } from 'sonner';
import { Send, Loader2, Trash2, Eye, EyeOff, MessageCircle } from 'lucide-react';

export const Chat = () => {
    const { user, isTeacherOrAdmin } = useAuth();
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const scrollRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        fetchMessages();
        // Poll for new messages every 5 seconds
        const interval = setInterval(fetchMessages, 5000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        // Scroll to bottom when messages change
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const fetchMessages = async () => {
        try {
            const response = await chatAPI.getMessages(100);
            setMessages(response.data);
        } catch (error) {
            console.error('Failed to fetch messages:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        setSending(true);
        try {
            const response = await chatAPI.send(newMessage.trim());
            setMessages([...messages, response.data]);
            setNewMessage('');
            inputRef.current?.focus();
        } catch (error) {
            const message = error.response?.data?.detail || 'Failed to send message';
            toast.error(message);
        } finally {
            setSending(false);
        }
    };

    const handleDeleteMessage = async (messageId) => {
        try {
            await chatAPI.delete(messageId);
            setMessages(messages.filter(m => m.id !== messageId));
            toast.success('Message deleted');
        } catch (error) {
            toast.error('Failed to delete message');
        }
    };

    const handleHideMessage = async (messageId, hidden) => {
        try {
            await chatAPI.hide(messageId, hidden);
            setMessages(messages.map(m => 
                m.id === messageId ? { ...m, is_hidden: hidden } : m
            ));
            toast.success(hidden ? 'Message hidden' : 'Message visible');
        } catch (error) {
            toast.error('Failed to update message');
        }
    };

    return (
        <Layout>
            <div className="page-container py-6 h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)] flex flex-col">
                {/* Header */}
                <div className="mb-4">
                    <h1 className="text-2xl font-serif font-bold flex items-center gap-2">
                        <MessageCircle className="w-6 h-6 text-primary" />
                        Community Chat
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Connect with fellow members
                    </p>
                </div>

                {/* Chat Container */}
                <Card className="card-organic flex-grow flex flex-col overflow-hidden">
                    {/* Messages Area */}
                    <ScrollArea className="flex-grow p-4" ref={scrollRef}>
                        {loading ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        ) : messages.length > 0 ? (
                            <div className="space-y-4">
                                {messages.map((message) => {
                                    const isOwn = message.user_id === user?.id;
                                    return (
                                        <div
                                            key={message.id}
                                            className={cn(
                                                "flex gap-3",
                                                isOwn && "flex-row-reverse",
                                                message.is_hidden && "opacity-50"
                                            )}
                                            data-testid={`chat-message-${message.id}`}
                                        >
                                            <Avatar className="w-8 h-8 flex-shrink-0">
                                                <AvatarFallback className={cn(
                                                    "text-xs",
                                                    isOwn ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                                                )}>
                                                    {getInitials(message.user_name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className={cn(
                                                "max-w-[75%]",
                                                isOwn && "text-right"
                                            )}>
                                                <div className="flex items-center gap-2 mb-1">
                                                    {!isOwn && (
                                                        <span className="text-sm font-medium">{message.user_name}</span>
                                                    )}
                                                    <span className="text-xs text-muted-foreground">
                                                        {formatRelativeTime(message.created_at)}
                                                    </span>
                                                    {message.is_hidden && (
                                                        <span className="text-xs bg-muted px-1.5 py-0.5 rounded">Hidden</span>
                                                    )}
                                                </div>
                                                <div className={cn(
                                                    "chat-bubble inline-block text-left",
                                                    isOwn ? "chat-bubble-own" : "chat-bubble-other"
                                                )}>
                                                    <p className="text-sm">{message.content}</p>
                                                </div>
                                                
                                                {/* Moderation actions */}
                                                {isTeacherOrAdmin && (
                                                    <div className={cn(
                                                        "flex gap-1 mt-1",
                                                        isOwn ? "justify-end" : "justify-start"
                                                    )}>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleHideMessage(message.id, !message.is_hidden)}
                                                            className="p-1 h-auto"
                                                        >
                                                            {message.is_hidden ? (
                                                                <Eye className="w-3 h-3" />
                                                            ) : (
                                                                <EyeOff className="w-3 h-3" />
                                                            )}
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleDeleteMessage(message.id)}
                                                            className="p-1 h-auto text-destructive"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center">
                                <MessageCircle className="w-12 h-12 text-muted-foreground/30 mb-4" />
                                <p className="text-muted-foreground">
                                    No messages yet. Start the conversation!
                                </p>
                            </div>
                        )}
                    </ScrollArea>

                    {/* Message Input */}
                    <div className="p-4 border-t border-border">
                        <form onSubmit={handleSendMessage} className="flex gap-3">
                            <Input
                                ref={inputRef}
                                placeholder="Type a message..."
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                className="flex-grow"
                                disabled={sending}
                                data-testid="chat-input"
                            />
                            <Button
                                type="submit"
                                disabled={sending || !newMessage.trim()}
                                className="btn-primary"
                                data-testid="chat-send-btn"
                            >
                                {sending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Send className="w-4 h-4" />
                                )}
                            </Button>
                        </form>
                    </div>
                </Card>
            </div>
        </Layout>
    );
};

export default Chat;

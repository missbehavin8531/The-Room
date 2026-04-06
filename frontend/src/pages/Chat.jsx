import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ScrollArea } from '../components/ui/scroll-area';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { chatAPI } from '../lib/api';
import { formatRelativeTime, getInitials, cn } from '../lib/utils';
import { toast } from 'sonner';
import { Send, Loader2, Trash2, Eye, EyeOff, MessageCircle, Wifi, WifiOff, Users } from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function getWsUrl() {
    const token = localStorage.getItem('token');
    if (!token || !BACKEND_URL) return null;
    const wsBase = BACKEND_URL.replace(/^http/, 'ws');
    return `${wsBase}/api/ws/chat?token=${token}`;
}

export const Chat = () => {
    const { user, isTeacherOrAdmin } = useAuth();
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [typingUsers, setTypingUsers] = useState([]);
    const scrollRef = useRef(null);
    const inputRef = useRef(null);
    const typingTimeout = useRef(null);
    const messagesRef = useRef(messages);

    // Keep messagesRef in sync
    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    const scrollToBottom = useCallback(() => {
        if (scrollRef.current) {
            const el = scrollRef.current;
            // ScrollArea wraps content in a viewport div
            const viewport = el.querySelector('[data-radix-scroll-area-viewport]') || el;
            viewport.scrollTop = viewport.scrollHeight;
        }
    }, []);

    // WebSocket message handler
    const handleWsMessage = useCallback((data) => {
        switch (data.type) {
            case 'new_message':
                setMessages(prev => {
                    // Deduplicate by id
                    if (prev.some(m => m.id === data.message.id)) return prev;
                    return [...prev, data.message];
                });
                setTimeout(scrollToBottom, 50);
                break;

            case 'message_deleted':
                setMessages(prev => prev.filter(m => m.id !== data.message_id));
                break;

            case 'message_hidden':
                setMessages(prev =>
                    prev.map(m =>
                        m.id === data.message_id ? { ...m, is_hidden: data.hidden } : m
                    )
                );
                break;

            case 'typing': {
                const name = data.user_name;
                setTypingUsers(prev => {
                    if (prev.includes(name)) return prev;
                    return [...prev, name];
                });
                // Clear typing indicator after 3s
                setTimeout(() => {
                    setTypingUsers(prev => prev.filter(n => n !== name));
                }, 3000);
                break;
            }

            case 'error':
                toast.error(data.message);
                break;

            default:
                break;
        }
    }, [scrollToBottom]);

    const wsUrl = getWsUrl();
    const { status: wsStatus, onlineCount, send: wsSend } = useWebSocket(wsUrl, {
        onMessage: handleWsMessage,
        enabled: !!wsUrl,
    });

    const isConnected = wsStatus === 'connected';

    // Fetch initial messages via REST
    useEffect(() => {
        fetchMessages();
    }, []);

    // Fallback polling only when WS is disconnected
    useEffect(() => {
        if (isConnected) return;
        const interval = setInterval(fetchMessages, 6000);
        return () => clearInterval(interval);
    }, [isConnected]);

    // Scroll to bottom on initial load
    useEffect(() => {
        if (!loading) {
            setTimeout(scrollToBottom, 100);
        }
    }, [loading, scrollToBottom]);

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

        const content = newMessage.trim();

        // Try WebSocket first
        if (isConnected) {
            const sent = wsSend({ type: 'message', content });
            if (sent) {
                setNewMessage('');
                inputRef.current?.focus();
                return;
            }
        }

        // Fallback to REST
        setSending(true);
        try {
            const response = await chatAPI.send(content);
            setMessages(prev => {
                if (prev.some(m => m.id === response.data.id)) return prev;
                return [...prev, response.data];
            });
            setNewMessage('');
            inputRef.current?.focus();
            setTimeout(scrollToBottom, 50);
        } catch (error) {
            const message = error.response?.data?.detail || 'Failed to send message';
            toast.error(message);
        } finally {
            setSending(false);
        }
    };

    const handleDeleteMessage = async (messageId) => {
        if (isConnected) {
            wsSend({ type: 'delete', message_id: messageId });
            return;
        }
        try {
            await chatAPI.delete(messageId);
            setMessages(messages.filter(m => m.id !== messageId));
            toast.success('Message deleted');
        } catch (error) {
            toast.error('Failed to delete message');
        }
    };

    const handleHideMessage = async (messageId, hidden) => {
        if (isConnected) {
            wsSend({ type: 'hide', message_id: messageId, hidden });
            return;
        }
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

    // Send typing indicator
    const handleInputChange = (e) => {
        setNewMessage(e.target.value);
        if (isConnected && e.target.value.trim()) {
            if (!typingTimeout.current) {
                wsSend({ type: 'typing' });
                typingTimeout.current = setTimeout(() => {
                    typingTimeout.current = null;
                }, 2000);
            }
        }
    };

    return (
        <Layout>
            <div className="page-container py-6 h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)] flex flex-col">
                {/* Header */}
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-serif font-bold flex items-center gap-2">
                            <MessageCircle className="w-6 h-6 text-primary" />
                            Community Chat
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            Connect with fellow members
                        </p>
                    </div>
                    <div className="flex items-center gap-2" data-testid="chat-status">
                        {onlineCount > 0 && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full" data-testid="online-count">
                                <Users className="w-3 h-3" />
                                {onlineCount}
                            </span>
                        )}
                        <span
                            className={cn(
                                "flex items-center gap-1 text-xs px-2 py-1 rounded-full",
                                isConnected
                                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                            )}
                            data-testid="ws-status"
                        >
                            {isConnected ? (
                                <><Wifi className="w-3 h-3" /> Live</>
                            ) : (
                                <><WifiOff className="w-3 h-3" /> Polling</>
                            )}
                        </span>
                    </div>
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
                                                            data-testid={`hide-msg-${message.id}`}
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
                                                            data-testid={`delete-msg-${message.id}`}
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

                    {/* Typing Indicator */}
                    {typingUsers.length > 0 && (
                        <div className="px-4 py-1 text-xs text-muted-foreground italic" data-testid="typing-indicator">
                            {typingUsers.length === 1
                                ? `${typingUsers[0]} is typing...`
                                : `${typingUsers.join(', ')} are typing...`
                            }
                        </div>
                    )}

                    {/* Message Input */}
                    <div className="p-4 border-t border-border">
                        <form onSubmit={handleSendMessage} className="flex gap-3">
                            <Input
                                ref={inputRef}
                                placeholder="Type a message..."
                                value={newMessage}
                                onChange={handleInputChange}
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

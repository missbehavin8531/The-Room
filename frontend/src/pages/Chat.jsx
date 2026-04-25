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
import { Send, Loader2, Trash2, Eye, EyeOff, MessageCircle, Wifi, WifiOff, Users, SmilePlus } from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';
import { ChatReactions, ChatActionBar, ReadReceipts } from '../components/ChatWidgets';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function getWsUrl() {
    const token = localStorage.getItem('token');
    if (!token || !BACKEND_URL) return null;
    const wsBase = BACKEND_URL.replace(/^http/, 'ws');
    return `${wsBase}/api/ws/chat?token=${token}`;
}

export const Chat = ({ embedded }) => {
    const { user, isTeacherOrAdmin, isGuest } = useAuth();
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [typingUsers, setTypingUsers] = useState([]);
    const [readReceipts, setReadReceipts] = useState([]);
    const [reactionPickerFor, setReactionPickerFor] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [editContent, setEditContent] = useState('');
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
            // Mark chat as read + fetch read receipts
            if (!isGuest) chatAPI.markRead().catch(() => {});
            chatAPI.getReadReceipts().then(r => setReadReceipts(r.data)).catch(() => {});
        } catch (error) {
            console.error('Failed to fetch messages:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleReaction = async (messageId, emoji) => {
        // Optimistic: toggle reaction immediately
        setMessages(prev => prev.map(m => {
            if (m.id !== messageId) return m;
            const reactions = [...(m.reactions || [])];
            const idx = reactions.findIndex(r => r.emoji === emoji);
            if (idx >= 0) {
                if (reactions[idx].user_reacted) {
                    reactions[idx] = { ...reactions[idx], count: reactions[idx].count - 1, user_reacted: false };
                    if (reactions[idx].count <= 0) reactions.splice(idx, 1);
                } else {
                    reactions[idx] = { ...reactions[idx], count: reactions[idx].count + 1, user_reacted: true };
                }
            } else {
                reactions.push({ emoji, count: 1, users: [user?.name], user_reacted: true });
            }
            return { ...m, reactions };
        }));
        setReactionPickerFor(null);
        try {
            await chatAPI.react(messageId, emoji);
        } catch (error) {
            // Refresh on failure to get correct state
            fetchMessages();
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

        // Fallback to REST — with optimistic UI
        const tempId = `temp-${Date.now()}`;
        const optimisticMsg = {
            id: tempId,
            user_id: user?.id,
            user_name: user?.name || 'You',
            content,
            created_at: new Date().toISOString(),
            _sending: true,
        };
        setMessages(prev => [...prev, optimisticMsg]);
        setNewMessage('');
        inputRef.current?.focus();
        setTimeout(scrollToBottom, 50);

        setSending(true);
        try {
            const response = await chatAPI.send(content);
            setMessages(prev => prev.map(m => m.id === tempId ? { ...response.data, _sending: false } : m));
        } catch (error) {
            // Remove the optimistic message on failure
            setMessages(prev => prev.filter(m => m.id !== tempId));
            const message = error.response?.data?.detail || 'Failed to send message';
            toast.error(message);
        } finally {
            setSending(false);
        }
    };

    const handleDeleteMessage = async (messageId) => {
        // Optimistic: remove immediately
        const prevMessages = messages;
        setMessages(prev => prev.filter(m => m.id !== messageId));

        if (isConnected) {
            wsSend({ type: 'delete', message_id: messageId });
            return;
        }
        try {
            await chatAPI.delete(messageId);
            toast.success('Message deleted');
        } catch (error) {
            // Revert on failure
            setMessages(prevMessages);
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

    const startEditing = (message) => {
        setEditingId(message.id);
        setEditContent(message.content);
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditContent('');
    };

    const handleEditMessage = async () => {
        if (!editContent.trim() || !editingId) return;
        const prevContent = messages.find(m => m.id === editingId)?.content;
        // Optimistic
        setMessages(prev => prev.map(m =>
            m.id === editingId ? { ...m, content: editContent.trim(), is_edited: true } : m
        ));
        setEditingId(null);
        setEditContent('');
        try {
            await chatAPI.edit(editingId, editContent.trim());
        } catch (error) {
            // Revert
            setMessages(prev => prev.map(m =>
                m.id === editingId ? { ...m, content: prevContent, is_edited: m.is_edited } : m
            ));
            toast.error(error.response?.data?.detail || 'Failed to edit message');
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

    var chatContent = (
        <div className={embedded ? "flex flex-col h-full" : "page-container py-6 h-[calc(100vh-10rem)] md:h-[calc(100vh-6rem)] flex flex-col"}>
            {/* Header — hidden when embedded in Connect */}
            {!embedded && (
                <div className="mb-3 flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold" style={{ fontFamily: "'Fraunces', serif" }}>
                            Community
                        </h1>
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
            )}

                {/* Chat Container */}
                <Card className="card-organic flex-grow flex flex-col overflow-hidden">
                    {/* Messages Area */}
                    <ScrollArea className="flex-grow p-4" ref={scrollRef}>
                        {loading ? (
                            <div className="space-y-4 p-2">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className={cn("flex gap-2.5 animate-pulse", i % 3 === 0 && "flex-row-reverse")} style={{ animationDelay: `${i * 80}ms` }}>
                                        {i % 3 !== 0 && <div className="w-7 h-7 rounded-full bg-muted flex-shrink-0 mt-3" />}
                                        <div className={cn("max-w-[65%] space-y-1.5", i % 3 === 0 && "ml-auto")}>
                                            {i % 3 !== 0 && <div className="h-3 w-16 bg-muted rounded" />}
                                            <div className={cn("rounded-2xl p-3 space-y-1.5", i % 3 === 0 ? "bg-primary/10" : "bg-muted")}>
                                                <div className="h-3 w-full bg-muted-foreground/10 rounded" style={{ width: `${60 + (i * 17) % 40}%` }} />
                                                {i % 2 === 0 && <div className="h-3 w-2/3 bg-muted-foreground/10 rounded" />}
                                            </div>
                                            <div className="h-2 w-10 bg-muted rounded" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : messages.length > 0 ? (
                            <div className="space-y-3">
                                {messages.map((message) => {
                                    const isOwn = message.user_id === user?.id;
                                    return (
                                        <div
                                            key={message.id}
                                            className={cn(
                                                "group/msg flex gap-2.5",
                                                isOwn && "flex-row-reverse",
                                                message.is_hidden && "opacity-40"
                                            )}
                                            data-testid={`chat-message-${message.id}`}
                                        >
                                            {!isOwn && (
                                                <Avatar className="w-7 h-7 flex-shrink-0 mt-5">
                                                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                                        {getInitials(message.user_name)}
                                                    </AvatarFallback>
                                                </Avatar>
                                            )}
                                            <div className={cn("max-w-[78%]", isOwn && "text-right")}>
                                                <div className={cn("flex items-center gap-2 mb-0.5", isOwn && "justify-end")}>
                                                    {!isOwn && (
                                                        <span className="text-xs font-semibold">{message.user_name}</span>
                                                    )}
                                                    <span className="text-[11px] text-muted-foreground">
                                                        {formatRelativeTime(message.created_at)}
                                                    </span>
                                                </div>
                                                <div className={cn(
                                                    "chat-bubble inline-block text-left",
                                                    isOwn ? "chat-bubble-own" : "chat-bubble-other",
                                                    message._sending && "opacity-60"
                                                )}>
                                                    {editingId === message.id ? (
                                                        <div className="flex items-center gap-1.5 min-w-[180px]">
                                                            <input
                                                                type="text"
                                                                value={editContent}
                                                                onChange={(e) => setEditContent(e.target.value)}
                                                                onKeyDown={(e) => { if (e.key === 'Enter') handleEditMessage(); if (e.key === 'Escape') cancelEditing(); }}
                                                                className="flex-1 bg-transparent text-sm border-none outline-none p-0"
                                                                autoFocus
                                                                data-testid="edit-message-input"
                                                            />
                                                            <button onClick={handleEditMessage} className="text-xs text-primary font-medium hover:underline whitespace-nowrap" data-testid="edit-message-save">Save</button>
                                                            <button onClick={cancelEditing} className="text-xs text-muted-foreground hover:underline">Cancel</button>
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm leading-relaxed">
                                                            {message.content}
                                                            {message.is_edited && <span className="text-[10px] text-muted-foreground ml-1.5 italic">(edited)</span>}
                                                        </p>
                                                    )}
                                                </div>
                                                {message._sending && (
                                                    <p className="text-[10px] text-muted-foreground mt-0.5 italic">Sending...</p>
                                                )}

                                                {/* Reactions */}
                                                <ChatReactions
                                                    reactions={message.reactions}
                                                    messageId={message.id}
                                                    isOwn={isOwn}
                                                    isGuest={isGuest}
                                                    onReact={handleReaction}
                                                />

                                                {/* Action bar: react + moderation + edit */}
                                                <ChatActionBar
                                                    messageId={message.id}
                                                    isOwn={isOwn}
                                                    isGuest={isGuest}
                                                    isSending={message._sending}
                                                    isTeacherOrAdmin={isTeacherOrAdmin}
                                                    isHidden={message.is_hidden}
                                                    pickerOpen={reactionPickerFor === message.id}
                                                    onTogglePicker={() => setReactionPickerFor(reactionPickerFor === message.id ? null : message.id)}
                                                    onReact={handleReaction}
                                                    onHide={handleHideMessage}
                                                    onDelete={handleDeleteMessage}
                                                    onEdit={() => startEditing(message)}
                                                />
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

                    {/* Read Receipts */}
                    <ReadReceipts receipts={readReceipts} currentUserId={user?.id} />

                    {/* Typing Indicator */}
                    {typingUsers.length > 0 && (
                        <div className="px-4 py-1 text-xs text-muted-foreground italic" data-testid="typing-indicator">
                            {typingUsers.length === 1
                                ? `${typingUsers[0]} is typing...`
                                : `${typingUsers.join(', ')} are typing...`
                            }
                        </div>
                    )}

                    {/* Message Input — hidden for guests */}
                    {isGuest ? (
                        <div className="p-4 border-t border-border text-center" data-testid="guest-chat-cta">
                            <p className="text-sm text-muted-foreground mb-2">Sign up to join the conversation</p>
                            <a href="/" className="text-sm text-primary font-semibold hover:underline">Sign up free</a>
                        </div>
                    ) : (
                    <div className="p-3 border-t border-border">
                        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                            <div className="flex-grow relative">
                                <Input
                                    ref={inputRef}
                                    placeholder="Message..."
                                    value={newMessage}
                                    onChange={handleInputChange}
                                    className="!rounded-full !pr-10 !py-5 text-sm"
                                    disabled={sending}
                                    data-testid="chat-input"
                                />
                                <Button
                                    type="submit"
                                    disabled={sending || !newMessage.trim()}
                                    className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 p-0 rounded-full btn-primary"
                                    data-testid="chat-send-btn"
                                >
                                    {sending ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Send className="w-4 h-4" />
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>
                    )}
                </Card>
            </div>
    );

    if (embedded) return chatContent;
    return <Layout>{chatContent}</Layout>;
};

export default Chat;

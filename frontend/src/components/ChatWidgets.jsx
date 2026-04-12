import React from 'react';
import { cn } from '../lib/utils';
import { SmilePlus, Eye, EyeOff, Trash2, Pencil } from 'lucide-react';

var REACTION_EMOJIS = ['👍', '❤️', '😂', '🙏', '🔥', '👏'];

export function ChatReactions({ reactions, messageId, isOwn, isGuest, onReact }) {
    if (!reactions || reactions.length === 0) return null;
    return (
        <div className={cn("flex flex-wrap gap-1 mt-1", isOwn && "justify-end")}>
            {reactions.map(function(r) {
                return (
                    <button
                        key={r.emoji}
                        onClick={function() { if (!isGuest) onReact(messageId, r.emoji); }}
                        className={cn(
                            "inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full border transition-all",
                            r.user_reacted
                                ? "bg-primary/10 border-primary/30 text-primary"
                                : "bg-muted/50 border-border hover:bg-muted"
                        )}
                        title={r.users ? r.users.join(', ') : ''}
                        data-testid={"reaction-" + messageId + "-" + r.emoji}
                    >
                        <span>{r.emoji}</span>
                        <span className="text-[10px] font-medium">{r.count}</span>
                    </button>
                );
            })}
        </div>
    );
}

export function ChatActionBar({ messageId, isOwn, isGuest, isSending, isTeacherOrAdmin, isHidden, pickerOpen, onTogglePicker, onReact, onHide, onDelete, onEdit }) {
    return (
        <div className={cn(
            "flex items-center gap-0.5 mt-0.5 opacity-0 group-hover/msg:opacity-100 transition-opacity",
            isOwn ? "justify-end" : "justify-start"
        )}>
            {/* Edit button — only for own messages */}
            {isOwn && !isGuest && !isSending && onEdit && (
                <button
                    onClick={onEdit}
                    className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
                    data-testid={"edit-msg-" + messageId}
                >
                    <Pencil className="w-3 h-3" />
                </button>
            )}
            {!isGuest && !isSending && (
                <div className="relative">
                    <button
                        onClick={onTogglePicker}
                        className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
                        data-testid={"react-btn-" + messageId}
                    >
                        <SmilePlus className="w-3 h-3" />
                    </button>
                    {pickerOpen && (
                        <div className={cn(
                            "absolute z-50 bottom-full mb-1 flex gap-0.5 p-1 rounded-xl bg-background border shadow-lg animate-scale-in",
                            isOwn ? "right-0" : "left-0"
                        )} data-testid={"reaction-picker-" + messageId}>
                            {REACTION_EMOJIS.map(function(emoji) {
                                return (
                                    <button
                                        key={emoji}
                                        onClick={function() { onReact(messageId, emoji); }}
                                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-sm"
                                        data-testid={"pick-reaction-" + emoji}
                                    >
                                        {emoji}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
            {isTeacherOrAdmin && (
                <>
                    <button
                        onClick={function() { onHide(messageId, !isHidden); }}
                        className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
                        data-testid={"hide-msg-" + messageId}
                    >
                        {isHidden ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    </button>
                    <button
                        onClick={function() { onDelete(messageId); }}
                        className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        data-testid={"delete-msg-" + messageId}
                    >
                        <Trash2 className="w-3 h-3" />
                    </button>
                </>
            )}
        </div>
    );
}

export function ReadReceipts({ receipts, currentUserId }) {
    if (!receipts || receipts.length === 0) return null;
    var others = receipts.filter(function(r) { return r.user_id !== currentUserId; });
    if (others.length === 0) return null;
    var names = others.slice(0, 5).map(function(r) { return r.user_name; }).join(', ');
    var extra = others.length > 5 ? ' +' + (others.length - 5) + ' more' : '';
    return (
        <div className="px-4 py-1 flex items-center gap-1 text-[10px] text-muted-foreground" data-testid="read-receipts">
            <Eye className="w-3 h-3" />
            <span>Seen by {names}{extra}</span>
        </div>
    );
}

import React from 'react';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { formatRelativeTime, getInitials, cn } from '../lib/utils';
import { 
    Pin, CheckCircle, Clock, AlertCircle, Trash2
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';

const getStatusStyle = (status) => {
    switch(status) {
        case 'answered': return 'bg-green-100 text-green-700';
        case 'needs_followup': return 'bg-amber-100 text-amber-700';
        default: return 'bg-gray-100 text-gray-700';
    }
};

const getStatusLabel = (status) => {
    switch(status) {
        case 'answered': return 'Answered';
        case 'needs_followup': return 'Needs Follow-up';
        default: return 'Pending';
    }
};

const getStatusIcon = (status) => {
    switch(status) {
        case 'answered': return CheckCircle;
        case 'needs_followup': return AlertCircle;
        default: return Clock;
    }
};

export const ReplyCard = ({ 
    reply, 
    onStatusChange, 
    onPinToggle, 
    onDelete 
}) => {
    const StatusIcon = getStatusIcon(reply.status);
    
    return (
        <div 
            className={cn(
                "p-4 transition-colors",
                reply.is_pinned && "bg-amber-50/50 dark:bg-amber-900/10"
            )}
            data-testid={`reply-${reply.id}`}
        >
            <div className="flex items-start gap-3">
                <Avatar className="w-10 h-10 flex-shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {getInitials(reply.user_name)}
                    </AvatarFallback>
                </Avatar>
                <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold">{reply.user_name}</span>
                        <span className="text-xs text-muted-foreground">
                            {formatRelativeTime(reply.created_at)}
                        </span>
                        {reply.is_pinned && (
                            <Badge variant="outline" className="text-xs text-amber-600 border-amber-400">
                                <Pin className="w-3 h-3 mr-1" /> Pinned
                            </Badge>
                        )}
                    </div>
                    <p className="text-sm mb-3">{reply.content}</p>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        {/* Status Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    className={cn(
                                        "text-xs h-7",
                                        getStatusStyle(reply.status)
                                    )}
                                    data-testid={`status-btn-${reply.id}`}
                                >
                                    <StatusIcon className="w-3 h-3 mr-1" />
                                    {getStatusLabel(reply.status)}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                                <DropdownMenuItem onClick={() => onStatusChange('pending')}>
                                    <Clock className="w-4 h-4 mr-2" />
                                    Pending
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onStatusChange('answered')}>
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Answered
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onStatusChange('needs_followup')}>
                                    <AlertCircle className="w-4 h-4 mr-2" />
                                    Needs Follow-up
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Pin Button */}
                        <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                                "h-7 text-xs",
                                reply.is_pinned && "text-amber-600"
                            )}
                            onClick={onPinToggle}
                            data-testid={`pin-btn-${reply.id}`}
                        >
                            <Pin className="w-3 h-3 mr-1" />
                            {reply.is_pinned ? 'Unpin' : 'Pin'}
                        </Button>

                        {/* Delete Button */}
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-destructive"
                            onClick={onDelete}
                            data-testid={`delete-btn-${reply.id}`}
                        >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Delete
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReplyCard;

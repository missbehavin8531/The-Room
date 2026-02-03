import React from 'react';
import { cn } from '../lib/utils';
import { BookOpen, MessageSquare, FileText, Users, Inbox } from 'lucide-react';

const icons = {
    courses: BookOpen,
    chat: MessageSquare,
    files: FileText,
    users: Users,
    inbox: Inbox,
};

export const EmptyState = ({ 
    icon = 'courses', 
    title, 
    description, 
    action,
    className 
}) => {
    const Icon = icons[icon] || BookOpen;
    
    return (
        <div className={cn(
            "flex flex-col items-center justify-center py-12 px-4 text-center",
            className
        )}>
            <div className="relative mb-6">
                {/* Background decorative circles */}
                <div className="absolute -inset-4 bg-primary/5 rounded-full animate-pulse" />
                <div className="absolute -inset-2 bg-primary/10 rounded-full" />
                <div className="relative w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                    <Icon className="w-8 h-8 text-muted-foreground/50" />
                </div>
            </div>
            <h3 className="text-lg font-semibold mb-2">{title}</h3>
            <p className="text-muted-foreground text-sm max-w-sm mb-6">
                {description}
            </p>
            {action}
        </div>
    );
};

export default EmptyState;

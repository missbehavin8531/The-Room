import React from 'react';
import { cn } from '../lib/utils';

export const LoadingSkeleton = ({ className, variant = 'default' }) => {
    const baseClass = "bg-muted rounded animate-pulse relative overflow-hidden";
    
    const shimmerClass = `
        after:absolute after:inset-0 
        after:translate-x-[-100%] 
        after:bg-gradient-to-r 
        after:from-transparent 
        after:via-white/20 
        after:to-transparent 
        after:animate-[shimmer_2s_infinite]
    `;

    if (variant === 'card') {
        return (
            <div className={cn("card-organic p-4 space-y-4", className)}>
                <div className={cn(baseClass, shimmerClass, "h-40 rounded-xl")} />
                <div className={cn(baseClass, shimmerClass, "h-6 w-3/4")} />
                <div className={cn(baseClass, shimmerClass, "h-4 w-full")} />
                <div className={cn(baseClass, shimmerClass, "h-4 w-2/3")} />
            </div>
        );
    }

    if (variant === 'list-item') {
        return (
            <div className={cn("card-organic p-4 flex items-center gap-4", className)}>
                <div className={cn(baseClass, shimmerClass, "w-12 h-12 rounded-xl flex-shrink-0")} />
                <div className="flex-grow space-y-2">
                    <div className={cn(baseClass, shimmerClass, "h-5 w-1/2")} />
                    <div className={cn(baseClass, shimmerClass, "h-4 w-3/4")} />
                </div>
            </div>
        );
    }

    if (variant === 'dashboard') {
        return (
            <div className="space-y-6">
                <div className={cn(baseClass, shimmerClass, "h-10 w-64")} />
                <div className={cn(baseClass, shimmerClass, "h-64 rounded-2xl")} />
                <div className="grid md:grid-cols-3 gap-4">
                    <div className={cn(baseClass, shimmerClass, "h-32 rounded-xl")} />
                    <div className={cn(baseClass, shimmerClass, "h-32 rounded-xl")} />
                    <div className={cn(baseClass, shimmerClass, "h-32 rounded-xl")} />
                </div>
            </div>
        );
    }

    return <div className={cn(baseClass, shimmerClass, className)} />;
};

// Skeleton for course cards grid
export const CoursesSkeleton = () => (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
            <LoadingSkeleton key={i} variant="card" />
        ))}
    </div>
);

// Skeleton for lessons list
export const LessonsSkeleton = () => (
    <div className="space-y-3">
        {[1, 2, 3, 4].map(i => (
            <LoadingSkeleton key={i} variant="list-item" />
        ))}
    </div>
);

// Skeleton for chat messages
export const ChatSkeleton = () => (
    <div className="space-y-4 p-4">
        {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className={`flex gap-3 ${i % 2 === 0 ? 'flex-row-reverse' : ''}`}>
                <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
                <div className={`space-y-2 ${i % 2 === 0 ? 'items-end' : ''}`}>
                    <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                    <div className={`h-16 ${i % 2 === 0 ? 'w-48' : 'w-64'} bg-muted rounded-2xl animate-pulse`} />
                </div>
            </div>
        ))}
    </div>
);

export default LoadingSkeleton;

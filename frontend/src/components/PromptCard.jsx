import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ReplyCard } from '../components/ReplyCard';
import { cn } from '../lib/utils';
import { 
    MessageSquare, ChevronDown, ChevronUp
} from 'lucide-react';

export const PromptCard = ({ 
    item, 
    index, 
    isExpanded, 
    onToggle, 
    onStatusChange, 
    onPinToggle, 
    onDelete 
}) => {
    return (
        <Card 
            className="card-organic animate-fade-in"
            style={{ animationDelay: `${0.1 + index * 0.05}s` }}
        >
            {/* Prompt Header */}
            <div 
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={onToggle}
                data-testid={`prompt-header-${index}`}
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <MessageSquare className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <p className="font-medium">Prompt {index + 1}</p>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                            {item.prompt.question}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                        <Badge variant="outline" className="text-xs">
                            {item.stats.total} responses
                        </Badge>
                        {item.stats.pinned > 0 && (
                            <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                                {item.stats.pinned} pinned
                            </Badge>
                        )}
                    </div>
                    {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                </div>
            </div>

            {/* Expanded Replies */}
            {isExpanded && (
                <div className="border-t">
                    {/* Prompt Question */}
                    <div className="p-4 bg-primary/5 border-b">
                        <p className="font-medium text-primary">{item.prompt.question}</p>
                    </div>

                    {/* Replies List */}
                    {item.replies.length > 0 ? (
                        <div className="divide-y">
                            {item.replies.map((reply) => (
                                <ReplyCard
                                    key={reply.id}
                                    reply={reply}
                                    onStatusChange={(status) => onStatusChange(reply, status)}
                                    onPinToggle={() => onPinToggle(reply)}
                                    onDelete={() => onDelete(reply)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="p-8 text-center text-muted-foreground">
                            <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
                            <p>No responses yet for this prompt</p>
                        </div>
                    )}
                </div>
            )}
        </Card>
    );
};

export default PromptCard;

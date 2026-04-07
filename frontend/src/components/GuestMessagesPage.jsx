import React from 'react';
import { Layout } from '../components/Layout';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Mail, ChevronRight } from 'lucide-react';

var demoInbox = [
    { id: '1', initials: 'SM', name: 'Sarah M.', text: "That really helps, thank you! See you Sunday!", read: true, date: 'Apr 5, 2:30 PM' },
    { id: '2', initials: 'DK', name: 'David K.', text: "Hey Teacher, I missed last Sunday. Is there a recording I can watch?", read: false, date: 'Apr 7, 9:15 AM' },
];

function GuestMessagesPage() {
    return (
        <Layout>
            <div className="page-container py-6 space-y-4" data-testid="guest-messages-demo">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-serif font-bold flex items-center gap-2">
                        <Mail className="w-6 h-6" /> Messages
                    </h1>
                    <Badge variant="outline" className="text-xs">Demo Data</Badge>
                </div>

                {demoInbox.map(function(msg) {
                    var cardClass = "card-organic";
                    if (!msg.read) cardClass = cardClass + " border-primary/30";
                    return (
                        <Card key={msg.id} className={cardClass}>
                            <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                    <Avatar className="w-9 h-9 shrink-0">
                                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                            {msg.initials}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-grow min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="font-medium text-sm">{msg.name}</span>
                                            {!msg.read && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                                        </div>
                                        <p className="text-sm text-muted-foreground line-clamp-2">{msg.text}</p>
                                        <p className="text-xs text-muted-foreground/60 mt-1">{msg.date}</p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}

                <Card className="card-organic border-dashed">
                    <CardContent className="p-4 text-center">
                        <p className="text-sm text-muted-foreground mb-2">Sign up to message your teacher directly</p>
                        <a href="/" className="text-sm text-primary font-semibold hover:underline">Sign up free</a>
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}

export default GuestMessagesPage;

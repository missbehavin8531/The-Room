import React from 'react';
import { Layout } from '../components/Layout';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Flame, BookOpen, CheckCircle } from 'lucide-react';

var demoCourses = [
    { id: '1', title: 'Introduction to the Gospel', total: 3, done: 3, pct: 100 },
    { id: '2', title: 'Introduction to Finance Basics', total: 3, done: 1, pct: 33 },
    { id: '3', title: 'Introduction to Mindfulness', total: 3, done: 1, pct: 33 },
];

function GuestProgressPage() {
    return (
        <Layout>
            <div className="page-container py-6 space-y-6" data-testid="guest-progress-demo">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-serif font-bold">My Progress</h1>
                    <Badge variant="outline" className="text-xs">Demo Data</Badge>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    <Card className="card-organic">
                        <CardContent className="p-4 text-center">
                            <Flame className="w-6 h-6 mx-auto mb-1 text-orange-500" />
                            <div className="text-2xl font-bold">4</div>
                            <div className="text-xs text-muted-foreground">Day Streak</div>
                        </CardContent>
                    </Card>
                    <Card className="card-organic">
                        <CardContent className="p-4 text-center">
                            <BookOpen className="w-6 h-6 mx-auto mb-1 text-primary" />
                            <div className="text-2xl font-bold">3</div>
                            <div className="text-xs text-muted-foreground">Courses</div>
                        </CardContent>
                    </Card>
                    <Card className="card-organic">
                        <CardContent className="p-4 text-center">
                            <CheckCircle className="w-6 h-6 mx-auto mb-1 text-green-500" />
                            <div className="text-2xl font-bold">5</div>
                            <div className="text-xs text-muted-foreground">Completed</div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-3">
                    {demoCourses.map(function(c) {
                        return (
                            <Card key={c.id} className="card-organic">
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-medium text-sm">{c.title}</h3>
                                        <Badge variant={c.pct === 100 ? "default" : "outline"} className="text-xs ml-2 shrink-0">
                                            {c.pct === 100 ? 'Complete' : c.pct + '%'}
                                        </Badge>
                                    </div>
                                    <div className="w-full bg-muted rounded-full h-2 mb-1">
                                        <div className="bg-primary h-2 rounded-full transition-all" style={{width: c.pct + '%'}} />
                                    </div>
                                    <p className="text-xs text-muted-foreground">{c.done} of {c.total} lessons</p>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                <Card className="card-organic border-dashed">
                    <CardContent className="p-4 text-center">
                        <p className="text-sm text-muted-foreground mb-2">Sign up to track your real progress</p>
                        <a href="/" className="text-sm text-primary font-semibold hover:underline">Sign up free</a>
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}

export default GuestProgressPage;

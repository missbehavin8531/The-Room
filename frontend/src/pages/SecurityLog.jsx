import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { securityLogAPI } from '../lib/api';
import { cn } from '../lib/utils';
import {
    Shield, LogIn, LogOut, UserPlus, UserCheck, UserX,
    KeyRound, ChevronLeft, ChevronRight, Filter, AlertTriangle
} from 'lucide-react';

const EVENT_CONFIG = {
    login_success: { icon: LogIn, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30', label: 'Login' },
    login_failed: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30', label: 'Failed Login' },
    user_registered: { icon: UserPlus, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30', label: 'Registration' },
    user_approved: { icon: UserCheck, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30', label: 'Approval' },
    user_deleted: { icon: UserX, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30', label: 'Deletion' },
    password_reset_request: { icon: KeyRound, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30', label: 'Reset' },
};

const DEFAULT_CONFIG = { icon: Shield, color: 'text-muted-foreground', bg: 'bg-muted', label: 'Event' };

function formatTimeAgo(isoString) {
    const d = new Date(isoString);
    const now = new Date();
    const secs = Math.floor((now - d) / 1000);
    if (secs < 60) return 'Just now';
    if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
    if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
    if (secs < 604800) return `${Math.floor(secs / 86400)}d ago`;
    return d.toLocaleDateString();
}

export default function SecurityLog() {
    const [logs, setLogs] = useState([]);
    const [summary, setSummary] = useState({});
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState(null);
    const [page, setPage] = useState(0);
    const LIMIT = 30;

    useEffect(() => { loadData(); }, [filter, page]);

    const loadData = async () => {
        setLoading(true);
        try {
            const params = { limit: LIMIT, skip: page * LIMIT };
            if (filter) params.event_type = filter;
            const [logsRes, summaryRes] = await Promise.all([
                securityLogAPI.getLogs(params),
                securityLogAPI.getSummary()
            ]);
            setLogs(logsRes.data.logs);
            setTotal(logsRes.data.total);
            setSummary(summaryRes.data.summary || {});
        } catch (e) {
            console.error('Failed to load security logs:', e);
        } finally {
            setLoading(false);
        }
    };

    const allEventTypes = Object.keys(EVENT_CONFIG);

    return (
        <Layout>
            <div className="page-container py-6 space-y-6 max-w-2xl mx-auto" data-testid="security-log-page">
                {/* Header */}
                <div className="space-y-1 animate-fade-in">
                    <p className="text-xs tracking-widest uppercase font-semibold text-muted-foreground" style={{ fontFamily: "'Manrope', sans-serif" }}>
                        Admin
                    </p>
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
                        Security Log
                    </h1>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-2 animate-fade-in" style={{ animationDelay: '0.05s' }}>
                    {['login_failed', 'user_registered', 'user_approved'].map((key) => {
                        const cfg = EVENT_CONFIG[key];
                        const Icon = cfg.icon;
                        return (
                            <Card
                                key={key}
                                className={cn("card-organic cursor-pointer transition-all hover:-translate-y-0.5", filter === key && "ring-2 ring-primary")}
                                onClick={() => setFilter(filter === key ? null : key)}
                                data-testid={`summary-${key}`}
                            >
                                <CardContent className="p-3 text-center">
                                    <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center mx-auto mb-1", cfg.bg)}>
                                        <Icon className={cn("w-4 h-4", cfg.color)} />
                                    </div>
                                    <p className="text-xl font-bold" style={{ fontFamily: "'Fraunces', serif" }}>
                                        {summary[key] || 0}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">{cfg.label}s</p>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* Filter Pills */}
                <div className="flex gap-1.5 flex-wrap animate-fade-in" style={{ animationDelay: '0.1s' }}>
                    <button
                        onClick={() => { setFilter(null); setPage(0); }}
                        className={cn(
                            "px-3 py-1 rounded-full text-xs font-semibold transition-colors",
                            !filter ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                        )}
                        data-testid="filter-all"
                    >
                        All ({Object.values(summary).reduce((a, b) => a + b, 0)})
                    </button>
                    {allEventTypes.map((key) => {
                        const cfg = EVENT_CONFIG[key];
                        return (
                            <button
                                key={key}
                                onClick={() => { setFilter(filter === key ? null : key); setPage(0); }}
                                className={cn(
                                    "px-3 py-1 rounded-full text-xs font-semibold transition-colors",
                                    filter === key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                                )}
                                data-testid={`filter-${key}`}
                            >
                                {cfg.label} ({summary[key] || 0})
                            </button>
                        );
                    })}
                </div>

                {/* Log Entries */}
                {loading ? (
                    <div className="space-y-2">
                        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}
                    </div>
                ) : logs.length === 0 ? (
                    <Card className="card-organic animate-fade-in">
                        <CardContent className="p-8 text-center">
                            <Shield className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
                            <h3 className="font-semibold mb-1" style={{ fontFamily: "'Fraunces', serif" }}>No events yet</h3>
                            <p className="text-sm text-muted-foreground" style={{ fontFamily: "'Manrope', sans-serif" }}>
                                Security events will appear here as they occur
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-1.5 stagger-children animate-fade-in" style={{ animationDelay: '0.15s' }}>
                        {logs.map((log) => {
                            const cfg = EVENT_CONFIG[log.event_type] || DEFAULT_CONFIG;
                            const Icon = cfg.icon;
                            return (
                                <Card key={log.id} className="card-organic" data-testid={`log-entry-${log.id}`}>
                                    <CardContent className="p-3.5 flex items-center gap-3">
                                        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0", cfg.bg)}>
                                            <Icon className={cn("w-4 h-4", cfg.color)} />
                                        </div>
                                        <div className="flex-grow min-w-0">
                                            <p className="text-sm font-medium truncate" style={{ fontFamily: "'Manrope', sans-serif" }}>
                                                {log.description}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                                {log.email && <span className="font-medium">{log.email}</span>}
                                            </p>
                                        </div>
                                        <div className="flex-shrink-0 text-right">
                                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                                {cfg.label}
                                            </Badge>
                                            <p className="text-[10px] text-muted-foreground mt-1">
                                                {formatTimeAgo(log.created_at)}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}

                {/* Pagination */}
                {total > LIMIT && (
                    <div className="flex items-center justify-between animate-fade-in" style={{ animationDelay: '0.2s' }}>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page === 0}
                            onClick={() => setPage(p => p - 1)}
                            data-testid="prev-page"
                        >
                            <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                        </Button>
                        <span className="text-xs text-muted-foreground">
                            {page * LIMIT + 1}-{Math.min((page + 1) * LIMIT, total)} of {total}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={(page + 1) * LIMIT >= total}
                            onClick={() => setPage(p => p + 1)}
                            data-testid="next-page"
                        >
                            Next <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    </div>
                )}
            </div>
        </Layout>
    );
}

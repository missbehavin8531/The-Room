import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { zoomAPI } from '../lib/api';
import { toast } from 'sonner';
import { Video, Loader2, ExternalLink, CheckCircle, XCircle } from 'lucide-react';

export default function ZoomIntegration() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [zoomStatus, setZoomStatus] = useState(null);
    const [zoomLoading, setZoomLoading] = useState(false);
    const [zoomConnecting, setZoomConnecting] = useState(false);

    useEffect(function() {
        const zoomResult = searchParams.get('zoom');
        if (zoomResult === 'connected') {
            toast.success('Zoom account connected successfully!');
            setSearchParams({});
            fetchZoomStatus();
        } else if (zoomResult === 'error') {
            toast.error('Failed to connect Zoom account. Please try again.');
            setSearchParams({});
        }
    }, []);

    useEffect(function() {
        fetchZoomStatus();
    }, []);

    function fetchZoomStatus() {
        setZoomLoading(true);
        zoomAPI.getStatus()
            .then(function(res) { setZoomStatus(res.data); setZoomLoading(false); })
            .catch(function() { setZoomLoading(false); });
    }

    function handleZoomConnect() {
        setZoomConnecting(true);
        zoomAPI.connect()
            .then(function(res) {
                if (res.data.authorization_url) window.location.href = res.data.authorization_url;
            })
            .catch(function(err) {
                const msg = err.response?.data?.detail;
                toast.error(msg || 'Failed to start Zoom connection');
                setZoomConnecting(false);
            });
    }

    function handleZoomDisconnect() {
        zoomAPI.disconnect()
            .then(function() {
                toast.success('Zoom account disconnected');
                setZoomStatus({ configured: true, connected: false });
            })
            .catch(function() { toast.error('Failed to disconnect Zoom'); });
    }

    return (
        <div className="max-w-2xl mx-auto space-y-4">
            <Card data-testid="zoom-integration-card">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Video className="w-5 h-5" />
                        Zoom Integration
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {zoomLoading ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Checking Zoom status...
                        </div>
                    ) : zoomStatus?.connected ? (
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                                <div className="flex-grow">
                                    <p className="font-medium text-green-700 dark:text-green-300">Zoom Connected</p>
                                    {zoomStatus.zoom_email && (
                                        <p className="text-sm text-green-600 dark:text-green-400">{zoomStatus.zoom_email}</p>
                                    )}
                                </div>
                                <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                    Active
                                </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Zoom cloud recordings will be automatically imported into your most recent lesson when a meeting ends.
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleZoomDisconnect}
                                className="text-destructive"
                                data-testid="zoom-disconnect-btn"
                            >
                                <XCircle className="w-4 h-4 mr-1" />
                                Disconnect Zoom
                            </Button>
                        </div>
                    ) : zoomStatus?.configured === false ? (
                        <div className="space-y-2">
                            <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                                <Video className="w-5 h-5 text-amber-600" />
                                <div>
                                    <p className="font-medium text-amber-700 dark:text-amber-300">Not Configured</p>
                                    <p className="text-sm text-amber-600 dark:text-amber-400">
                                        Zoom integration credentials haven't been set up by the platform admin yet.
                                    </p>
                                </div>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Once configured, you'll be able to connect your Zoom account and have recordings auto-imported.
                                You can still manually upload recordings from the lesson page.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-sm text-muted-foreground">
                                Connect your Zoom account to automatically import cloud recordings into your lessons.
                                When a Zoom meeting ends, the recording will appear in your lesson's replay tab.
                            </p>
                            <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
                                <ExternalLink className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                <span className="text-blue-700 dark:text-blue-300">
                                    You'll be redirected to Zoom to authorize access to your recordings.
                                </span>
                            </div>
                            <Button
                                onClick={handleZoomConnect}
                                disabled={zoomConnecting}
                                className="btn-primary"
                                data-testid="zoom-connect-btn"
                            >
                                {zoomConnecting ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                ) : (
                                    <Video className="w-4 h-4 mr-2" />
                                )}
                                Connect Zoom Account
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

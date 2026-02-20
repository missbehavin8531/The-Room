import React, { useEffect, useState, useCallback } from 'react';
import DailyIframe from '@daily-co/daily-js';
import { DailyProvider, useDaily, useParticipantIds, useLocalParticipant, useScreenShare } from '@daily-co/daily-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { videoRoomAPI } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { getInitials, cn } from '../lib/utils';
import {
    Video, VideoOff, Mic, MicOff, PhoneOff, Monitor, Users,
    Loader2, AlertCircle, Maximize2, Minimize2, Circle
} from 'lucide-react';

// Video Tile Component
const VideoTile = ({ sessionId, isLocal, userName }) => {
    const videoRef = React.useRef(null);
    const daily = useDaily();

    useEffect(() => {
        if (!daily || !videoRef.current || !sessionId) return;

        const updateVideo = () => {
            const participant = daily.participants()[isLocal ? 'local' : sessionId];
            if (!participant) return;

            const videoTrack = participant.tracks?.video;
            if (videoTrack?.state === 'playable' && videoTrack.track) {
                const stream = new MediaStream([videoTrack.track]);
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } else if (videoRef.current) {
                videoRef.current.srcObject = null;
            }
        };

        updateVideo();
        daily.on('participant-updated', updateVideo);
        daily.on('track-started', updateVideo);
        daily.on('track-stopped', updateVideo);

        return () => {
            daily.off('participant-updated', updateVideo);
            daily.off('track-started', updateVideo);
            daily.off('track-stopped', updateVideo);
        };
    }, [daily, sessionId, isLocal]);

    const participant = daily?.participants()?.[isLocal ? 'local' : sessionId];
    const hasVideo = participant?.tracks?.video?.state === 'playable';
    const hasAudio = participant?.tracks?.audio?.state === 'playable';
    const displayName = participant?.user_name || userName || 'Guest';

    return (
        <div className="relative w-full h-full bg-gray-900 rounded-lg overflow-hidden">
            {hasVideo ? (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted={isLocal}
                    className="w-full h-full object-cover"
                    style={{ transform: isLocal ? 'scaleX(-1)' : 'none' }}
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                    <Avatar className="w-20 h-20">
                        <AvatarFallback className="bg-primary/20 text-primary text-2xl">
                            {getInitials(displayName)}
                        </AvatarFallback>
                    </Avatar>
                </div>
            )}
            
            {/* Name & Status Overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                <div className="flex items-center justify-between">
                    <span className="text-white text-sm font-medium truncate">
                        {displayName} {isLocal && '(You)'}
                    </span>
                    <div className="flex gap-1">
                        {!hasAudio && (
                            <div className="bg-red-500 rounded-full p-1">
                                <MicOff className="w-3 h-3 text-white" />
                            </div>
                        )}
                        {!hasVideo && (
                            <div className="bg-red-500 rounded-full p-1">
                                <VideoOff className="w-3 h-3 text-white" />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Video Grid Component
const VideoGrid = () => {
    const daily = useDaily();
    const participantIds = useParticipantIds({ filter: 'remote' });
    
    const allParticipants = ['local', ...participantIds];
    const count = allParticipants.length;
    
    // Calculate grid layout
    const getGridCols = () => {
        if (count === 1) return 'grid-cols-1';
        if (count === 2) return 'grid-cols-2';
        if (count <= 4) return 'grid-cols-2';
        if (count <= 6) return 'grid-cols-3';
        return 'grid-cols-4';
    };

    return (
        <div className={cn(
            "grid gap-2 h-full p-2",
            getGridCols()
        )}>
            {allParticipants.map((id, idx) => (
                <VideoTile
                    key={id}
                    sessionId={id === 'local' ? null : id}
                    isLocal={id === 'local'}
                />
            ))}
        </div>
    );
};

// Control Bar Component
const ControlBar = ({ onLeave, isFullscreen, onToggleFullscreen }) => {
    const daily = useDaily();
    const localParticipant = useLocalParticipant();
    const { screens, startScreenShare, stopScreenShare } = useScreenShare();
    
    const [videoOn, setVideoOn] = useState(true);
    const [audioOn, setAudioOn] = useState(true);
    const isScreenSharing = screens.length > 0;

    useEffect(() => {
        if (localParticipant) {
            setVideoOn(localParticipant.tracks?.video?.state !== 'off');
            setAudioOn(localParticipant.tracks?.audio?.state !== 'off');
        }
    }, [localParticipant]);

    const toggleVideo = async () => {
        try {
            await daily?.setLocalVideo(!videoOn);
            setVideoOn(!videoOn);
        } catch (e) {
            console.error('Toggle video error:', e);
        }
    };

    const toggleAudio = async () => {
        try {
            await daily?.setLocalAudio(!audioOn);
            setAudioOn(!audioOn);
        } catch (e) {
            console.error('Toggle audio error:', e);
        }
    };

    const toggleScreenShare = async () => {
        try {
            if (isScreenSharing) {
                await stopScreenShare();
            } else {
                await startScreenShare();
            }
        } catch (e) {
            console.error('Screen share error:', e);
        }
    };

    return (
        <div className="flex items-center justify-center gap-2 p-3 bg-gray-900/90 backdrop-blur rounded-xl">
            <Button
                variant={videoOn ? "secondary" : "destructive"}
                size="icon"
                onClick={toggleVideo}
                className="rounded-full w-12 h-12"
                data-testid="video-toggle-btn"
            >
                {videoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </Button>
            
            <Button
                variant={audioOn ? "secondary" : "destructive"}
                size="icon"
                onClick={toggleAudio}
                className="rounded-full w-12 h-12"
                data-testid="audio-toggle-btn"
            >
                {audioOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </Button>
            
            <Button
                variant={isScreenSharing ? "default" : "secondary"}
                size="icon"
                onClick={toggleScreenShare}
                className="rounded-full w-12 h-12 hidden md:flex"
                data-testid="screenshare-btn"
            >
                <Monitor className="w-5 h-5" />
            </Button>
            
            <Button
                variant="secondary"
                size="icon"
                onClick={onToggleFullscreen}
                className="rounded-full w-12 h-12"
            >
                {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </Button>
            
            <Button
                variant="destructive"
                size="icon"
                onClick={onLeave}
                className="rounded-full w-12 h-12"
                data-testid="leave-call-btn"
            >
                <PhoneOff className="w-5 h-5" />
            </Button>
        </div>
    );
};

// Participant Count Badge
const ParticipantCount = () => {
    const participantIds = useParticipantIds();
    return (
        <Badge variant="secondary" className="absolute top-3 left-3 gap-1">
            <Users className="w-3 h-3" />
            {participantIds.length + 1}
        </Badge>
    );
};

// Meeting View (inside DailyProvider)
const MeetingView = ({ onLeave, isFullscreen, onToggleFullscreen }) => {
    return (
        <div className="relative w-full h-full flex flex-col bg-gray-950">
            <ParticipantCount />
            <div className="flex-1 min-h-0">
                <VideoGrid />
            </div>
            <div className="flex justify-center pb-4">
                <ControlBar 
                    onLeave={onLeave} 
                    isFullscreen={isFullscreen}
                    onToggleFullscreen={onToggleFullscreen}
                />
            </div>
        </div>
    );
};

// Main VideoRoom Component
export const VideoRoom = ({ lessonId, onClose }) => {
    const [callObject, setCallObject] = useState(null);
    const [status, setStatus] = useState('idle'); // idle, joining, joined, error
    const [error, setError] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = React.useRef(null);

    const joinRoom = useCallback(async () => {
        setStatus('joining');
        setError(null);

        try {
            // Get room credentials from backend
            const response = await videoRoomAPI.join(lessonId);
            const { room_url, meeting_token } = response.data;

            // Create Daily call object
            const call = DailyIframe.createCallObject({
                audioSource: true,
                videoSource: true,
            });

            // Set up event handlers
            call.on('joined-meeting', () => {
                setStatus('joined');
                toast.success('Joined video room!');
            });

            call.on('left-meeting', () => {
                setStatus('idle');
                call.destroy();
                setCallObject(null);
            });

            call.on('error', (e) => {
                console.error('Daily error:', e);
                setError(e.errorMsg || 'Video connection error');
                setStatus('error');
            });

            // Join the meeting
            await call.join({
                url: room_url,
                token: meeting_token,
            });

            setCallObject(call);
        } catch (err) {
            console.error('Join room error:', err);
            setError(err.response?.data?.detail || 'Failed to join video room');
            setStatus('error');
        }
    }, [lessonId]);

    const leaveRoom = useCallback(async () => {
        if (callObject) {
            await callObject.leave();
            callObject.destroy();
            setCallObject(null);
        }
        setStatus('idle');
        if (onClose) onClose();
    }, [callObject, onClose]);

    const toggleFullscreen = useCallback(() => {
        if (!containerRef.current) return;
        
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen?.();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen?.();
            setIsFullscreen(false);
        }
    }, []);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (callObject) {
                callObject.leave();
                callObject.destroy();
            }
        };
    }, [callObject]);

    // Idle state - show join button
    if (status === 'idle') {
        return (
            <Card className="card-organic overflow-hidden">
                <CardContent className="p-6 text-center">
                    <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Video className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-xl font-serif font-bold mb-2">Join Video Room</h2>
                    <p className="text-muted-foreground mb-6">
                        Connect with your group face-to-face in our video room
                    </p>
                    <Button
                        onClick={joinRoom}
                        className="btn-primary text-lg py-6 px-8"
                        data-testid="join-video-btn"
                    >
                        <Video className="w-5 h-5 mr-2" />
                        Join Video Room
                    </Button>
                </CardContent>
            </Card>
        );
    }

    // Joining state
    if (status === 'joining') {
        return (
            <Card className="card-organic overflow-hidden">
                <CardContent className="p-8 text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                    <h3 className="text-lg font-medium">Joining video room...</h3>
                    <p className="text-muted-foreground text-sm mt-2">
                        Please allow camera and microphone access
                    </p>
                </CardContent>
            </Card>
        );
    }

    // Error state
    if (status === 'error') {
        return (
            <Card className="card-organic overflow-hidden border-destructive">
                <CardContent className="p-6 text-center">
                    <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-destructive mb-2">Connection Error</h3>
                    <p className="text-muted-foreground mb-4">{error}</p>
                    <div className="flex gap-2 justify-center">
                        <Button onClick={joinRoom} variant="default">
                            Try Again
                        </Button>
                        <Button onClick={() => setStatus('idle')} variant="outline">
                            Cancel
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Joined state - show video
    if (status === 'joined' && callObject) {
        return (
            <div 
                ref={containerRef}
                className={cn(
                    "rounded-xl overflow-hidden bg-gray-950",
                    isFullscreen ? "fixed inset-0 z-50 rounded-none" : "aspect-video"
                )}
            >
                <DailyProvider callObject={callObject}>
                    <MeetingView 
                        onLeave={leaveRoom}
                        isFullscreen={isFullscreen}
                        onToggleFullscreen={toggleFullscreen}
                    />
                </DailyProvider>
            </div>
        );
    }

    return null;
};

export default VideoRoom;

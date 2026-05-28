import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { VideoRoom } from '../../components/VideoRoom';
import { Video, CheckCircle, MessageCircle, ChevronRight } from 'lucide-react';

export function LiveRoomTab({ lesson, lessonId, course, isGuest, roomStatus, completedActions, showVideoRoom, setShowVideoRoom, fetchRoomStatus, handleJoinLive }) {
    const zoomLink = lesson?.zoom_link || course?.zoom_link;

    return (
        <div className="space-y-4 animate-fade-in">
            {/* In-App Video Room */}
            {(lesson.hosting_method === 'in_app' || lesson.hosting_method === 'both' || !lesson.hosting_method) && (
                <>
                    {isGuest ? (
                        <Card className="card-organic">
                            <CardContent className="p-6 text-center">
                                <Video className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                                <p className="text-sm font-semibold mb-1" style={{ fontFamily: "'Manrope', sans-serif" }}>Video Room</p>
                                <p className="text-xs text-muted-foreground mb-3">Sign up to join live video sessions with the group.</p>
                                <a href="/" className="text-xs text-primary font-semibold hover:underline">Sign up free</a>
                            </CardContent>
                        </Card>
                    ) : (
                        <>
                            <VideoRoom
                                lessonId={lessonId}
                                onClose={() => { setShowVideoRoom(false); fetchRoomStatus(); }}
                            />
                            {roomStatus?.room_exists && roomStatus.participants_count > 0 && (
                                <Card className="card-organic bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                                    <CardContent className="p-3 flex items-center justify-center gap-2">
                                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                        <span className="text-green-700 dark:text-green-400 font-medium">
                                            {roomStatus.participants_count} {roomStatus.participants_count === 1 ? 'person' : 'people'} in the room
                                        </span>
                                    </CardContent>
                                </Card>
                            )}
                            {completedActions.includes('joined_video') && (
                                <div className="flex items-center justify-center gap-2 text-green-600">
                                    <CheckCircle className="w-5 h-5" />
                                    <span className="font-medium">You've joined video!</span>
                                </div>
                            )}
                        </>
                    )}
                </>
            )}

            {/* External Zoom Link */}
            {(lesson.hosting_method === 'zoom' || lesson.hosting_method === 'both') && zoomLink && (
                <Card className="card-organic">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                                    <Video className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <p className="font-medium">{lesson.hosting_method === 'zoom' ? 'Join via Zoom' : 'External Zoom Meeting'}</p>
                                    <p className="text-sm text-muted-foreground">{lesson.hosting_method === 'zoom' ? 'Class hosted on Zoom' : 'Alternative meeting link'}</p>
                                </div>
                            </div>
                            <Button
                                onClick={handleJoinLive}
                                variant={lesson.hosting_method === 'zoom' ? 'default' : 'outline'}
                                size="sm"
                                className={lesson.hosting_method === 'zoom' ? 'btn-primary' : ''}
                                data-testid="join-zoom-btn"
                            >
                                Join Zoom
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* No hosting option configured */}
            {lesson.hosting_method === 'zoom' && !zoomLink && (
                <Card className="card-organic">
                    <CardContent className="p-8 text-center">
                        <Video className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">No Meeting Link</h3>
                        <p className="text-muted-foreground">The teacher hasn't added a Zoom link yet.</p>
                    </CardContent>
                </Card>
            )}

            {/* Live Chat Link */}
            <Card className="card-organic card-hover">
                <Link to="/connect">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                                <MessageCircle className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <p className="font-medium">Live Chat</p>
                                <p className="text-sm text-muted-foreground">Join the conversation</p>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </CardContent>
                </Link>
            </Card>
        </div>
    );
}

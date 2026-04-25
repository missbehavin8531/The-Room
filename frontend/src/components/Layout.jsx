import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
    BookOpen, 
    MessageCircle, 
    Settings, 
    LogOut,
    User,
    Search as SearchIcon,
    Shield,
    TrendingUp,
    ShieldAlert,
    WifiOff,
} from 'lucide-react';
import { cn, getInitials } from '../lib/utils';
import { Button } from './ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Avatar, AvatarFallback } from './ui/avatar';
import { toast } from 'sonner';

function isPathActive(matchPaths, pathname) {
    return matchPaths.some(function(p) {
        if (p === '/') return pathname === '/';
        return pathname === p || pathname.startsWith(p + '/');
    });
}

export var Layout = function Layout(props) {
    var children = props.children;
    var auth = useAuth();
    var user = auth.user;
    var logout = auth.logout;
    var isApproved = auth.isApproved;
    var isTeacherOrAdmin = auth.isTeacherOrAdmin;
    var isAdmin = auth.isAdmin;
    var isGuest = auth.isGuest;
    var location = useLocation();
    var navigate = useNavigate();
    var [isOffline, setIsOffline] = useState(!navigator.onLine);

    // Offline/online detection + background sync replay
    useEffect(function() {
        function goOffline() { setIsOffline(true); }
        function goOnline() {
            setIsOffline(false);
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({ type: 'REPLAY_QUEUE' });
            }
        }
        window.addEventListener('offline', goOffline);
        window.addEventListener('online', goOnline);

        function onSWMessage(event) {
            if (event.data && event.data.type === 'QUEUE_REPLAYED') {
                toast.success(event.data.count + ' offline action(s) synced!');
            }
            if (event.data && event.data.type === 'ACTION_QUEUED') {
                toast.info('Saved offline. Will sync when back online.');
            }
        }
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', onSWMessage);
        }

        return function() {
            window.removeEventListener('offline', goOffline);
            window.removeEventListener('online', goOnline);
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.removeEventListener('message', onSWMessage);
            }
        };
    }, []);

    // Cache warming: pre-cache key API responses after auth
    useEffect(function() {
        if (!user || isGuest) return;
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            var token = localStorage.getItem('token');
            if (!token) return;
            var backendUrl = process.env.REACT_APP_BACKEND_URL;
            navigator.serviceWorker.controller.postMessage({
                type: 'CACHE_API',
                urls: [
                    backendUrl + '/api/courses',
                    backendUrl + '/api/my-progress',
                    backendUrl + '/api/chat',
                    backendUrl + '/api/enrollments/my',
                ],
                headers: { Authorization: 'Bearer ' + token }
            });
        }
    }, [user, isGuest]);

    function handleLogout() {
        logout();
        navigate('/');
    }

    // Build navigation — 4 core tabs
    var navItems = [
        { path: '/dashboard', icon: BookOpen, label: 'Home', match: ['/', '/dashboard', '/courses', '/lessons'] },
        { path: '/connect', icon: MessageCircle, label: 'Connect', match: ['/connect'] },
        { path: '/progress', icon: TrendingUp, label: 'Me', match: ['/progress', '/settings'] },
    ];

    if (isTeacherOrAdmin) {
        navItems.push({
            path: isAdmin ? '/admin' : '/teacher-dashboard',
            icon: Shield,
            label: 'Manage',
            match: ['/admin', '/teacher-dashboard', '/attendance', '/security-log']
        });
    }

    // Unapproved user screen
    if (!isApproved) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="card-organic p-8 max-w-md w-full text-center animate-fade-in">
                    <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <div className="w-12 h-12 bg-amber-200 rounded-full flex items-center justify-center animate-pulse">
                            <User className="w-6 h-6 text-amber-600" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-serif font-bold mb-2">Almost There!</h1>
                    <p className="text-muted-foreground mb-2">
                        Hi <strong>{user && user.name ? user.name.split(' ')[0] : ''}</strong>!
                    </p>
                    <p className="text-muted-foreground mb-6">
                        An admin will approve your account shortly. You'll get full access to lessons, discussions, and more!
                    </p>
                    <div className="p-4 bg-muted/50 rounded-xl mb-6">
                        <p className="text-sm text-muted-foreground">
                            Signed in as: <strong>{user && user.email}</strong>
                        </p>
                    </div>
                    <Button onClick={handleLogout} variant="outline" className="w-full py-5">
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign Out
                    </Button>
                </div>
            </div>
        );
    }

    // Shared dropdown content for both mobile and desktop
    var dropdownContent = (
        <>
            <div className="px-3 py-2">
                <p className="text-sm font-medium">{user && user.name}</p>
                <p className="text-xs text-muted-foreground">{user && user.email}</p>
                <span className={cn(
                    "inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium capitalize",
                    user && user.role === 'admin' ? 'bg-red-100 text-red-800' :
                    user && user.role === 'teacher' ? 'bg-blue-100 text-blue-800' :
                    'bg-green-100 text-green-800'
                )}>
                    {user && user.role}
                </span>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
                <Link to="/settings" className="flex items-center">
                    <Settings className="w-4 h-4 mr-2" />Settings
                </Link>
            </DropdownMenuItem>
            {isAdmin && (
                <DropdownMenuItem asChild>
                    <Link to="/security-log" className="flex items-center">
                        <ShieldAlert className="w-4 h-4 mr-2" />Security Log
                    </Link>
                </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="w-4 h-4 mr-2" />Sign Out
            </DropdownMenuItem>
        </>
    );

    return (
        <div className="min-h-screen bg-background">
            {/* Desktop Header */}
            <header className="hidden md:block sticky top-0 z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border-b border-border">
                <div className="container mx-auto px-8">
                    <div className="flex items-center justify-between h-16">
                        <Link to="/" className="flex items-center gap-3 shrink-0">
                            <img src="/logo.png" alt="The Room" className="w-10 h-10 rounded-xl" />
                            <div className="flex flex-col">
                                <span className="font-serif font-bold text-xl leading-tight">The Room</span>
                                {user && user.group_name && (
                                    <span className="text-xs text-muted-foreground leading-tight">{user.group_name}</span>
                                )}
                            </div>
                        </Link>

                        <nav className="flex items-center gap-1" data-testid="desktop-nav">
                            {navItems.map(function(item) {
                                var active = isPathActive(item.match, location.pathname);
                                return (
                                    <Link
                                        key={item.label}
                                        to={item.path}
                                        className={cn(
                                            "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors",
                                            active
                                                ? "bg-primary text-primary-foreground"
                                                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                        )}
                                        data-testid={"nav-" + item.label.toLowerCase()}
                                    >
                                        <item.icon className="w-4 h-4" />
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </nav>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-full"
                                onClick={function() { navigate('/search'); }}
                                data-testid="header-search-btn"
                            >
                                <SearchIcon className="w-4 h-4" />
                            </Button>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="flex items-center gap-2" data-testid="desktop-avatar-menu">
                                        <Avatar className="w-8 h-8">
                                            <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                                {getInitials(user && user.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="hidden lg:inline">{user && user.name}</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    {dropdownContent}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </div>
            </header>

            {/* Mobile Header — slim, no horizontal scrolling tabs */}
            <header className="md:hidden sticky top-0 z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border-b border-border">
                <div className="flex items-center justify-between px-4 h-14">
                    <Link to="/" className="flex items-center gap-2">
                        <img src="/logo.png" alt="The Room" className="w-8 h-8 rounded-lg" />
                        <div className="flex flex-col">
                            <span className="font-serif font-bold text-lg leading-tight">The Room</span>
                            {user && user.group_name && (
                                <span className="text-[10px] text-muted-foreground leading-tight">{user.group_name}</span>
                            )}
                        </div>
                    </Link>

                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="w-9 h-9 rounded-full"
                            onClick={function() { navigate('/search'); }}
                            data-testid="mobile-search-btn"
                        >
                            <SearchIcon className="w-4 h-4" />
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="p-1.5" data-testid="mobile-avatar-menu">
                                    <Avatar className="w-8 h-8">
                                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                            {getInitials(user && user.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                                {dropdownContent}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </header>

            {/* Guest Banner */}
            {isGuest && (
                <div className="bg-primary/10 border-b border-primary/20 px-4 py-2.5 flex items-center justify-between gap-3">
                    <p className="text-xs font-medium text-primary" style={{ fontFamily: "'Manrope', sans-serif" }} data-testid="guest-banner">
                        You're browsing as a guest (read-only)
                    </p>
                    <Link to="/" onClick={handleLogout} className="text-xs font-bold text-primary hover:underline whitespace-nowrap" data-testid="guest-signup-link">
                        Sign up free
                    </Link>
                </div>
            )}

            {/* Offline Banner */}
            {isOffline && (
                <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center gap-2 animate-fade-in" data-testid="offline-banner">
                    <WifiOff className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                        You're offline — viewing cached content. Changes will sync when reconnected.
                    </p>
                </div>
            )}

            {/* Main Content — extra bottom padding on mobile for tab bar */}
            <main className="pb-20 md:pb-8 px-4 md:px-0">
                {children}
            </main>

            {/* Mobile Bottom Tab Bar */}
            <nav
                className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-border"
                style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
                data-testid="bottom-tab-bar"
            >
                <div className="flex items-center justify-around h-16">
                    {navItems.map(function(item) {
                        var active = isPathActive(item.match, location.pathname);
                        return (
                            <Link
                                key={item.label}
                                to={item.path}
                                className={cn(
                                    "flex flex-col items-center justify-center gap-0.5 flex-1 py-2 transition-colors",
                                    active ? "text-primary" : "text-muted-foreground"
                                )}
                                data-testid={"bottom-nav-" + item.label.toLowerCase()}
                            >
                                <item.icon className={cn("w-5 h-5 transition-all", active && "stroke-[2.5]")} />
                                <span className={cn("text-[10px] font-medium transition-all", active && "font-semibold")}>
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
};

export default Layout;

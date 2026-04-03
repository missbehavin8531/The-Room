import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
    Home, 
    BookOpen, 
    MessageCircle, 
    Mail, 
    Settings, 
    LogOut,
    User,
    Search as SearchIcon,
    Shield,
    TrendingUp,
    Calendar
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

// Bottom nav: max 5 core items
var bottomNavItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/courses', icon: BookOpen, label: 'Courses' },
    { path: '/search', icon: SearchIcon, label: 'Search' },
    { path: '/chat', icon: MessageCircle, label: 'Chat' },
    { path: '/settings', icon: Settings, label: 'Settings' },
];

// Desktop top nav: all items
var desktopNavItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/courses', icon: BookOpen, label: 'Courses' },
    { path: '/progress', icon: TrendingUp, label: 'Progress' },
    { path: '/search', icon: SearchIcon, label: 'Search' },
    { path: '/chat', icon: MessageCircle, label: 'Chat' },
    { path: '/messages', icon: Mail, label: 'Messages' },
];

var adminNavItem = { path: '/admin', icon: Shield, label: 'Admin' };
var attendanceNavItem = { path: '/attendance', icon: Calendar, label: 'Attendance' };

export var Layout = function Layout(props) {
    var children = props.children;
    var auth = useAuth();
    var user = auth.user;
    var logout = auth.logout;
    var isApproved = auth.isApproved;
    var isTeacherOrAdmin = auth.isTeacherOrAdmin;
    var location = useLocation();
    var navigate = useNavigate();

    function handleLogout() {
        logout();
        navigate('/login');
    }

    var allDesktopNav = isTeacherOrAdmin 
        ? desktopNavItems.concat([attendanceNavItem, adminNavItem])
        : desktopNavItems;

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

    return (
        <div className="min-h-screen bg-background">
            {/* Desktop Header - hidden on mobile */}
            <header className="hidden md:block sticky top-0 z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border-b border-border">
                <div className="container mx-auto px-8">
                    <div className="flex items-center justify-between h-16">
                        <Link to="/" className="flex items-center gap-3 shrink-0">
                            <img src="/logo.png" alt="The Room" className="w-10 h-10 rounded-xl" />
                            <div className="flex flex-col">
                                <span className="font-serif font-bold text-xl leading-tight">The Room</span>
                                {user && user.church_name && (
                                    <span className="text-xs text-muted-foreground leading-tight">{user.church_name}</span>
                                )}
                            </div>
                        </Link>

                        <nav className="flex items-center gap-1">
                            {allDesktopNav.map(function(item) {
                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        className={cn(
                                            "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors",
                                            location.pathname === item.path
                                                ? "bg-primary text-primary-foreground"
                                                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                        )}
                                    >
                                        <item.icon className="w-4 h-4" />
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </nav>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="flex items-center gap-2">
                                    <Avatar className="w-8 h-8">
                                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                            {getInitials(user && user.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="hidden lg:inline">{user && user.name}</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <div className="px-2 py-1.5">
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
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                                    <LogOut className="w-4 h-4 mr-2" />Sign Out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </header>

            {/* Mobile Header - visible only on mobile */}
            <header className="md:hidden sticky top-0 z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border-b border-border">
                <div className="flex items-center justify-between px-4 h-14">
                    <Link to="/" className="flex items-center gap-2">
                        <img src="/logo.png" alt="The Room" className="w-8 h-8 rounded-lg" />
                        <div className="flex flex-col">
                            <span className="font-serif font-bold text-lg leading-tight">The Room</span>
                            {user && user.church_name && (
                                <span className="text-[10px] text-muted-foreground leading-tight">{user.church_name}</span>
                            )}
                        </div>
                    </Link>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="p-1.5">
                                <Avatar className="w-8 h-8">
                                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                        {getInitials(user && user.name)}
                                    </AvatarFallback>
                                </Avatar>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
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
                                <Link to="/progress" className="flex items-center">
                                    <TrendingUp className="w-4 h-4 mr-2" />Progress
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link to="/messages" className="flex items-center">
                                    <Mail className="w-4 h-4 mr-2" />Messages
                                </Link>
                            </DropdownMenuItem>
                            {isTeacherOrAdmin && (
                                <DropdownMenuItem asChild>
                                    <Link to="/attendance" className="flex items-center">
                                        <Calendar className="w-4 h-4 mr-2" />Attendance
                                    </Link>
                                </DropdownMenuItem>
                            )}
                            {isTeacherOrAdmin && (
                                <DropdownMenuItem asChild>
                                    <Link to="/admin" className="flex items-center">
                                        <Shield className="w-4 h-4 mr-2" />Admin Panel
                                    </Link>
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                                <LogOut className="w-4 h-4 mr-2" />Sign Out
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>

            {/* Main Content */}
            <main className="pb-24 md:pb-8 px-4 md:px-0">
                {children}
            </main>

            {/* Mobile Bottom Navigation - 5 items max */}
            <nav className="md:hidden mobile-nav" data-testid="mobile-nav">
                <div className="flex items-center justify-around py-1.5 px-1">
                    {bottomNavItems.map(function(item) {
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                data-testid={'nav-' + item.label.toLowerCase()}
                                className={cn(
                                    "mobile-nav-item",
                                    location.pathname === item.path && "active"
                                )}
                            >
                                <item.icon className="w-5 h-5" />
                                <span className="text-[10px] mt-0.5">{item.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
};

export default Layout;

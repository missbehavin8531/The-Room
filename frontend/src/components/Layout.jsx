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
    Menu,
    X,
    Shield,
    TrendingUp
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Avatar, AvatarFallback } from './ui/avatar';
import { getInitials } from '../lib/utils';

const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/courses', icon: BookOpen, label: 'Courses' },
    { path: '/progress', icon: TrendingUp, label: 'Progress' },
    { path: '/chat', icon: MessageCircle, label: 'Chat' },
    { path: '/messages', icon: Mail, label: 'Messages' },
];

const adminNavItem = { path: '/admin', icon: Shield, label: 'Admin' };

export const Layout = ({ children }) => {
    const { user, logout, isApproved, isAdmin, isTeacherOrAdmin } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const allNavItems = isTeacherOrAdmin 
        ? [...navItems, adminNavItem]
        : navItems;

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
                        Hi <strong>{user?.name?.split(' ')[0]}</strong>! 👋
                    </p>
                    <p className="text-muted-foreground mb-6">
                        An admin will approve your account shortly. You'll get full access to lessons, discussions, and more!
                    </p>
                    <div className="p-4 bg-muted/50 rounded-xl mb-6">
                        <p className="text-sm text-muted-foreground">
                            Signed in as: <strong>{user?.email}</strong>
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
            {/* Desktop Header */}
            <header className="hidden md:block sticky top-0 z-40 bg-white/90 backdrop-blur-lg border-b border-border">
                <div className="container mx-auto px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <Link to="/" className="flex items-center gap-3">
                            <img src="/logo.png" alt="The Room" className="w-10 h-10 rounded-xl" />
                            <span className="font-serif font-bold text-xl">The Room</span>
                        </Link>

                        {/* Desktop Nav */}
                        <nav className="flex items-center gap-1">
                            {allNavItems.map((item) => (
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
                            ))}
                        </nav>

                        {/* User Menu */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="flex items-center gap-2">
                                    <Avatar className="w-8 h-8">
                                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                            {getInitials(user?.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="hidden lg:inline">{user?.name}</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <div className="px-2 py-1.5">
                                    <p className="text-sm font-medium">{user?.name}</p>
                                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                                    <span className={cn(
                                        "inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium capitalize",
                                        user?.role === 'admin' ? 'bg-red-100 text-red-800' :
                                        user?.role === 'teacher' ? 'bg-blue-100 text-blue-800' :
                                        'bg-green-100 text-green-800'
                                    )}>
                                        {user?.role}
                                    </span>
                                </div>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                                    <LogOut className="w-4 h-4 mr-2" />
                                    Sign Out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </header>

            {/* Mobile Header */}
            <header className="md:hidden sticky top-0 z-40 bg-white/90 backdrop-blur-lg border-b border-border">
                <div className="flex items-center justify-between px-4 h-14">
                    <Link to="/" className="flex items-center gap-2">
                        <img src="/logo.png" alt="The Room" className="w-8 h-8 rounded-lg" />
                        <span className="font-serif font-bold">The Room</span>
                    </Link>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="p-2">
                                <Avatar className="w-8 h-8">
                                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                        {getInitials(user?.name)}
                                    </AvatarFallback>
                                </Avatar>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <div className="px-2 py-1.5">
                                <p className="text-sm font-medium">{user?.name}</p>
                                <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
                            </div>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                                <Link to="/settings" className="flex items-center">
                                    <Settings className="w-4 h-4 mr-2" />
                                    Settings
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                                <LogOut className="w-4 h-4 mr-2" />
                                Sign Out
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>

            {/* Main Content */}
            <main className="pb-32 md:pb-8">
                {children}
            </main>

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden mobile-nav" data-testid="mobile-nav">
                <div className="flex items-center justify-around py-2">
                    {allNavItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            data-testid={`nav-${item.label.toLowerCase()}`}
                            className={cn(
                                "mobile-nav-item",
                                location.pathname === item.path && "active"
                            )}
                        >
                            <item.icon className="w-5 h-5" />
                            <span className="text-xs mt-1">{item.label}</span>
                        </Link>
                    ))}
                </div>
            </nav>
        </div>
    );
};

export default Layout;

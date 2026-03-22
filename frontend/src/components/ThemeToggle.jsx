import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Sun, Moon, Monitor } from 'lucide-react';

const THEME_KEY = 'theroom-theme';

function ThemeToggle() {
    const [theme, setTheme] = useState('system');

    useEffect(() => {
        const saved = localStorage.getItem(THEME_KEY);
        if (saved) {
            setTheme(saved);
            applyTheme(saved);
        } else {
            applyTheme('system');
        }
    }, []);

    const applyTheme = (newTheme) => {
        const root = document.documentElement;
        
        if (newTheme === 'dark') {
            root.classList.add('dark');
        } else if (newTheme === 'light') {
            root.classList.remove('dark');
        } else {
            // System preference
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                root.classList.add('dark');
            } else {
                root.classList.remove('dark');
            }
        }
    };

    const handleThemeChange = (newTheme) => {
        setTheme(newTheme);
        localStorage.setItem(THEME_KEY, newTheme);
        applyTheme(newTheme);
    };

    // Listen for system theme changes
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = () => {
            if (theme === 'system') {
                applyTheme('system');
            }
        };
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, [theme]);

    return (
        <Card data-testid="theme-toggle">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Sun className="w-5 h-5" />
                    Appearance
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                    Choose your preferred color theme
                </p>
                <div className="flex gap-2">
                    <Button
                        variant={theme === 'light' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleThemeChange('light')}
                        className="flex-1"
                        data-testid="theme-light"
                    >
                        <Sun className="w-4 h-4 mr-2" />
                        Light
                    </Button>
                    <Button
                        variant={theme === 'dark' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleThemeChange('dark')}
                        className="flex-1"
                        data-testid="theme-dark"
                    >
                        <Moon className="w-4 h-4 mr-2" />
                        Dark
                    </Button>
                    <Button
                        variant={theme === 'system' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleThemeChange('system')}
                        className="flex-1"
                        data-testid="theme-system"
                    >
                        <Monitor className="w-4 h-4 mr-2" />
                        System
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

export default ThemeToggle;

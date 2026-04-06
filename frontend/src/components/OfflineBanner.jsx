import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

export const OfflineBanner = () => {
    const isOnline = useOnlineStatus();

    if (isOnline) return null;

    return (
        <div
            className="fixed top-0 left-0 right-0 z-50 bg-amber-600 text-white text-center py-2 px-4 text-sm font-medium flex items-center justify-center gap-2 animate-in slide-in-from-top duration-300"
            data-testid="offline-banner"
        >
            <WifiOff className="w-4 h-4" />
            You're offline — cached content may be shown
        </div>
    );
};

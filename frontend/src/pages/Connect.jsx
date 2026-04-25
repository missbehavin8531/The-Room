import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { Chat } from './Chat';
import { Messages } from './Messages';
import { cn } from '../lib/utils';
import { MessageCircle, Mail } from 'lucide-react';

export default function Connect() {
    var [searchParams] = useSearchParams();
    var initialTab = searchParams.get('tab') === 'direct' ? 'direct' : 'chat';
    var [tab, setTab] = useState(initialTab);
    var { isGuest } = useAuth();

    return (
        <Layout>
            <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-9rem)] md:h-[calc(100vh-6rem)]" data-testid="connect-page">
                {/* Header */}
                <div className="flex items-center justify-between pt-4 pb-2">
                    <h1 className="text-xl font-bold" style={{ fontFamily: "'Fraunces', serif" }}>
                        Connect
                    </h1>
                </div>

                {/* Tab Switcher */}
                <div className="flex gap-1 p-1 bg-muted/60 rounded-xl mb-3 shrink-0" data-testid="connect-tabs">
                    <button
                        onClick={function() { setTab('chat'); }}
                        className={cn(
                            "flex items-center justify-center gap-1.5 flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200",
                            tab === 'chat'
                                ? "bg-white dark:bg-gray-800 shadow-sm text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                        data-testid="connect-tab-chat"
                    >
                        <MessageCircle className="w-3.5 h-3.5" />
                        Group Chat
                    </button>
                    <button
                        onClick={function() { setTab('direct'); }}
                        className={cn(
                            "flex items-center justify-center gap-1.5 flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200",
                            tab === 'direct'
                                ? "bg-white dark:bg-gray-800 shadow-sm text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                        data-testid="connect-tab-direct"
                    >
                        <Mail className="w-3.5 h-3.5" />
                        Direct Messages
                    </button>
                </div>

                {/* Tab Content */}
                <div className="flex-grow overflow-hidden min-h-0">
                    {tab === 'chat' && <Chat embedded />}
                    {tab === 'direct' && <Messages embedded />}
                </div>
            </div>
        </Layout>
    );
}

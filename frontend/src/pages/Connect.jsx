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
            <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-12rem)] md:h-[calc(100vh-6rem)] page-container" data-testid="connect-page">
                {/* Header */}
                <div className="space-y-1 pt-6 pb-3 animate-fade-in">
                    <p className="text-xs tracking-widest uppercase font-semibold text-muted-foreground" style={{ fontFamily: "'Manrope', sans-serif" }}>
                        Community
                    </p>
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
                        Connect
                    </h1>
                </div>

                {/* Tab Switcher */}
                <div className="pill-tabs mb-3 shrink-0 animate-fade-in" style={{ animationDelay: '0.05s' }} data-testid="connect-tabs">
                    <button
                        onClick={function() { setTab('chat'); }}
                        className={cn("pill-tab flex-1", tab === 'chat' && "pill-tab-active")}
                        data-testid="connect-tab-chat"
                    >
                        <MessageCircle className="w-3.5 h-3.5" />
                        Group Chat
                    </button>
                    <button
                        onClick={function() { setTab('direct'); }}
                        className={cn("pill-tab flex-1", tab === 'direct' && "pill-tab-active")}
                        data-testid="connect-tab-direct"
                    >
                        <Mail className="w-3.5 h-3.5" />
                        Direct Messages
                    </button>
                </div>

                {/* Tab Content */}
                <div className="flex-grow overflow-hidden min-h-0 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                    {tab === 'chat' && <Chat embedded />}
                    {tab === 'direct' && <Messages embedded />}
                </div>
            </div>
        </Layout>
    );
}

import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { Admin } from './Admin';
import { TeacherDashboard } from './TeacherDashboard';
import AttendanceReport from './AttendanceReport';
import SecurityLog from './SecurityLog';
import { cn } from '../lib/utils';
import { Shield, Users, Calendar, ShieldAlert, Share2 } from 'lucide-react';

export default function ManagePage() {
    var { isAdmin, isTeacher } = useAuth();
    var [searchParams] = useSearchParams();

    var tabs = [];
    if (isAdmin) {
        tabs = [
            { id: 'admin', label: 'Members', icon: Users },
            { id: 'attendance', label: 'Attendance', icon: Calendar },
            { id: 'security', label: 'Security', icon: ShieldAlert },
        ];
    } else if (isTeacher) {
        tabs = [
            { id: 'group', label: 'My Group', icon: Share2 },
            { id: 'attendance', label: 'Attendance', icon: Calendar },
        ];
    }

    var initialTab = searchParams.get('tab') || tabs[0]?.id || 'admin';
    if (!tabs.find(function(t) { return t.id === initialTab; })) {
        initialTab = tabs[0]?.id || 'admin';
    }
    var [activeTab, setActiveTab] = useState(initialTab);

    return (
        <Layout>
            <div className="max-w-6xl mx-auto py-6 space-y-5 page-container" data-testid="manage-page">
                {/* Header */}
                <div className="space-y-1 animate-fade-in">
                    <p className="text-xs tracking-widest uppercase font-semibold text-muted-foreground" style={{ fontFamily: "'Manrope', sans-serif" }}>
                        {isAdmin ? 'Administration' : 'My Group'}
                    </p>
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
                        Manage
                    </h1>
                </div>

                {/* Tab Switcher */}
                <div className="pill-tabs animate-fade-in" style={{ animationDelay: '0.05s' }} data-testid="manage-tabs">
                    {tabs.map(function(tab) {
                        var active = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={function() { setActiveTab(tab.id); }}
                                className={cn("pill-tab", active && "pill-tab-active")}
                                data-testid={"manage-tab-" + tab.id}
                            >
                                <tab.icon className="w-3.5 h-3.5" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Tab Content */}
                <div className="min-h-[400px] animate-fade-in" style={{ animationDelay: '0.1s' }}>
                    {activeTab === 'admin' && isAdmin && <Admin embedded />}
                    {activeTab === 'group' && !isAdmin && <TeacherDashboard embedded />}
                    {activeTab === 'attendance' && <AttendanceReport embedded />}
                    {activeTab === 'security' && isAdmin && <SecurityLog embedded />}
                </div>
            </div>
        </Layout>
    );
}

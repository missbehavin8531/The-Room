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
    // Validate the tab exists
    if (!tabs.find(function(t) { return t.id === initialTab; })) {
        initialTab = tabs[0]?.id || 'admin';
    }
    var [activeTab, setActiveTab] = useState(initialTab);

    return (
        <Layout>
            <div className="max-w-6xl mx-auto py-4 space-y-4" data-testid="manage-page">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ fontFamily: "'Fraunces', serif" }}>
                            <Shield className="w-6 h-6 text-primary" />
                            Manage
                        </h1>
                        <p className="text-sm text-muted-foreground" style={{ fontFamily: "'Manrope', sans-serif" }}>
                            {isAdmin ? 'Admin tools, attendance, and security' : 'Group management and attendance'}
                        </p>
                    </div>
                </div>

                {/* Tab Switcher */}
                <div className="flex gap-1 p-1 bg-muted/60 rounded-xl overflow-x-auto" data-testid="manage-tabs">
                    {tabs.map(function(tab) {
                        var active = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={function() { setActiveTab(tab.id); }}
                                className={cn(
                                    "flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200",
                                    active
                                        ? "bg-white dark:bg-gray-800 shadow-sm text-foreground"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                                data-testid={"manage-tab-" + tab.id}
                            >
                                <tab.icon className="w-3.5 h-3.5" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Tab Content */}
                <div className="min-h-[400px]">
                    {activeTab === 'admin' && isAdmin && <Admin embedded />}
                    {activeTab === 'group' && !isAdmin && <TeacherDashboard embedded />}
                    {activeTab === 'attendance' && <AttendanceReport embedded />}
                    {activeTab === 'security' && isAdmin && <SecurityLog embedded />}
                </div>
            </div>
        </Layout>
    );
}

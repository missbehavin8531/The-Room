import React from 'react';
import { Layout } from '../components/Layout';
import NotificationSettings from '../components/NotificationSettings';
import { Settings as SettingsIcon } from 'lucide-react';

function Settings() {
    return (
        <Layout>
            <div className="max-w-2xl mx-auto" data-testid="settings-page">
                <h1 className="text-3xl font-serif font-bold mb-6 flex items-center gap-3">
                    <SettingsIcon className="w-8 h-8" />
                    Settings
                </h1>
                
                <NotificationSettings />
            </div>
        </Layout>
    );
}

export default Settings;

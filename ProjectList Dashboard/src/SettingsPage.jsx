import { useState } from 'react'
import {
    Settings as SettingsIcon,
    User,
    Bell,
    Key,
    Globe,
    Moon,
    Palette,
    Database,
    Shield,
    Zap,
    Save,
    RefreshCw,
    ChevronRight,
    Check
} from 'lucide-react'

function SettingSection({ title, icon: Icon, children }) {
    return (
        <div className="bg-slate-800/50 rounded-xl border border-white/10 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
                <Icon size={18} className="text-gray-400" />
                <h3 className="font-semibold text-white">{title}</h3>
            </div>
            <div className="p-4">
                {children}
            </div>
        </div>
    )
}

function Toggle({ enabled, onChange, label }) {
    return (
        <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-300">{label}</span>
            <button
                onClick={() => onChange(!enabled)}
                className={`w-12 h-6 rounded-full transition-colors ${enabled ? 'bg-blue-600' : 'bg-slate-700'}`}
            >
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
        </div>
    )
}

export default function SettingsPage() {
    const [settings, setSettings] = useState({
        autoRefresh: true,
        refreshInterval: 15,
        notifications: true,
        soundAlerts: false,
        darkMode: true,
        compactView: false,
        autoStart: true,
        maxTerminals: 5,
        apiKey: '••••••••••••••••',
        workspace: '/Users/isaiahdupree/Documents/Software'
    })

    const updateSetting = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }))
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            {/* Header */}
            <header className="border-b border-white/10 sticky top-0 bg-slate-950/90 backdrop-blur-sm z-10">
                <div className="max-w-4xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-500 to-gray-700 flex items-center justify-center">
                                <SettingsIcon size={24} className="text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold">Settings</h1>
                                <p className="text-sm text-gray-400">Configure your dashboard</p>
                            </div>
                        </div>
                        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm">
                            <Save size={16} />
                            Save Changes
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
                {/* Profile */}
                <SettingSection title="Profile" icon={User}>
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-2xl font-bold">
                            I
                        </div>
                        <div>
                            <div className="font-semibold text-white">Isaiah Dupree</div>
                            <div className="text-sm text-gray-400">Pro Plan • Active</div>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div>
                            <label className="text-sm text-gray-400 block mb-1">Email</label>
                            <input
                                type="email"
                                value="isaiah@example.com"
                                className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm"
                                readOnly
                            />
                        </div>
                    </div>
                </SettingSection>

                {/* Auto-Refresh */}
                <SettingSection title="Auto-Refresh" icon={RefreshCw}>
                    <Toggle
                        label="Enable auto-refresh"
                        enabled={settings.autoRefresh}
                        onChange={(v) => updateSetting('autoRefresh', v)}
                    />
                    <div className="mt-3">
                        <label className="text-sm text-gray-400 block mb-2">Refresh interval (seconds)</label>
                        <select
                            value={settings.refreshInterval}
                            onChange={(e) => updateSetting('refreshInterval', parseInt(e.target.value))}
                            className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm w-full"
                        >
                            <option value={5}>5 seconds</option>
                            <option value={10}>10 seconds</option>
                            <option value={15}>15 seconds</option>
                            <option value={30}>30 seconds</option>
                            <option value={60}>1 minute</option>
                        </select>
                    </div>
                </SettingSection>

                {/* Notifications */}
                <SettingSection title="Notifications" icon={Bell}>
                    <Toggle
                        label="Enable notifications"
                        enabled={settings.notifications}
                        onChange={(v) => updateSetting('notifications', v)}
                    />
                    <Toggle
                        label="Sound alerts"
                        enabled={settings.soundAlerts}
                        onChange={(v) => updateSetting('soundAlerts', v)}
                    />
                </SettingSection>

                {/* Appearance */}
                <SettingSection title="Appearance" icon={Palette}>
                    <Toggle
                        label="Dark mode"
                        enabled={settings.darkMode}
                        onChange={(v) => updateSetting('darkMode', v)}
                    />
                    <Toggle
                        label="Compact view"
                        enabled={settings.compactView}
                        onChange={(v) => updateSetting('compactView', v)}
                    />
                </SettingSection>

                {/* Agent Settings */}
                <SettingSection title="Agent Configuration" icon={Zap}>
                    <Toggle
                        label="Auto-start agent on project open"
                        enabled={settings.autoStart}
                        onChange={(v) => updateSetting('autoStart', v)}
                    />
                    <div className="mt-3">
                        <label className="text-sm text-gray-400 block mb-2">Max concurrent terminals</label>
                        <select
                            value={settings.maxTerminals}
                            onChange={(e) => updateSetting('maxTerminals', parseInt(e.target.value))}
                            className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm w-full"
                        >
                            <option value={3}>3 terminals</option>
                            <option value={5}>5 terminals</option>
                            <option value={10}>10 terminals</option>
                        </select>
                    </div>
                </SettingSection>

                {/* API & Authentication */}
                <SettingSection title="API & Authentication" icon={Key}>
                    <div className="space-y-3">
                        <div>
                            <label className="text-sm text-gray-400 block mb-1">Claude API Key</label>
                            <div className="flex gap-2">
                                <input
                                    type="password"
                                    value={settings.apiKey}
                                    className="flex-1 bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm"
                                    readOnly
                                />
                                <button className="px-3 py-2 bg-slate-700 rounded-lg text-sm hover:bg-slate-600">
                                    Update
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="text-sm text-gray-400 block mb-1">Workspace Directory</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={settings.workspace}
                                    className="flex-1 bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm"
                                    readOnly
                                />
                                <button className="px-3 py-2 bg-slate-700 rounded-lg text-sm hover:bg-slate-600">
                                    Browse
                                </button>
                            </div>
                        </div>
                    </div>
                </SettingSection>

                {/* About */}
                <SettingSection title="About" icon={Globe}>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-400">Version</span>
                            <span className="text-white">1.0.0</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Build</span>
                            <span className="text-white">2025.12.06</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">License</span>
                            <span className="text-white">Pro</span>
                        </div>
                    </div>
                </SettingSection>
            </main>
        </div>
    )
}

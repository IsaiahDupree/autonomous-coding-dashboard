import { useState, useEffect } from 'react'
import {
    FileText,
    Folder,
    FolderOpen,
    File,
    Code,
    ChevronRight,
    ChevronDown,
    Search,
    RefreshCw,
    Download,
    Eye
} from 'lucide-react'

// Mock file structure
const mockFileSystem = [
    {
        name: 'autonomous-coding-platform',
        type: 'folder',
        expanded: true,
        children: [
            {
                name: 'app',
                type: 'folder',
                children: [
                    { name: 'page.tsx', type: 'file', language: 'typescript', size: '12.4 KB' },
                    { name: 'layout.tsx', type: 'file', language: 'typescript', size: '2.1 KB' },
                    { name: 'globals.css', type: 'file', language: 'css', size: '1.8 KB' },
                    {
                        name: 'project',
                        type: 'folder',
                        children: [
                            {
                                name: '[id]', type: 'folder', children: [
                                    { name: 'page.tsx', type: 'file', language: 'typescript', size: '8.2 KB' }
                                ]
                            }
                        ]
                    }
                ]
            },
            {
                name: 'components',
                type: 'folder',
                children: [
                    {
                        name: 'ui', type: 'folder', children: [
                            { name: 'button.tsx', type: 'file', language: 'typescript', size: '1.2 KB' },
                            { name: 'card.tsx', type: 'file', language: 'typescript', size: '1.8 KB' },
                            { name: 'badge.tsx', type: 'file', language: 'typescript', size: '0.9 KB' }
                        ]
                    },
                    {
                        name: 'project', type: 'folder', children: [
                            { name: 'AgentControls.tsx', type: 'file', language: 'typescript', size: '2.4 KB' },
                            { name: 'TerminalPanel.tsx', type: 'file', language: 'typescript', size: '3.1 KB' },
                            { name: 'PRDEditor.tsx', type: 'file', language: 'typescript', size: '4.2 KB' }
                        ]
                    }
                ]
            },
            {
                name: 'public',
                type: 'folder',
                children: [
                    { name: 'projects.json', type: 'file', language: 'json', size: '28.5 KB' }
                ]
            },
            { name: 'package.json', type: 'file', language: 'json', size: '1.4 KB' },
            { name: 'tailwind.config.js', type: 'file', language: 'javascript', size: '0.8 KB' },
            { name: 'README.md', type: 'file', language: 'markdown', size: '2.1 KB' }
        ]
    }
]

function FileIcon({ type, language }) {
    if (type === 'folder') return <Folder className="text-yellow-400" size={16} />

    const colors = {
        typescript: 'text-blue-400',
        javascript: 'text-yellow-400',
        json: 'text-green-400',
        css: 'text-pink-400',
        markdown: 'text-gray-400'
    }

    return <Code className={colors[language] || 'text-gray-400'} size={16} />
}

function FileTree({ items, depth = 0 }) {
    const [expanded, setExpanded] = useState({})

    const toggleFolder = (name) => {
        setExpanded(prev => ({ ...prev, [name]: !prev[name] }))
    }

    return (
        <div>
            {items.map((item, idx) => (
                <div key={idx}>
                    <div
                        className={`flex items-center gap-2 py-1.5 px-2 rounded hover:bg-white/5 cursor-pointer`}
                        style={{ paddingLeft: `${depth * 16 + 8}px` }}
                        onClick={() => item.type === 'folder' && toggleFolder(item.name)}
                    >
                        {item.type === 'folder' && (
                            expanded[item.name] || item.expanded
                                ? <ChevronDown size={14} className="text-gray-500" />
                                : <ChevronRight size={14} className="text-gray-500" />
                        )}
                        <FileIcon type={item.type} language={item.language} />
                        <span className="text-sm text-gray-300">{item.name}</span>
                        {item.size && <span className="text-xs text-gray-500 ml-auto">{item.size}</span>}
                    </div>
                    {item.type === 'folder' && (expanded[item.name] || item.expanded) && item.children && (
                        <FileTree items={item.children} depth={depth + 1} />
                    )}
                </div>
            ))}
        </div>
    )
}

export default function FilesPage() {
    const [searchQuery, setSearchQuery] = useState('')

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            {/* Header */}
            <header className="border-b border-white/10 sticky top-0 bg-slate-950/90 backdrop-blur-sm z-10">
                <div className="max-w-6xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center">
                                <FolderOpen size={24} className="text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold">Files</h1>
                                <p className="text-sm text-gray-400">Browse project files and artifacts</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search files..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 pr-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-6xl mx-auto px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* File Tree */}
                    <div className="lg:col-span-1">
                        <div className="bg-slate-800/50 rounded-xl border border-white/10 p-4">
                            <h2 className="text-sm font-semibold text-gray-400 mb-4">PROJECT STRUCTURE</h2>
                            <FileTree items={mockFileSystem} />
                        </div>
                    </div>

                    {/* File Preview / Key Files */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-slate-800/50 rounded-xl border border-white/10 p-4">
                            <h2 className="text-sm font-semibold text-gray-400 mb-4">KEY ARTIFACTS</h2>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <FileText className="text-orange-400" size={20} />
                                        <div>
                                            <div className="font-medium text-white">feature_list.json</div>
                                            <div className="text-xs text-gray-400">Source of truth for 200+ features</div>
                                        </div>
                                    </div>
                                    <button className="px-3 py-1 text-sm rounded bg-orange-600 hover:bg-orange-700">
                                        <Eye size={14} className="inline mr-1" />
                                        View
                                    </button>
                                </div>

                                <div className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <FileText className="text-blue-400" size={20} />
                                        <div>
                                            <div className="font-medium text-white">claude-progress.txt</div>
                                            <div className="text-xs text-gray-400">Session handoff notes</div>
                                        </div>
                                    </div>
                                    <button className="px-3 py-1 text-sm rounded bg-blue-600 hover:bg-blue-700">
                                        <Eye size={14} className="inline mr-1" />
                                        View
                                    </button>
                                </div>

                                <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <Code className="text-green-400" size={20} />
                                        <div>
                                            <div className="font-medium text-white">init.sh</div>
                                            <div className="text-xs text-gray-400">Test runner and setup script</div>
                                        </div>
                                    </div>
                                    <button className="px-3 py-1 text-sm rounded bg-green-600 hover:bg-green-700">
                                        <Eye size={14} className="inline mr-1" />
                                        View
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-800/50 rounded-xl border border-white/10 p-4">
                            <h2 className="text-sm font-semibold text-gray-400 mb-4">RECENT CHANGES</h2>
                            <div className="space-y-2">
                                {[
                                    { file: 'src/components/Payment.tsx', action: 'Modified', time: '2 min ago', color: 'text-yellow-400' },
                                    { file: 'feature_list.json', action: 'Updated', time: '2 min ago', color: 'text-blue-400' },
                                    { file: 'src/api/stripe/route.ts', action: 'Added', time: '5 min ago', color: 'text-green-400' },
                                    { file: 'tests/payment.test.ts', action: 'Added', time: '5 min ago', color: 'text-green-400' }
                                ].map((change, i) => (
                                    <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs ${change.color}`}>{change.action}</span>
                                            <span className="text-sm text-gray-300">{change.file}</span>
                                        </div>
                                        <span className="text-xs text-gray-500">{change.time}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}

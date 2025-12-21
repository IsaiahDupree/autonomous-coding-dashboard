import { useState, useEffect, useRef } from 'react'
import {
    Terminal as TerminalIcon,
    Play,
    Pause,
    Square,
    RefreshCw,
    Copy,
    Download,
    Maximize2,
    Minimize2,
    Plus,
    X
} from 'lucide-react'

// Mock terminal output generator
function generateMockOutput() {
    const outputs = [
        '$ npm run dev',
        '> project-radar@1.0.0 dev',
        '> vite',
        '',
        '  VITE v5.4.21  ready in 1023 ms',
        '',
        '  ➜  Local:   http://localhost:4001/',
        '  ➜  Network: http://192.168.1.118:4001/',
        '',
        '[Agent] Starting autonomous coding session...',
        '[Agent] Reading feature_list.json...',
        '[Agent] Found 142 passing, 58 pending features',
        '[Agent] Picking next feature: #143 - Payment integration',
        '[Agent] Running regression tests...',
        '✓ 142 tests passed',
        '[Agent] Implementing feature #143...',
        '[Agent] Writing src/components/Payment.tsx',
        '[Agent] Running tests for feature #143...',
        '✓ Feature #143 tests passed',
        '[Agent] Committing changes...',
        '[git] Committed: "feat: add payment integration (#143)"',
        '[Agent] Updated feature_list.json: 143/200 passing',
        ''
    ]
    return outputs[Math.floor(Math.random() * outputs.length)]
}

function TerminalPane({ id, name, isActive, onClose, isMaximized }) {
    const [output, setOutput] = useState([
        '$ claude --help',
        'Claude Code (Anthropic)',
        '',
        'USAGE: claude [--help] [--version] [--dangerously-skip-permissions]',
        '',
        'Ready for autonomous coding session...',
        ''
    ])
    const [isRunning, setIsRunning] = useState(false)
    const scrollRef = useRef(null)

    useEffect(() => {
        if (isRunning) {
            const interval = setInterval(() => {
                const newLine = generateMockOutput()
                if (newLine) {
                    setOutput(prev => [...prev, newLine])
                }
            }, 1500)
            return () => clearInterval(interval)
        }
    }, [isRunning])

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [output])

    const handleCopy = () => {
        navigator.clipboard.writeText(output.join('\n'))
    }

    const handleClear = () => {
        setOutput(['$ '])
    }

    return (
        <div className={`flex flex-col ${isMaximized ? 'h-[calc(100vh-200px)]' : 'h-80'} bg-black rounded-lg border border-white/10 overflow-hidden`}>
            {/* Terminal Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-slate-800/50 border-b border-white/10">
                <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-red-500"></span>
                        <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                        <span className="w-3 h-3 rounded-full bg-green-500"></span>
                    </div>
                    <span className="text-sm text-gray-400 ml-2">{name}</span>
                    {isRunning && (
                        <span className="flex items-center gap-1 text-xs text-green-400">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            Running
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={handleCopy} className="p-1.5 hover:bg-white/10 rounded" title="Copy">
                        <Copy size={14} className="text-gray-400" />
                    </button>
                    <button onClick={handleClear} className="p-1.5 hover:bg-white/10 rounded" title="Clear">
                        <X size={14} className="text-gray-400" />
                    </button>
                    {onClose && (
                        <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded text-red-400" title="Close">
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* Terminal Output */}
            <div
                ref={scrollRef}
                className="flex-1 p-4 font-mono text-sm text-green-400 overflow-auto"
            >
                {output.map((line, i) => (
                    <div key={i} className="whitespace-pre-wrap">
                        {line.startsWith('✓') ? (
                            <span className="text-green-400">{line}</span>
                        ) : line.startsWith('[Agent]') ? (
                            <span className="text-cyan-400">{line}</span>
                        ) : line.startsWith('[git]') ? (
                            <span className="text-yellow-400">{line}</span>
                        ) : line.startsWith('$') ? (
                            <span className="text-white">{line}</span>
                        ) : (
                            <span className="text-gray-400">{line}</span>
                        )}
                    </div>
                ))}
                <span className="animate-pulse">▋</span>
            </div>

            {/* Terminal Controls */}
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 border-t border-white/10">
                {isRunning ? (
                    <>
                        <button
                            onClick={() => setIsRunning(false)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 rounded text-sm"
                        >
                            <Pause size={14} />
                            Pause
                        </button>
                        <button
                            onClick={() => { setIsRunning(false); setOutput(['$ ']) }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded text-sm"
                        >
                            <Square size={14} />
                            Stop
                        </button>
                    </>
                ) : (
                    <button
                        onClick={() => setIsRunning(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-sm"
                    >
                        <Play size={14} />
                        Start Agent
                    </button>
                )}
            </div>
        </div>
    )
}

export default function TerminalPage() {
    const [terminals, setTerminals] = useState([
        { id: 1, name: 'Agent Terminal' },
        { id: 2, name: 'System Logs' }
    ])
    const [activeTerminal, setActiveTerminal] = useState(1)
    const [isMaximized, setIsMaximized] = useState(false)

    const addTerminal = () => {
        const newId = Math.max(...terminals.map(t => t.id)) + 1
        setTerminals([...terminals, { id: newId, name: `Terminal ${newId}` }])
        setActiveTerminal(newId)
    }

    const closeTerminal = (id) => {
        if (terminals.length > 1) {
            setTerminals(terminals.filter(t => t.id !== id))
            if (activeTerminal === id) {
                setActiveTerminal(terminals[0].id)
            }
        }
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            {/* Header */}
            <header className="border-b border-white/10 sticky top-0 bg-slate-950/90 backdrop-blur-sm z-10">
                <div className="max-w-6xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center">
                                <TerminalIcon size={24} className="text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold">Terminal</h1>
                                <p className="text-sm text-gray-400">Agent terminals and system logs</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={addTerminal}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm"
                            >
                                <Plus size={14} />
                                New Terminal
                            </button>
                            <button
                                onClick={() => setIsMaximized(!isMaximized)}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-sm"
                            >
                                {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-6xl mx-auto px-6 py-8">
                {/* Terminal Tabs */}
                <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
                    {terminals.map(term => (
                        <button
                            key={term.id}
                            onClick={() => setActiveTerminal(term.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm transition-colors ${activeTerminal === term.id
                                    ? 'bg-slate-800 text-white'
                                    : 'text-gray-400 hover:text-white hover:bg-slate-800/50'
                                }`}
                        >
                            <TerminalIcon size={14} />
                            {term.name}
                        </button>
                    ))}
                </div>

                {/* Active Terminal */}
                {terminals.map(term => (
                    term.id === activeTerminal && (
                        <TerminalPane
                            key={term.id}
                            id={term.id}
                            name={term.name}
                            isActive={true}
                            isMaximized={isMaximized}
                            onClose={terminals.length > 1 ? () => closeTerminal(term.id) : null}
                        />
                    )
                ))}
            </main>
        </div>
    )
}

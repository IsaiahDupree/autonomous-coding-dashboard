/**
 * Create Project Modal Component
 * ================================
 * 
 * Modal for creating new projects with app spec input.
 */

import { useState } from 'react'
import { X, Zap, FileText, Palette, Bot, Users } from 'lucide-react'

const PROJECT_COLORS = [
    '#3B82F6', // Blue
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#EF4444', // Red
    '#F97316', // Orange
    '#EAB308', // Yellow
    '#22C55E', // Green
    '#06B6D4', // Cyan
    '#6366F1', // Indigo
    '#A855F7', // Violet
]

const AUTOMATION_MODES = [
    { value: 'auto-core', label: 'Auto Core', icon: Bot, desc: 'Fully autonomous execution' },
    { value: 'hybrid', label: 'Hybrid', icon: Zap, desc: 'AI + human collaboration' },
    { value: 'human-led', label: 'Human Led', icon: Users, desc: 'Human decides, AI assists' },
]

const LEVEL_OPTIONS = ['low', 'medium', 'high']

export default function CreateProjectModal({ isOpen, onClose, onCreate }) {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        appSpec: '',
        color: PROJECT_COLORS[0],
        automationMode: 'hybrid',
        touchLevel: 'medium',
        profitPotential: 'medium',
        difficulty: 'medium'
    })
    const [isLoading, setIsLoading] = useState(false)
    const [step, setStep] = useState(1) // 1: Basic Info, 2: App Spec, 3: Classification

    if (!isOpen) return null

    const handleSubmit = async () => {
        if (!formData.name.trim()) return

        setIsLoading(true)
        try {
            await onCreate({
                name: formData.name,
                description: formData.description,
                appSpec: formData.appSpec,
                color: formData.color,
                automationMode: formData.automationMode,
                classification: {
                    touch: formData.touchLevel,
                    profit: formData.profitPotential,
                    difficulty: formData.difficulty
                }
            })
            onClose()
            // Reset form
            setFormData({
                name: '',
                description: '',
                appSpec: '',
                color: PROJECT_COLORS[0],
                automationMode: 'hybrid',
                touchLevel: 'medium',
                profitPotential: 'medium',
                difficulty: 'medium'
            })
            setStep(1)
        } catch (err) {
            console.error('Failed to create project:', err)
        } finally {
            setIsLoading(false)
        }
    }

    const nextStep = () => setStep(s => Math.min(s + 1, 3))
    const prevStep = () => setStep(s => Math.max(s - 1, 1))

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-2xl bg-slate-900 rounded-2xl border border-white/10 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
                            style={{ backgroundColor: formData.color }}
                        >
                            {formData.name.charAt(0) || '?'}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Create New Project</h2>
                            <p className="text-sm text-gray-400">Step {step} of 3</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Step Indicators */}
                <div className="flex gap-2 px-6 pt-4">
                    {[1, 2, 3].map(s => (
                        <div
                            key={s}
                            className={`flex-1 h-1 rounded-full transition-colors ${s <= step ? 'bg-blue-500' : 'bg-slate-700'
                                }`}
                        />
                    ))}
                </div>

                {/* Content */}
                <div className="p-6 min-h-[300px]">
                    {/* Step 1: Basic Info */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Project Name *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="My Awesome App"
                                    className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Description
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Brief description of what you're building..."
                                    rows={3}
                                    className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Color
                                </label>
                                <div className="flex gap-2 flex-wrap">
                                    {PROJECT_COLORS.map(color => (
                                        <button
                                            key={color}
                                            onClick={() => setFormData({ ...formData, color })}
                                            className={`w-8 h-8 rounded-lg transition-transform ${formData.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110' : ''
                                                }`}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: App Spec */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                                <FileText size={16} />
                                App Specification (Optional)
                            </div>
                            <p className="text-sm text-gray-500 mb-4">
                                Paste your app specification here. This will be used by the autonomous agent
                                to generate features and build your application.
                            </p>
                            <textarea
                                value={formData.appSpec}
                                onChange={e => setFormData({ ...formData, appSpec: e.target.value })}
                                placeholder={`# My App Specification

## Overview
[Describe your application]

## Features
- Feature 1
- Feature 2

## Technical Requirements
- React/TypeScript frontend
- REST API backend

## Pages
- Home page
- Dashboard
- Settings`}
                                rows={12}
                                className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none font-mono text-sm"
                            />
                        </div>
                    )}

                    {/* Step 3: Classification */}
                    {step === 3 && (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-3">
                                    Automation Mode
                                </label>
                                <div className="grid grid-cols-3 gap-3">
                                    {AUTOMATION_MODES.map(mode => (
                                        <button
                                            key={mode.value}
                                            onClick={() => setFormData({ ...formData, automationMode: mode.value })}
                                            className={`p-4 rounded-xl border text-left transition-all ${formData.automationMode === mode.value
                                                    ? 'border-blue-500 bg-blue-500/10'
                                                    : 'border-white/10 hover:border-white/20'
                                                }`}
                                        >
                                            <mode.icon size={24} className="text-blue-400 mb-2" />
                                            <div className="font-medium text-white">{mode.label}</div>
                                            <div className="text-xs text-gray-500">{mode.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                {[
                                    { key: 'touchLevel', label: 'Touch Level' },
                                    { key: 'profitPotential', label: 'Profit Potential' },
                                    { key: 'difficulty', label: 'Difficulty' }
                                ].map(field => (
                                    <div key={field.key}>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            {field.label}
                                        </label>
                                        <select
                                            value={formData[field.key]}
                                            onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                                            className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                                        >
                                            {LEVEL_OPTIONS.map(opt => (
                                                <option key={opt} value={opt}>
                                                    {opt.charAt(0).toUpperCase() + opt.slice(1)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-white/10">
                    <button
                        onClick={step === 1 ? onClose : prevStep}
                        className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                    >
                        {step === 1 ? 'Cancel' : 'Back'}
                    </button>

                    <div className="flex gap-3">
                        {step < 3 ? (
                            <button
                                onClick={nextStep}
                                disabled={step === 1 && !formData.name.trim()}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                            >
                                Next
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={isLoading || !formData.name.trim()}
                                className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <Zap size={18} />
                                        Create Project
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

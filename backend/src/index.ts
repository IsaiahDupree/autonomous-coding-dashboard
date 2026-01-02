/**
 * Express API Server
 * ===================
 * 
 * Main entry point for the Node.js backend that handles:
 * - Project CRUD
 * - Feature/Work Item management
 * - Test tracking
 * - Proxies to Python agent orchestrator
 */

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import dotenv from 'dotenv';
import { authRouter, requireAuth, AuthenticatedRequest } from './auth';
import { getHarnessManager, HarnessConfig } from './services/harness-manager';
import { getFileWatcher } from './services/file-watcher';
import { getApprovalGates } from './services/approval-gates';
import { getGitService } from './services/git-service';
import { getVisualVerification } from './services/visual-verification';
import { getWebhookNotifications } from './services/webhook-notifications';
import { getSessionReplay } from './services/session-replay';
import { getCostTracking } from './services/cost-tracking';
import { getProjectManager } from './services/project-manager';
import { getAnalytics } from './services/analytics';
import { getScheduler } from './services/scheduler';
import { getClaudeApiKey, isOAuthToken, getEnv, getEnvValue, validateEnvConfig } from './config/env-config';
import * as fs from 'fs';
import * as path from 'path';

// Initialize services
const harnessManager = getHarnessManager();
const fileWatcher = getFileWatcher();
const approvalGates = getApprovalGates();
const gitService = getGitService();
const visualVerification = getVisualVerification();
const webhookNotifications = getWebhookNotifications();
const sessionReplay = getSessionReplay();
const costTracking = getCostTracking();
const projectManager = getProjectManager();
const analytics = getAnalytics();

// Initialize scheduler with rate limiting
// Configure based on API key type (OAuth tokens typically have higher limits)
const apiKey = getClaudeApiKey();
const usingOAuth = isOAuthToken();

const scheduler = getScheduler({
  requestsPerMinute: usingOAuth ? 50 : 30, // Higher limit for OAuth tokens
  maxConcurrent: 1, // Sequential execution for safety
  maxRetries: 3,
  retryDelayMs: 2000,
  exponentialBackoff: true,
  backoffMultiplier: 2,
  maxBackoffMs: 60000,
  circuitBreakerThreshold: 5,
  circuitBreakerTimeout: 60000,
  respectRateLimitHeaders: true,
  minTimeBetweenRequests: usingOAuth ? 1200 : 2000, // Faster for OAuth tokens
});

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
    cors: { origin: '*' }
});

const prisma = new PrismaClient();
const redis = new Redis(getEnvValue('redisUrl') || 'redis://localhost:6379');

// Middleware
app.use(cors({
  origin: ['http://localhost:3535', 'http://localhost:3000', 'http://127.0.0.1:3535'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Auth routes
app.use('/api/auth', authRouter);

// Root route
app.get('/', (req, res) => {
    res.json({
        name: 'Autonomous Coding Dashboard API',
        version: '1.0.0',
        endpoints: {
            health: '/api/health',
            projects: '/api/projects',
            harnesses: '/api/harnesses',
            approvals: '/api/approvals',
        },
        docs: 'See /api/health for status',
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// General harness status endpoint (for feat-010)
app.get('/api/status', async (req, res) => {
    try {
        // Read harness-status.json from the project root (parent of backend directory)
        const projectRoot = path.resolve(__dirname, '..', '..');
        const statusFile = path.join(projectRoot, 'harness-status.json');
        const featureListFile = path.join(projectRoot, 'feature_list.json');

        let harnessStatus: any = {
            status: 'idle',
            sessionType: null,
            sessionNumber: null,
            lastUpdate: null,
        };

        let featureStats: any = {
            total: 0,
            passing: 0,
            pending: 0,
            percentComplete: 0,
        };

        // Try to read harness status
        if (fs.existsSync(statusFile)) {
            try {
                const statusData = JSON.parse(fs.readFileSync(statusFile, 'utf-8'));
                harnessStatus = {
                    status: statusData.status || 'idle',
                    sessionType: statusData.sessionType || null,
                    sessionNumber: statusData.sessionNumber || null,
                    lastUpdate: statusData.lastUpdated || null,
                    pid: statusData.pid || null,
                };

                // If stats are included in harness status, use them
                if (statusData.stats) {
                    featureStats = statusData.stats;
                }
            } catch (e) {
                // Ignore parse errors, use defaults
            }
        }

        // Try to read feature stats from feature_list.json
        if (fs.existsSync(featureListFile)) {
            try {
                const featureData = JSON.parse(fs.readFileSync(featureListFile, 'utf-8'));
                const features = featureData.features || [];
                const passing = features.filter((f: any) => f.passes === true).length;
                const total = features.length;

                featureStats = {
                    total,
                    passing,
                    pending: total - passing,
                    percentComplete: total > 0 ? ((passing / total) * 100).toFixed(1) : '0.0',
                };
            } catch (e) {
                // Ignore parse errors, use defaults or harness status stats
            }
        }

        res.json({
            data: {
                harness: harnessStatus,
                features: featureStats,
            }
        });
    } catch (error: any) {
        res.status(500).json({ error: { message: error.message || 'Failed to get status' } });
    }
});

// Scheduler stats endpoint
app.get('/api/scheduler/stats', (req, res) => {
    try {
        const stats = scheduler.getStats();
        res.json({ data: stats });
    } catch (error: any) {
        res.status(500).json({ error: { message: error.message || 'Failed to get scheduler stats' } });
    }
});

// ============================================
// PROJECTS API
// ============================================

app.get('/api/projects', async (req, res) => {
    try {
        // Use raw SQL to query app schema
        const projects = await prisma.$queryRaw<Array<any>>`
            SELECT 
                id, name, description, status,
                touch_level as "touchLevel",
                profit_potential as "profitPotential",
                difficulty, automation_mode as "automationMode",
                created_at as "createdAt",
                updated_at as "updatedAt"
            FROM app.projects
            ORDER BY updated_at DESC
        `;
        
        // Get counts for each project (handle missing tables gracefully)
        const projectsWithCounts = await Promise.all(
            projects.map(async (project) => {
                try {
                    const [featureCount, workItemCount] = await Promise.all([
                        prisma.$queryRaw<Array<{count: number}>>`
                            SELECT COUNT(*)::int as count FROM app.features WHERE project_id = ${project.id}::uuid
                        `.catch(() => [{count: 0}]),
                        prisma.$queryRaw<Array<{count: number}>>`
                            SELECT COUNT(*)::int as count FROM app.work_items WHERE project_id = ${project.id}::uuid
                        `.catch(() => [{count: 0}])
                    ]);
                    
                    return {
                        ...project,
                        _count: {
                            features: Number(featureCount[0]?.count || 0),
                            workItems: Number(workItemCount[0]?.count || 0)
                        }
                    };
                } catch {
                    return {
                        ...project,
                        _count: { features: 0, workItems: 0 }
                    };
                }
            })
        );
        
        res.json({ data: projectsWithCounts });
    } catch (error: any) {
        console.error('Failed to fetch projects:', error);
        res.status(500).json({ error: { message: error.message || 'Failed to fetch projects' } });
    }
});

app.post('/api/projects', async (req, res) => {
    try {
        const { name, description, appSpec, classification } = req.body;

        const project = await prisma.project.create({
            data: {
                name,
                description,
                touchLevel: classification?.touch || 'medium',
                profitPotential: classification?.profit || 'medium',
                difficulty: classification?.difficulty || 'medium',
                automationMode: classification?.automationMode || 'hybrid',
                orgId: req.body.orgId || 'default-org', // TODO: From auth
            },
        });

        // Create initial spec if provided
        if (appSpec) {
            const spec = await prisma.projectSpec.create({
                data: {
                    projectId: project.id,
                    content: appSpec,
                    version: 1,
                },
            });

            await prisma.project.update({
                where: { id: project.id },
                data: { appSpecVersionId: spec.id },
            });
        }

        res.json({ data: project });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: { message: 'Failed to create project' } });
    }
});

app.get('/api/projects/:id', async (req, res) => {
    try {
        const project = await prisma.project.findUnique({
            where: { id: req.params.id },
            include: {
                appSpec: true,
                repos: true,
                features: { orderBy: { priority: 'desc' } },
                agents: true,
                _count: { select: { workItems: true, testRuns: true } },
            },
        });

        if (!project) {
            return res.status(404).json({ error: { message: 'Project not found' } });
        }

        res.json({ data: project });
    } catch (error) {
        res.status(500).json({ error: { message: 'Failed to fetch project' } });
    }
});

app.patch('/api/projects/:id', async (req, res) => {
    try {
        const project = await prisma.project.update({
            where: { id: req.params.id },
            data: req.body,
        });
        res.json({ data: project });
    } catch (error) {
        res.status(500).json({ error: { message: 'Failed to update project' } });
    }
});

// ============================================
// FEATURES API
// ============================================

app.get('/api/projects/:id/features', async (req, res) => {
    try {
        // First try to read from feature_list.json file (for harness-based projects)
        const projectName = req.params.id;
        const projectPath = path.join(process.cwd(), '..', 'test-projects', projectName);
        const featureListFile = path.join(projectPath, 'feature_list.json');
        
        if (fs.existsSync(featureListFile)) {
            try {
                const featureData = JSON.parse(fs.readFileSync(featureListFile, 'utf-8'));
                const features = (featureData.features || featureData || []).map((f: any, idx: number) => ({
                    id: f.id?.toString() || `F-${idx + 1}`,
                    projectId: req.params.id,
                    featureKey: f.id?.toString() || `F-${idx + 1}`,
                    title: f.name || f.title || `Feature ${idx + 1}`,
                    description: f.description || '',
                    status: f.passes ? 'passing' : (f.status || 'pending'),
                    priority: f.priority || (100 - idx),
                    sessionCompleted: f.session_completed || null,
                    createdAt: f.created_at || new Date().toISOString(),
                    updatedAt: f.updated_at || new Date().toISOString(),
                }));
                return res.json({ data: features });
            } catch (fileError) {
                // If file read fails, fall through to database
            }
        }
        
        // Fallback to database
    try {
        const features = await prisma.feature.findMany({
            where: { projectId: req.params.id },
            include: {
                testCases: { select: { id: true, status: true } },
                _count: { select: { workItems: true } },
            },
            orderBy: { priority: 'desc' },
        });
        res.json({ data: features });
        } catch (dbError: any) {
            // If database fails, return empty array
            console.warn('Database query failed, returning empty features:', dbError.message);
            res.json({ data: [] });
        }
    } catch (error: any) {
        console.error('Failed to fetch features:', error);
        res.json({ data: [] }); // Return empty array instead of error
    }
});

app.post('/api/projects/:id/features/sync', async (req, res) => {
    try {
        const { features } = req.body; // feature_list.json content

        // Upsert features from feature_list.json
        const results = await Promise.all(
            features.map(async (f: any, index: number) => {
                return prisma.feature.upsert({
                    where: {
                        projectId_featureKey: {
                            projectId: req.params.id,
                            featureKey: f.id?.toString() || `F-${index + 1}`,
                        },
                    },
                    update: {
                        title: f.name || f.title,
                        description: f.description,
                        status: f.passes ? 'passing' : 'pending',
                        sessionCompleted: f.session_completed,
                    },
                    create: {
                        projectId: req.params.id,
                        featureKey: f.id?.toString() || `F-${index + 1}`,
                        title: f.name || f.title,
                        description: f.description,
                        status: f.passes ? 'passing' : 'pending',
                        priority: 100 - index,
                    },
                });
            })
        );

        res.json({ data: results, synced: results.length });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: { message: 'Failed to sync features' } });
    }
});

// ============================================
// WORK ITEMS API
// ============================================

app.get('/api/projects/:id/work-items', async (req, res) => {
    try {
        const { status, type, assignee } = req.query;

        const workItems = await prisma.workItem.findMany({
            where: {
                projectId: req.params.id,
                ...(status && { status: status as any }),
                ...(type && { type: type as any }),
                ...(assignee && { assigneeUserId: assignee as string }),
            },
            include: {
                feature: { select: { title: true, status: true } },
                assigneeUser: { select: { name: true, avatarUrl: true } },
                parent: { select: { id: true, title: true } },
                children: { select: { id: true, title: true, status: true } },
            },
            orderBy: { priority: 'desc' },
        });

        res.json({ data: workItems });
    } catch (error) {
        res.status(500).json({ error: { message: 'Failed to fetch work items' } });
    }
});

app.post('/api/projects/:id/work-items', async (req, res) => {
    try {
        const workItem = await prisma.workItem.create({
            data: {
                projectId: req.params.id,
                ...req.body,
            },
        });
        res.json({ data: workItem });
    } catch (error) {
        res.status(500).json({ error: { message: 'Failed to create work item' } });
    }
});

app.patch('/api/projects/:id/work-items/:wid', async (req, res) => {
    try {
        const workItem = await prisma.workItem.update({
            where: { id: req.params.wid },
            data: req.body,
        });

        // Emit status change via Socket.IO
        io.to(`project:${req.params.id}`).emit('work_item_updated', workItem);

        res.json({ data: workItem });
    } catch (error) {
        res.status(500).json({ error: { message: 'Failed to update work item' } });
    }
});

// ============================================
// AGENT RUNS API (Proxy to Python service)
// ============================================

const AGENT_SERVICE_URL = getEnvValue('agentServiceUrl') || 'http://localhost:8000';

app.post('/api/projects/:id/agent-runs', async (req, res) => {
    try {
        const response = await fetch(`${AGENT_SERVICE_URL}/api/agent-runs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                project_id: req.params.id,
                ...req.body,
            }),
        });

        const data = await response.json() as any;

        // Create agent run record in DB
        if (data.run_id) {
            await prisma.agentRun.create({
                data: {
                    id: data.run_id,
                    projectId: req.params.id,
                    agentId: req.body.agentId || (await getOrCreateAgent(req.params.id, data.agent_type)),
                    runType: data.agent_type,
                    status: 'queued',
                    model: req.body.model || 'claude-sonnet-4-5-20250929',
                },
            });
        }

        res.json({ data });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: { message: 'Failed to start agent run' } });
    }
});

app.get('/api/projects/:id/agent-runs', async (req, res) => {
    try {
        // Try database first
    try {
        const runs = await prisma.agentRun.findMany({
            where: { projectId: req.params.id },
            include: {
                _count: { select: { events: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });
            return res.json({ data: runs });
        } catch (dbError: any) {
            // If database fails, create mock runs from harness status
            console.warn('Database query failed, creating mock runs from harness status:', dbError.message);
            
            const projectName = req.params.id;
            const projectPath = path.join(process.cwd(), '..', 'test-projects', projectName);
            const statusFile = path.join(projectPath, 'harness-status.json');
            
            if (fs.existsSync(statusFile)) {
                try {
                    const statusData = JSON.parse(fs.readFileSync(statusFile, 'utf-8'));
                    const mockRuns = [{
                        id: `run-${Date.now()}`,
                        projectId: req.params.id,
                        agentId: 'default-agent',
                        runType: statusData.sessionType?.toLowerCase() || 'coding',
                        status: statusData.status === 'running' ? 'running' : 'completed',
                        model: 'claude-sonnet-4-5-20250929',
                        createdAt: statusData.lastUpdated || new Date().toISOString(),
                        updatedAt: statusData.lastUpdated || new Date().toISOString(),
                        _count: { events: 0 },
                    }];
                    return res.json({ data: mockRuns });
                } catch (fileError) {
                    // Ignore
                }
            }
            
            // Return empty array if all else fails
            res.json({ data: [] });
        }
    } catch (error: any) {
        console.error('Failed to fetch agent runs:', error);
        res.json({ data: [] }); // Return empty array instead of error
    }
});

async function getOrCreateAgent(projectId: string, agentType: string): Promise<string> {
    const existing = await prisma.agent.findFirst({
        where: { projectId, type: agentType as any },
    });

    if (existing) return existing.id;

    const agent = await prisma.agent.create({
        data: {
            projectId,
            type: agentType as any,
            name: `${agentType.charAt(0).toUpperCase() + agentType.slice(1)} Agent`,
        },
    });

    return agent.id;
}

// ============================================
// SCHEDULER API
// ============================================

app.get('/api/scheduler/status', (req, res) => {
    const stats = scheduler.getStats();
    res.json({
        data: {
            queueLength: stats.queueLength,
            runningTasks: stats.runningTasks,
            circuitBreakerOpen: stats.circuitBreakerOpen,
            circuitBreakerFailures: stats.circuitBreakerFailures,
            rateLimitState: stats.rateLimitState,
            config: {
                requestsPerMinute: stats.config.requestsPerMinute,
                maxConcurrent: stats.config.maxConcurrent,
                maxRetries: stats.config.maxRetries,
                minTimeBetweenRequests: stats.config.minTimeBetweenRequests,
            },
        },
    });
});

app.post('/api/scheduler/config', (req, res) => {
    const { requestsPerMinute, maxConcurrent, minTimeBetweenRequests, maxRetries } = req.body;
    
    const updates: any = {};
    if (requestsPerMinute !== undefined) updates.requestsPerMinute = requestsPerMinute;
    if (maxConcurrent !== undefined) updates.maxConcurrent = maxConcurrent;
    if (minTimeBetweenRequests !== undefined) updates.minTimeBetweenRequests = minTimeBetweenRequests;
    if (maxRetries !== undefined) updates.maxRetries = maxRetries;
    
    scheduler.updateConfig(updates);
    
    res.json({
        data: { message: 'Scheduler config updated', updates },
    });
});

app.post('/api/scheduler/clear', (req, res) => {
    scheduler.clearQueue();
    res.json({
        data: { message: 'Scheduler queue cleared' },
    });
});

// ============================================
// HARNESS CONTROL API
// ============================================

app.post('/api/projects/:id/harness/start', async (req, res) => {
    try {
        // Try to get project from database, but fallback to file-based lookup if DB fails
        let project: any = null;
        try {
            project = await prisma.project.findUnique({
            where: { id: req.params.id },
        });
        } catch (dbError: any) {
            console.warn('Database query failed, using file-based project lookup:', dbError.message);
            // Continue without project - we'll use project ID/name from request
        }

        if (!project) {
            // Try to get project name from file system or use a generic name
            // Get the project root (parent of backend directory)
            const projectRoot = path.resolve(__dirname, '..', '..');
            const testProjectsDir = path.join(projectRoot, 'test-projects');
            if (fs.existsSync(testProjectsDir)) {
                // Don't use UUID as name - it will never match a directory
                // Use a generic name that might match, or we'll match by listing directories
                project = { id: req.params.id, name: 'project' }; // Generic name, will be matched by directory listing
            } else {
                return res.status(404).json({ error: { message: 'Project not found and test-projects directory does not exist' } });
            }
        }

        // Get project path - try to map project ID to test-projects directory
        let projectPath = req.body.projectPath;
        
        if (!projectPath) {
            // Get the project root (parent of backend directory)
            // __dirname in compiled JS will be backend/dist, so we go up 2 levels
            const projectRoot = path.resolve(__dirname, '..', '..');
            const testProjectsDir = path.join(projectRoot, 'test-projects');
            
            // Normalize project name: "KindLetters" -> "kindletters"
            const originalProjectName = project.name || '';
            const projectName = originalProjectName.toLowerCase().replace(/\s+/g, '');
            
            console.log(`🔍 Looking for project: "${originalProjectName}" (normalized: "${projectName}")`);
            console.log(`📁 Project ID: ${req.params.id}`);
            
            // First, try listing directories and doing case-insensitive matching
            // This is more reliable than trying variations
            if (fs.existsSync(testProjectsDir)) {
                const dirs = fs.readdirSync(testProjectsDir, { withFileTypes: true })
                    .filter(d => d.isDirectory())
                    .map(d => d.name);
                
                console.log(`📂 Available project directories:`, dirs);
                
                // Find case-insensitive match - try multiple strategies
                // IMPORTANT: Skip UUID directories (they're 36 chars with hyphens)
                const match = dirs.find(d => {
                    // Skip if directory looks like a UUID
                    if (d.length === 36 && d.includes('-')) {
                        return false;
                    }
                    
                    const dirLower = d.toLowerCase();
                    const dirNormalized = dirLower.replace(/\s+/g, '');
                    const nameLower = projectName.toLowerCase();
                    const nameNormalized = nameLower.replace(/\s+/g, '');
                    
                    // Try multiple matching strategies
                    const matches = 
                        dirLower === nameLower || 
                        dirNormalized === nameNormalized ||
                        dirLower === originalProjectName.toLowerCase() ||
                        (projectName && dirLower.includes(projectName)) ||
                        (projectName && projectName.includes(dirLower));
                    
                    if (matches) {
                        console.log(`✅ Match found: "${d}" matches "${originalProjectName}"`);
                    }
                    
                    return matches;
                });
                
                if (match) {
                    projectPath = path.join(testProjectsDir, match);
                    console.log(`Found matching directory: ${match} -> ${projectPath}`);
                } else {
                    // Try exact matches as fallback
                    const possiblePaths = [
                        path.join(testProjectsDir, projectName), // "kindletters"
                        path.join(testProjectsDir, originalProjectName), // "KindLetters" (original)
                    ];
                    
                    for (const possiblePath of possiblePaths) {
                        if (fs.existsSync(possiblePath)) {
                            projectPath = possiblePath;
                            console.log(`Found exact match: ${possiblePath}`);
                            break;
                        }
                    }
                }
            }
            
            // Final fallback - NEVER use project ID, only use project name
            if (!projectPath) {
                // If we still don't have a path, something is wrong
                // Don't use project ID - it will never match a directory
                const projectRoot = path.resolve(__dirname, '..', '..');
                const fallbackPath = path.join(projectRoot, 'test-projects', projectName);
                
                if (fs.existsSync(fallbackPath)) {
                    projectPath = fallbackPath;
                    console.log(`Using fallback project path: ${projectPath}`);
                } else {
                    // Last resort: list all directories and pick the first non-UUID one
                    if (fs.existsSync(testProjectsDir)) {
                        const dirs = fs.readdirSync(testProjectsDir, { withFileTypes: true })
                            .filter(d => d.isDirectory())
                            .map(d => d.name)
                            // Filter out UUID-like directories (36 chars with hyphens)
                            .filter(d => !(d.length === 36 && d.includes('-')))
                            // Filter out demo-app as it's not a real project
                            .filter(d => d !== 'demo-app');
                        
                        if (dirs.length > 0) {
                            // Try to find a partial match first
                            const partialMatch = dirs.find(d => {
                                const dirLower = d.toLowerCase();
                                const nameLower = projectName.toLowerCase();
                                return dirLower.includes(nameLower) || nameLower.includes(dirLower);
                            });
                            
                            if (partialMatch) {
                                projectPath = path.join(testProjectsDir, partialMatch);
                                console.log(`✅ Found partial match: ${partialMatch}`);
                            } else {
                                // Use the first non-UUID, non-demo directory as a last resort
                                projectPath = path.join(testProjectsDir, dirs[0]);
                                console.warn(`⚠️  Project path not found, using first available directory: ${projectPath}`);
                            }
                        } else {
                            return res.status(400).json({
                                error: {
                                    message: `No project directories found in test-projects/`,
                                    projectName: originalProjectName,
                                    normalizedName: projectName,
                                    testProjectsDir,
                                    suggestions: [
                                        `Create a directory named "${projectName}" in test-projects/`,
                                        `Or rename an existing directory to match "${projectName}"`
                                    ]
                                }
                            });
                        }
                    } else {
                        return res.status(400).json({
                            error: {
                                message: `test-projects directory does not exist`,
                                testProjectsDir,
                                suggestions: [
                                    'Create the test-projects directory',
                                    'Ensure the project structure is set up correctly'
                                ]
                            }
                        });
                    }
                }
            } else {
                console.log(`✅ Found project path: ${projectPath}`);
            }
        }

        // Ensure projectPath is absolute
        if (!path.isAbsolute(projectPath)) {
            const projectRoot = path.resolve(__dirname, '..', '..');
            projectPath = path.resolve(projectRoot, projectPath);
        }

        const config: HarnessConfig = {
            projectId: req.params.id,
            projectPath,
            continuous: req.body.continuous || false,
            maxSessions: req.body.maxSessions || 100,
            sessionDelayMs: req.body.sessionDelayMs || 5000,
        };

        console.log(`Starting harness for project ${req.params.id} at path: ${projectPath}`);
        console.log(`Config:`, config);

        // Verify project path exists before starting
        if (!fs.existsSync(projectPath)) {
            return res.status(400).json({ 
                error: { 
                    message: `Project path does not exist: ${projectPath}`,
                    projectPath,
                    projectName: project.name,
                    projectId: req.params.id,
                    suggestions: [
                        'Check that the project directory exists in test-projects/',
                        'Verify the project name matches the directory name',
                        'Ensure the project was set up correctly'
                    ]
                } 
            });
        }

        // Verify harness script exists
        const harnessScriptPath = path.join(projectPath, 'harness', 'run-harness.js');
        if (!fs.existsSync(harnessScriptPath)) {
            return res.status(400).json({ 
                error: { 
                    message: `Harness script not found: ${harnessScriptPath}`,
                    harnessScriptPath,
                    projectPath,
                    suggestions: [
                        'Ensure harness/run-harness.js exists in the project directory',
                        'Check that the harness was set up correctly',
                        `Expected location: ${harnessScriptPath}`
                    ]
                } 
            });
        }

        const status = await harnessManager.start(config);

        // Start watching project files (non-blocking)
        try {
        fileWatcher.watchProject(req.params.id, projectPath);
        } catch (watchError: any) {
            console.warn('File watcher error (non-critical):', watchError.message);
        }

        console.log(`Harness started successfully:`, status);
        res.json({ data: status });
    } catch (error: any) {
        console.error('Harness start error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ 
            error: { 
                message: error.message || 'Failed to start harness',
                details: (getEnvValue('nodeEnv') || 'development') === 'development' ? error.stack : undefined
            } 
        });
    }
});

app.post('/api/projects/:id/harness/stop', async (req, res) => {
    try {
        const force = req.body.force || false;
        const status = await harnessManager.stop(req.params.id, force);

        // Stop watching project files
        fileWatcher.unwatchProject(req.params.id);

        res.json({ data: status });
    } catch (error: any) {
        res.status(500).json({ error: { message: error.message || 'Failed to stop harness' } });
    }
});

app.get('/api/projects/:id/harness/status', async (req, res) => {
    try {
        // First try to get from running harness manager
        const managerStatus = await harnessManager.getStatus(req.params.id);
        
        // Also check for file-based status (for harnesses running directly)
        const projectName = req.params.id;
        const projectPath = path.join(process.cwd(), '..', 'test-projects', projectName);
        const statusFile = path.join(projectPath, 'harness-status.json');
        
        let fileStatus = null;
        if (fs.existsSync(statusFile)) {
            try {
                const statusData = JSON.parse(fs.readFileSync(statusFile, 'utf-8'));
                fileStatus = {
                    projectId: req.params.id,
                    status: statusData.status || 'running',
                    sessionType: statusData.sessionType || null,
                    sessionNumber: statusData.sessionNumber || null,
                    stats: statusData.stats || null,
                    lastUpdate: statusData.lastUpdated || null,
                    pid: statusData.pid || null,
                };
            } catch (e) {
                // Ignore parse errors
            }
        }
        
        // Prefer file status if it exists and is more recent, otherwise use manager status
        const status = fileStatus && fileStatus.status !== 'idle' ? fileStatus : managerStatus;
        
        res.json({ data: status });
    } catch (error: any) {
        res.status(500).json({ error: { message: error.message || 'Failed to get harness status' } });
    }
});

// Format log line - parse JSON and make it readable
function formatLogLine(line: string): string {
    // Try to parse as JSON
    try {
        const json = JSON.parse(line);
        
        // Format different log types
        if (json.type === 'system') {
            return `🔧 System: ${json.subtype || 'init'} | Model: ${json.model || 'unknown'} | Session: ${json.session_id?.substring(0, 8) || 'unknown'}`;
        } else if (json.type === 'assistant') {
            const message = json.message?.content?.[0]?.text || json.message?.content || 'No message';
            const model = json.message?.model || json.model || 'unknown';
            const usage = json.message?.usage || {};
            const tokens = (usage.input_tokens || 0) + (usage.output_tokens || 0);
            const msgText = typeof message === 'string' ? message.substring(0, 100) : JSON.stringify(message).substring(0, 100);
            return `💬 Assistant (${model}): ${msgText}${tokens > 0 ? ` | Tokens: ${tokens.toLocaleString()}` : ''}`;
        } else if (json.type === 'result') {
            const isError = json.is_error;
            const duration = json.duration_ms ? `${(json.duration_ms / 1000).toFixed(1)}s` : '';
            const result = typeof json.result === 'string' ? json.result.substring(0, 150) : JSON.stringify(json.result).substring(0, 150);
            return `${isError ? '❌' : '✅'} Result: ${result}${duration ? ` | Duration: ${duration}` : ''}`;
        } else if (json.type === 'error' || json.error) {
            return `❌ Error: ${json.error || json.message || 'Unknown error'}`;
        } else {
            // Generic JSON log
            return `📋 ${JSON.stringify(json).substring(0, 200)}`;
        }
    } catch (e) {
        // Not JSON, return as-is but clean up
        const cleaned = line
            .replace(/\x1b\[[0-9;]*m/g, '') // Remove ANSI color codes
            .trim();
        
        // Format timestamp if present (ISO format)
        if (cleaned.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
            const parts = cleaned.split(' ');
            const timestamp = parts[0];
            const rest = parts.slice(1).join(' ');
            try {
                const date = new Date(timestamp);
                const timeStr = date.toLocaleTimeString();
                return `[${timeStr}] ${rest}`;
            } catch (e) {
                return cleaned;
            }
        }
        
        return cleaned;
    }
}

app.get('/api/projects/:id/harness/logs', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit as string) || 100;
        
        // Try to get from manager first
        let logs = harnessManager.getLogs(req.params.id, limit);
        
        // Also read from progress file if it exists
        // Try to find project directory by name (not ID)
        const projectRoot = path.resolve(__dirname, '..', '..');
        const testProjectsDir = path.join(projectRoot, 'test-projects');
        
        // Try to get project name from database
        let projectName = req.params.id;
        try {
            const project = await prisma.project.findUnique({
                where: { id: req.params.id },
                select: { name: true }
            });
            if (project) {
                projectName = project.name.toLowerCase().replace(/\s+/g, '');
            }
        } catch (e) {
            // Ignore DB errors, use ID
        }
        
        // Try multiple possible paths
        const possiblePaths = [
            path.join(testProjectsDir, projectName), // Normalized name
            path.join(testProjectsDir, req.params.id), // ID as fallback
        ];
        
        // Also try to find by listing directories
        if (fs.existsSync(testProjectsDir)) {
            const dirs = fs.readdirSync(testProjectsDir, { withFileTypes: true })
                .filter(d => d.isDirectory())
                .map(d => d.name)
                .filter(d => !(d.length === 36 && d.includes('-'))) // Skip UUIDs
                .filter(d => d !== 'demo-app'); // Skip demo-app
            
            // Try to match by name
            const match = dirs.find(d => {
                const dirLower = d.toLowerCase();
                const nameLower = projectName.toLowerCase();
                return dirLower === nameLower || dirLower.includes(nameLower) || nameLower.includes(dirLower);
            });
            
            if (match) {
                possiblePaths.unshift(path.join(testProjectsDir, match));
            }
        }
        
        // Try each possible path
        for (const projectPath of possiblePaths) {
            const progressFile = path.join(projectPath, 'claude-progress.txt');
            
            if (fs.existsSync(progressFile)) {
                try {
                    const progressContent = fs.readFileSync(progressFile, 'utf-8');
                    const progressLines = progressContent.split('\n').filter(l => l.trim());
                    // Format logs and combine with manager logs
                    const formattedLogs = progressLines.slice(-limit).map(formatLogLine);
                    logs = [...logs, ...formattedLogs].slice(-limit);
                    break; // Found logs, stop searching
                } catch (e) {
                    // Ignore read errors, try next path
                }
            }
        }
        
        res.json({ data: logs });
    } catch (error: any) {
        res.status(500).json({ error: { message: error.message || 'Failed to get harness logs' } });
    }
});

// SSE endpoint for streaming logs
app.get('/api/projects/:id/harness/logs/stream', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const projectId = req.params.id;

    // Send existing logs first
    const existingLogs = harnessManager.getLogs(projectId, 50);
    existingLogs.forEach(line => {
        res.write(`data: ${JSON.stringify({ line })}\n\n`);
    });

    // Subscribe to new logs
    const logHandler = (data: { projectId: string; line: string }) => {
        if (data.projectId === projectId) {
            res.write(`data: ${JSON.stringify({ line: data.line })}\n\n`);
        }
    };

    harnessManager.on('harness:log', logHandler);

    // Cleanup on disconnect
    req.on('close', () => {
        harnessManager.off('harness:log', logHandler);
    });
});

// Get all running harnesses
app.get('/api/harnesses', async (req, res) => {
    try {
        const running = harnessManager.getAllRunning();
        res.json({ data: running });
    } catch (error: any) {
        res.status(500).json({ error: { message: error.message || 'Failed to get harnesses' } });
    }
});

// ============================================
// APPROVAL GATES API
// ============================================

// Get approval config for a project
app.get('/api/projects/:id/approvals/config', async (req, res) => {
    try {
        const config = approvalGates.getConfig(req.params.id);
        res.json({ data: config });
    } catch (error: any) {
        res.status(500).json({ error: { message: error.message || 'Failed to get config' } });
    }
});

// Update approval config
app.put('/api/projects/:id/approvals/config', async (req, res) => {
    try {
        const config = approvalGates.setConfig(req.params.id, req.body);
        res.json({ data: config });
    } catch (error: any) {
        res.status(500).json({ error: { message: error.message || 'Failed to update config' } });
    }
});

// Get pending approvals for a project
app.get('/api/projects/:id/approvals/pending', async (req, res) => {
    try {
        const pending = approvalGates.getPendingGates(req.params.id);
        res.json({ data: pending });
    } catch (error: any) {
        res.status(500).json({ error: { message: error.message || 'Failed to get pending approvals' } });
    }
});

// Get all approvals for a project
app.get('/api/projects/:id/approvals', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit as string) || 50;
        const approvals = approvalGates.getAllGates(req.params.id, limit);
        res.json({ data: approvals });
    } catch (error: any) {
        res.status(500).json({ error: { message: error.message || 'Failed to get approvals' } });
    }
});

// Resolve an approval gate
app.post('/api/approvals/:gateId/resolve', async (req, res) => {
    try {
        const { status, resolution } = req.body;
        const resolvedBy = req.body.resolvedBy || 'user';
        
        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: { message: 'Invalid status' } });
        }
        
        const gate = await approvalGates.resolveGate(req.params.gateId, status, resolvedBy, resolution);
        
        if (!gate) {
            return res.status(404).json({ error: { message: 'Gate not found or already resolved' } });
        }
        
        res.json({ data: gate });
    } catch (error: any) {
        res.status(500).json({ error: { message: error.message || 'Failed to resolve approval' } });
    }
});

// Get a specific approval gate
app.get('/api/approvals/:gateId', async (req, res) => {
    try {
        const gate = approvalGates.getGate(req.params.gateId);
        if (!gate) {
            return res.status(404).json({ error: { message: 'Gate not found' } });
        }
        res.json({ data: gate });
    } catch (error: any) {
        res.status(500).json({ error: { message: error.message || 'Failed to get approval' } });
    }
});

// Test endpoint: Create a test approval gate
app.post('/api/projects/:id/approvals/test', async (req, res) => {
    try {
        const { type = 'milestone' } = req.body;
        const projectId = req.params.id;
        
        // Create a test gate based on type
        let gateDetails;
        switch (type) {
            case 'error_recovery':
                gateDetails = approvalGates.templates.errorRecovery(projectId, 'Test error message', 1);
                break;
            case 'test_failure':
                gateDetails = approvalGates.templates.testFailure(projectId, 'Test Feature', { passed: 5, failed: 2 });
                break;
            case 'destructive_action':
                gateDetails = approvalGates.templates.destructiveAction(projectId, 'Delete files', ['src/old.ts', 'src/deprecated.ts']);
                break;
            default:
                gateDetails = approvalGates.templates.milestone(projectId, 10, 25);
        }
        
        // Don't await - just create the gate and return immediately
        approvalGates.requestApproval(projectId, gateDetails.type, gateDetails);
        
        // Return the pending gates
        const pending = approvalGates.getPendingGates(projectId);
        res.json({ data: pending, message: 'Test approval gate created' });
    } catch (error: any) {
        res.status(500).json({ error: { message: error.message || 'Failed to create test approval' } });
    }
});

// ============================================
// GIT INTEGRATION API
// ============================================

// Get commit history for a project path
app.get('/api/git/commits', async (req, res) => {
    try {
        const repoPath = req.query.path as string || process.cwd();
        const limit = parseInt(req.query.limit as string) || 50;
        const branch = req.query.branch as string;
        
        const isRepo = await gitService.isGitRepo(repoPath);
        if (!isRepo) {
            return res.status(400).json({ error: { message: 'Not a git repository' } });
        }
        
        const commits = await gitService.getCommits(repoPath, { limit, branch });
        res.json({ data: commits });
    } catch (error: any) {
        res.status(500).json({ error: { message: error.message || 'Failed to get commits' } });
    }
});

// Get commit details
app.get('/api/git/commits/:sha', async (req, res) => {
    try {
        const repoPath = req.query.path as string || process.cwd();
        const commit = await gitService.getCommitDetails(repoPath, req.params.sha);
        
        if (!commit) {
            return res.status(404).json({ error: { message: 'Commit not found' } });
        }
        
        res.json({ data: commit });
    } catch (error: any) {
        res.status(500).json({ error: { message: error.message || 'Failed to get commit' } });
    }
});

// Get repository status
app.get('/api/git/status', async (req, res) => {
    try {
        const repoPath = req.query.path as string || process.cwd();
        const status = await gitService.getStatus(repoPath);
        res.json({ data: status });
    } catch (error: any) {
        res.status(500).json({ error: { message: error.message || 'Failed to get status' } });
    }
});

// Get branches
app.get('/api/git/branches', async (req, res) => {
    try {
        const repoPath = req.query.path as string || process.cwd();
        const branches = await gitService.getBranches(repoPath);
        res.json({ data: branches });
    } catch (error: any) {
        res.status(500).json({ error: { message: error.message || 'Failed to get branches' } });
    }
});

// Get commit statistics
app.get('/api/git/stats', async (req, res) => {
    try {
        const repoPath = req.query.path as string || process.cwd();
        const since = req.query.since ? new Date(req.query.since as string) : undefined;
        const stats = await gitService.getCommitStats(repoPath, since);
        res.json({ data: stats });
    } catch (error: any) {
        res.status(500).json({ error: { message: error.message || 'Failed to get stats' } });
    }
});

// ============================================
// VISUAL VERIFICATION API
// ============================================

app.get('/api/projects/:id/screenshots', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit as string) || 50;
        const screenshots = visualVerification.getScreenshots(req.params.id, limit);
        res.json({ data: screenshots });
    } catch (error: any) {
        res.status(500).json({ error: { message: error.message || 'Failed to get screenshots' } });
    }
});

app.get('/api/screenshots/:id', async (req, res) => {
    try {
        const screenshot = visualVerification.getScreenshot(req.params.id);
        if (!screenshot) {
            return res.status(404).json({ error: { message: 'Screenshot not found' } });
        }
        res.json({ data: screenshot });
    } catch (error: any) {
        res.status(500).json({ error: { message: error.message || 'Failed to get screenshot' } });
    }
});

app.get('/api/screenshots/:id/data', async (req, res) => {
    try {
        const data = visualVerification.getScreenshotData(req.params.id);
        if (!data) {
            return res.status(404).json({ error: { message: 'Screenshot not found' } });
        }
        res.json({ data: { base64: data } });
    } catch (error: any) {
        res.status(500).json({ error: { message: error.message || 'Failed to get screenshot data' } });
    }
});

app.post('/api/projects/:id/screenshots', async (req, res) => {
    try {
        const screenshot = visualVerification.recordScreenshot(req.params.id, req.body);
        res.json({ data: screenshot });
    } catch (error: any) {
        res.status(500).json({ error: { message: error.message || 'Failed to record screenshot' } });
    }
});

app.get('/api/projects/:id/visual/summary', async (req, res) => {
    try {
        const summary = visualVerification.getSummary(req.params.id);
        res.json({ data: summary });
    } catch (error: any) {
        res.status(500).json({ error: { message: error.message || 'Failed to get summary' } });
    }
});

// ============================================
// WEBHOOK NOTIFICATIONS API
// ============================================

app.get('/api/projects/:id/webhooks', async (req, res) => {
    try {
        const webhooks = webhookNotifications.getWebhooks(req.params.id);
        res.json({ data: webhooks });
    } catch (error: any) {
        res.status(500).json({ error: { message: error.message || 'Failed to get webhooks' } });
    }
});

app.post('/api/projects/:id/webhooks', async (req, res) => {
    try {
        const webhook = webhookNotifications.registerWebhook({
            projectId: req.params.id,
            ...req.body,
        });
        res.json({ data: webhook });
    } catch (error: any) {
        res.status(500).json({ error: { message: error.message || 'Failed to create webhook' } });
    }
});

app.put('/api/webhooks/:id', async (req, res) => {
    try {
        const webhook = webhookNotifications.updateWebhook(req.params.id, req.body);
        if (!webhook) {
            return res.status(404).json({ error: { message: 'Webhook not found' } });
        }
        res.json({ data: webhook });
    } catch (error: any) {
        res.status(500).json({ error: { message: error.message || 'Failed to update webhook' } });
    }
});

app.delete('/api/webhooks/:id', async (req, res) => {
    try {
        const deleted = webhookNotifications.deleteWebhook(req.params.id);
        res.json({ data: { deleted } });
    } catch (error: any) {
        res.status(500).json({ error: { message: error.message || 'Failed to delete webhook' } });
    }
});

app.post('/api/webhooks/:id/test', async (req, res) => {
    try {
        const delivery = await webhookNotifications.testWebhook(req.params.id);
        if (!delivery) {
            return res.status(404).json({ error: { message: 'Webhook not found' } });
        }
        res.json({ data: delivery });
    } catch (error: any) {
        res.status(500).json({ error: { message: error.message || 'Failed to test webhook' } });
    }
});

app.get('/api/projects/:id/webhooks/deliveries', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit as string) || 50;
        const deliveries = webhookNotifications.getDeliveries(req.params.id, limit);
        res.json({ data: deliveries });
    } catch (error: any) {
        res.status(500).json({ error: { message: error.message || 'Failed to get deliveries' } });
    }
});

// ============================================
// SESSION REPLAY API
// ============================================

app.get('/api/projects/:id/recordings', async (req, res) => {
    try {
        const recordings = sessionReplay.getRecordings(req.params.id);
        res.json({ data: recordings });
    } catch (error: any) {
        res.status(500).json({ error: { message: error.message || 'Failed to get recordings' } });
    }
});

app.get('/api/recordings/:id', async (req, res) => {
    try {
        const recording = sessionReplay.getRecording(req.params.id);
        if (!recording) {
            return res.status(404).json({ error: { message: 'Recording not found' } });
        }
        res.json({ data: recording });
    } catch (error: any) {
        res.status(500).json({ error: { message: error.message || 'Failed to get recording' } });
    }
});

app.get('/api/recordings/:id/export', async (req, res) => {
    try {
        const format = (req.query.format as string) || 'json';
        const data = sessionReplay.exportRecording(req.params.id, format as 'json' | 'markdown');
        if (!data) {
            return res.status(404).json({ error: { message: 'Recording not found' } });
        }
        
        if (format === 'markdown') {
            res.setHeader('Content-Type', 'text/markdown');
            res.send(data);
        } else {
            res.json(JSON.parse(data));
        }
    } catch (error: any) {
        res.status(500).json({ error: { message: error.message || 'Failed to export recording' } });
    }
});

app.post('/api/recordings/:id/replay/start', async (req, res) => {
    try {
        const state = sessionReplay.startReplay(req.params.id);
        if (!state) {
            return res.status(404).json({ error: { message: 'Recording not found' } });
        }
        res.json({ data: state });
    } catch (error: any) {
        res.status(500).json({ error: { message: error.message || 'Failed to start replay' } });
    }
});

app.post('/api/recordings/:id/replay/step', async (req, res) => {
    try {
        const direction = req.body.direction || 'forward';
        const event = sessionReplay.stepReplay(req.params.id, direction);
        const state = sessionReplay.getReplayState(req.params.id);
        res.json({ data: { event, state } });
    } catch (error: any) {
        res.status(500).json({ error: { message: error.message || 'Failed to step replay' } });
    }
});

app.post('/api/recordings/:id/replay/jump', async (req, res) => {
    try {
        const index = req.body.index || 0;
        const event = sessionReplay.jumpToEvent(req.params.id, index);
        const state = sessionReplay.getReplayState(req.params.id);
        res.json({ data: { event, state } });
    } catch (error: any) {
        res.status(500).json({ error: { message: error.message || 'Failed to jump' } });
    }
});

// ============================================
// COST TRACKING API
// ============================================

app.get('/api/projects/:id/costs', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit as string) || 100;
        const since = req.query.since ? new Date(req.query.since as string) : undefined;
        const entries = costTracking.getEntries(req.params.id, { limit, since });
        res.json({ data: entries });
    } catch (error: any) {
        res.status(500).json({ error: { message: error.message || 'Failed to get costs' } });
    }
});

app.get('/api/projects/:id/costs/summary', async (req, res) => {
    try {
        const start = req.query.start ? new Date(req.query.start as string) : undefined;
        const end = req.query.end ? new Date(req.query.end as string) : undefined;
        const period = start && end ? { start, end } : undefined;
        const summary = costTracking.getSummary(req.params.id, period);
        
        // Calculate derived fields for dashboard
        const sessions = Object.keys(summary.bySession || {}).length;
        const averageCostPerSession = sessions > 0 ? summary.totalCost / sessions : 0;
        const totalTokens = summary.totalInputTokens + summary.totalOutputTokens;
        
        res.json({ 
            data: {
                ...summary,
                sessions,
                averageCostPerSession: Math.round(averageCostPerSession * 100) / 100,
                totalTokens
            }
        });
    } catch (error: any) {
        res.status(500).json({ error: { message: error.message || 'Failed to get summary' } });
    }
});

app.get('/api/projects/:id/costs/session/:session', async (req, res) => {
    try {
        const sessionNumber = parseInt(req.params.session);
        const sessionCost = costTracking.getSessionCost(req.params.id, sessionNumber);
        res.json({ data: sessionCost });
    } catch (error: any) {
        res.status(500).json({ error: { message: error.message || 'Failed to get session cost' } });
    }
});

app.post('/api/projects/:id/costs/record', async (req, res) => {
    try {
        const { sessionNumber, model, usage, metadata } = req.body;
        const entry = costTracking.recordUsage(req.params.id, sessionNumber, model, usage, metadata);
        res.json({ data: entry });
    } catch (error: any) {
        res.status(500).json({ error: { message: error.message || 'Failed to record cost' } });
    }
});

app.get('/api/projects/:id/budget', async (req, res) => {
    try {
        const budget = costTracking.getBudget(req.params.id);
        res.json({ data: budget || null });
    } catch (error: any) {
        res.status(500).json({ error: { message: error.message || 'Failed to get budget' } });
    }
});

app.put('/api/projects/:id/budget', async (req, res) => {
    try {
        const budget = costTracking.setBudget({
            projectId: req.params.id,
            ...req.body,
        });
        res.json({ data: budget });
    } catch (error: any) {
        res.status(500).json({ error: { message: error.message || 'Failed to set budget' } });
    }
});

app.get('/api/projects/:id/costs/alerts', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit as string) || 20;
        const alerts = costTracking.getAlerts(req.params.id, limit);
        res.json({ data: alerts });
    } catch (error: any) {
        res.status(500).json({ error: { message: error.message || 'Failed to get alerts' } });
    }
});

app.post('/api/costs/estimate', async (req, res) => {
    try {
        const { model, sessions, avgTokens } = req.body;
        const estimate = costTracking.estimateRunCost(model, sessions, avgTokens);
        res.json({ data: estimate });
    } catch (error: any) {
        res.status(500).json({ error: { message: error.message || 'Failed to estimate' } });
    }
});

app.get('/api/costs/pricing', async (req, res) => {
    try {
        const pricing = costTracking.getModelPricing();
        res.json({ data: pricing });
    } catch (error: any) {
        res.status(500).json({ error: { message: error.message || 'Failed to get pricing' } });
    }
});

// ============================================
// PROJECT MANAGER API
// ============================================

// Get dashboard stats
app.get('/api/dashboard/stats', async (req, res) => {
    try {
        const stats = projectManager.getDashboardStats();
        res.json({ data: stats });
    } catch (error: any) {
        res.status(500).json({ error: { message: error.message || 'Failed to get stats' } });
    }
});

// Get all managed projects
app.get('/api/managed-projects', async (req, res) => {
    try {
        const status = req.query.status ? (req.query.status as string).split(',') : undefined;
        const tags = req.query.tags ? (req.query.tags as string).split(',') : undefined;
        const search = req.query.search as string;
        
        const projects = projectManager.getProjects({ status: status as any, tags, search });
        res.json({ data: projects });
    } catch (error: any) {
        res.status(500).json({ error: { message: error.message || 'Failed to get projects' } });
    }
});

// Create a managed project
app.post('/api/managed-projects', async (req, res) => {
    try {
        const project = projectManager.createProject(req.body);
        res.json({ data: project });
    } catch (error: any) {
        res.status(500).json({ error: { message: error.message || 'Failed to create project' } });
    }
});

// Import project from path
app.post('/api/managed-projects/import', async (req, res) => {
    try {
        const { path } = req.body;
        const project = projectManager.importFromPath(path);
        if (!project) {
            return res.status(400).json({ error: { message: 'Invalid project path' } });
        }
        res.json({ data: project });
    } catch (error: any) {
        res.status(500).json({ error: { message: error.message || 'Failed to import project' } });
    }
});

// Scan directory for projects
app.post('/api/managed-projects/scan', async (req, res) => {
    try {
        const { path, depth = 2 } = req.body;
        const paths = projectManager.scanDirectory(path, depth);
        res.json({ data: paths });
    } catch (error: any) {
        res.status(500).json({ error: { message: error.message || 'Failed to scan directory' } });
    }
});

// Get all tags
app.get('/api/managed-projects/tags', async (req, res) => {
    try {
        const tags = projectManager.getAllTags();
        res.json({ data: tags });
    } catch (error: any) {
        res.status(500).json({ error: { message: error.message || 'Failed to get tags' } });
    }
});

// Get a managed project
app.get('/api/managed-projects/:id', async (req, res) => {
    try {
        const project = projectManager.getProject(req.params.id);
        if (!project) {
            return res.status(404).json({ error: { message: 'Project not found' } });
        }
        res.json({ data: project });
    } catch (error: any) {
        res.status(500).json({ error: { message: error.message || 'Failed to get project' } });
    }
});

// Update a managed project
app.put('/api/managed-projects/:id', async (req, res) => {
    try {
        const project = projectManager.updateProject(req.params.id, req.body);
        if (!project) {
            return res.status(404).json({ error: { message: 'Project not found' } });
        }
        res.json({ data: project });
    } catch (error: any) {
        res.status(500).json({ error: { message: error.message || 'Failed to update project' } });
    }
});

// Update project settings
app.put('/api/managed-projects/:id/settings', async (req, res) => {
    try {
        const project = projectManager.updateSettings(req.params.id, req.body);
        if (!project) {
            return res.status(404).json({ error: { message: 'Project not found' } });
        }
        res.json({ data: project });
    } catch (error: any) {
        res.status(500).json({ error: { message: error.message || 'Failed to update settings' } });
    }
});

// Delete a managed project
app.delete('/api/managed-projects/:id', async (req, res) => {
    try {
        const deleted = projectManager.deleteProject(req.params.id);
        res.json({ data: { deleted } });
    } catch (error: any) {
        res.status(500).json({ error: { message: error.message || 'Failed to delete project' } });
    }
});

// Archive a managed project
app.post('/api/managed-projects/:id/archive', async (req, res) => {
    try {
        const project = projectManager.archiveProject(req.params.id);
        if (!project) {
            return res.status(404).json({ error: { message: 'Project not found' } });
        }
        res.json({ data: project });
    } catch (error: any) {
        res.status(500).json({ error: { message: error.message || 'Failed to archive project' } });
    }
});

// Add team member
app.post('/api/managed-projects/:id/team', async (req, res) => {
    try {
        const { userId } = req.body;
        const project = projectManager.addTeamMember(req.params.id, userId);
        if (!project) {
            return res.status(404).json({ error: { message: 'Project not found' } });
        }
        res.json({ data: project });
    } catch (error: any) {
        res.status(500).json({ error: { message: error.message || 'Failed to add team member' } });
    }
});

// Remove team member
app.delete('/api/managed-projects/:id/team/:userId', async (req, res) => {
    try {
        const project = projectManager.removeTeamMember(req.params.id, req.params.userId);
        if (!project) {
            return res.status(404).json({ error: { message: 'Project not found' } });
        }
        res.json({ data: project });
    } catch (error: any) {
        res.status(500).json({ error: { message: error.message || 'Failed to remove team member' } });
    }
});

// ============================================
// ANALYTICS API
// ============================================

// Get project analytics
app.get('/api/projects/:id/analytics', async (req, res) => {
    try {
        const start = req.query.start ? new Date(req.query.start as string) : undefined;
        const end = req.query.end ? new Date(req.query.end as string) : undefined;
        const timeRange = start && end ? { start, end } : undefined;
        
        const data = analytics.getProjectAnalytics(req.params.id, timeRange);
        res.json({ data });
    } catch (error: any) {
        res.status(500).json({ error: { message: error.message || 'Failed to get analytics' } });
    }
});

// Get real-time metrics
app.get('/api/projects/:id/metrics/realtime', async (req, res) => {
    try {
        const metrics = analytics.getRealTimeMetrics(req.params.id);
        res.json({ data: metrics });
    } catch (error: any) {
        res.status(500).json({ error: { message: error.message || 'Failed to get metrics' } });
    }
});

// Generate dashboard report
app.post('/api/analytics/report', async (req, res) => {
    try {
        const { projectIds, start, end } = req.body;
        const timeRange = start && end ? { start: new Date(start), end: new Date(end) } : undefined;
        
        const report = analytics.generateDashboardReport(projectIds || [], timeRange);
        res.json({ data: report });
    } catch (error: any) {
        res.status(500).json({ error: { message: error.message || 'Failed to generate report' } });
    }
});

// Record analytics event
app.post('/api/projects/:id/analytics/event', async (req, res) => {
    try {
        const { type, data } = req.body;
        const event = analytics.recordEvent(req.params.id, type, data);
        res.json({ data: event });
    } catch (error: any) {
        res.status(500).json({ error: { message: error.message || 'Failed to record event' } });
    }
});

// Export analytics data
app.get('/api/projects/:id/analytics/export', async (req, res) => {
    try {
        const format = (req.query.format as string) || 'json';
        const data = analytics.exportData(req.params.id, format as 'json' | 'csv');
        
        if (format === 'csv') {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${req.params.id}-analytics.csv"`);
            res.send(data);
        } else {
            res.json(JSON.parse(data));
        }
    } catch (error: any) {
        res.status(500).json({ error: { message: error.message || 'Failed to export data' } });
    }
});

// ============================================
// SOCKET.IO REAL-TIME
// ============================================

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('subscribe', (projectId: string) => {
        socket.join(`project:${projectId}`);
        console.log(`Socket ${socket.id} subscribed to project:${projectId}`);
    });

    socket.on('unsubscribe', (projectId: string) => {
        socket.leave(`project:${projectId}`);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Subscribe to Redis for agent events and forward to Socket.IO
async function subscribeToAgentEvents() {
    const subscriber = redis.duplicate();
    await subscriber.psubscribe('agent:events:*');

    subscriber.on('pmessage', (pattern, channel, message) => {
        const projectId = channel.replace('agent:events:', '');
        const event = JSON.parse(message);

        io.to(`project:${projectId}`).emit('agent_event', event);
    });

    console.log('Subscribed to agent events');
}

// ============================================
// START SERVER
// ============================================

const PORT = getEnvValue('backendPort') || 3434;

httpServer.listen(PORT, async () => {
    console.log(`API server running on http://localhost:${PORT}`);
    await subscribeToAgentEvents();
});

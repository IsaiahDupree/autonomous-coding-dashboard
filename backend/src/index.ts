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

dotenv.config();

// Initialize services
const harnessManager = getHarnessManager();
const fileWatcher = getFileWatcher();
const approvalGates = getApprovalGates();
const gitService = getGitService();

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
    cors: { origin: '*' }
});

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Middleware
app.use(cors());
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

// ============================================
// PROJECTS API
// ============================================

app.get('/api/projects', async (req, res) => {
    try {
        const projects = await prisma.project.findMany({
            include: {
                _count: { select: { features: true, workItems: true } },
                repos: { select: { repoUrl: true, provider: true } },
            },
            orderBy: { updatedAt: 'desc' },
        });
        res.json({ data: projects });
    } catch (error) {
        res.status(500).json({ error: { message: 'Failed to fetch projects' } });
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
        const features = await prisma.feature.findMany({
            where: { projectId: req.params.id },
            include: {
                testCases: { select: { id: true, status: true } },
                _count: { select: { workItems: true } },
            },
            orderBy: { priority: 'desc' },
        });
        res.json({ data: features });
    } catch (error) {
        res.status(500).json({ error: { message: 'Failed to fetch features' } });
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

const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL || 'http://localhost:8000';

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
        const runs = await prisma.agentRun.findMany({
            where: { projectId: req.params.id },
            include: {
                _count: { select: { events: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });
        res.json({ data: runs });
    } catch (error) {
        res.status(500).json({ error: { message: 'Failed to fetch agent runs' } });
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
// HARNESS CONTROL API
// ============================================

app.post('/api/projects/:id/harness/start', async (req, res) => {
    try {
        const project = await prisma.project.findUnique({
            where: { id: req.params.id },
        });

        if (!project) {
            return res.status(404).json({ error: { message: 'Project not found' } });
        }

        // Get project path - in production, this would come from project config
        const projectPath = req.body.projectPath || process.env.DEFAULT_PROJECT_PATH || process.cwd();

        const config: HarnessConfig = {
            projectId: req.params.id,
            projectPath,
            continuous: req.body.continuous || false,
            maxSessions: req.body.maxSessions || 100,
            sessionDelayMs: req.body.sessionDelayMs || 5000,
        };

        const status = await harnessManager.start(config);

        // Start watching project files
        fileWatcher.watchProject(req.params.id, projectPath);

        res.json({ data: status });
    } catch (error: any) {
        console.error('Harness start error:', error);
        res.status(500).json({ error: { message: error.message || 'Failed to start harness' } });
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
        const status = await harnessManager.getStatus(req.params.id);
        res.json({ data: status });
    } catch (error: any) {
        res.status(500).json({ error: { message: error.message || 'Failed to get harness status' } });
    }
});

app.get('/api/projects/:id/harness/logs', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit as string) || 100;
        const logs = harnessManager.getLogs(req.params.id, limit);
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

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, async () => {
    console.log(`API server running on http://localhost:${PORT}`);
    await subscribeToAgentEvents();
});

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

dotenv.config();

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
        res.json({ data: summary });
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

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, async () => {
    console.log(`API server running on http://localhost:${PORT}`);
    await subscribeToAgentEvents();
});

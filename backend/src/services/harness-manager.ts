/**
 * Harness Manager Service
 * 
 * Manages agent harness processes - starting, stopping, monitoring,
 * and streaming logs from autonomous coding sessions.
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import path from 'path';
import fs from 'fs';
import Redis from 'ioredis';

export interface HarnessConfig {
  projectId: string;
  projectPath: string;
  continuous: boolean;
  maxSessions: number;
  sessionDelayMs: number;
}

export interface HarnessStatus {
  projectId: string;
  status: 'idle' | 'running' | 'stopping' | 'error';
  pid?: number;
  sessionNumber?: number;
  sessionType?: 'initializer' | 'coding';
  featuresTotal?: number;
  featuresPassing?: number;
  startedAt?: Date;
  lastUpdate?: Date;
  error?: string;
}

interface RunningHarness {
  process: ChildProcess;
  config: HarnessConfig;
  status: HarnessStatus;
  logBuffer: string[];
}

export class HarnessManager extends EventEmitter {
  private harnesses: Map<string, RunningHarness> = new Map();
  private redis: Redis;
  private readonly HARNESS_SCRIPT = 'harness/run-harness.js';
  private readonly MAX_LOG_BUFFER = 1000;

  constructor(redisUrl?: string) {
    super();
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
  }

  /**
   * Start a harness for a project
   */
  async start(config: HarnessConfig): Promise<HarnessStatus> {
    const { projectId, projectPath } = config;

    // Check if already running
    if (this.harnesses.has(projectId)) {
      const existing = this.harnesses.get(projectId)!;
      if (existing.status.status === 'running') {
        throw new Error(`Harness already running for project ${projectId}`);
      }
    }

    // Verify project path exists
    if (!fs.existsSync(projectPath)) {
      throw new Error(`Project path does not exist: ${projectPath}`);
    }

    // Verify harness script exists
    const harnessPath = path.join(projectPath, this.HARNESS_SCRIPT);
    if (!fs.existsSync(harnessPath)) {
      throw new Error(`Harness script not found at: ${harnessPath}`);
    }

    // Build command arguments
    const args = ['run-harness.js'];
    if (config.continuous) {
      args.push('--continuous');
    }
    if (config.maxSessions) {
      args.push(`--max=${config.maxSessions}`);
    }

    // Spawn the harness process
    const harnessProcess = spawn('node', args, {
      cwd: path.join(projectPath, 'harness'),
      env: {
        ...process.env,
        PROJECT_PATH: projectPath,
        PROJECT_ID: projectId,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const status: HarnessStatus = {
      projectId,
      status: 'running',
      pid: harnessProcess.pid,
      startedAt: new Date(),
      lastUpdate: new Date(),
    };

    const runningHarness: RunningHarness = {
      process: harnessProcess,
      config,
      status,
      logBuffer: [],
    };

    this.harnesses.set(projectId, runningHarness);

    // Handle stdout
    harnessProcess.stdout?.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n').filter(Boolean);
      lines.forEach(line => {
        this.processLogLine(projectId, line);
      });
    });

    // Handle stderr
    harnessProcess.stderr?.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n').filter(Boolean);
      lines.forEach(line => {
        this.processLogLine(projectId, `[ERROR] ${line}`);
      });
    });

    // Handle process exit
    harnessProcess.on('close', (code) => {
      const harness = this.harnesses.get(projectId);
      if (harness) {
        harness.status.status = code === 0 ? 'idle' : 'error';
        harness.status.lastUpdate = new Date();
        if (code !== 0) {
          harness.status.error = `Process exited with code ${code}`;
        }
        this.emit('harness:stopped', { projectId, code });
        this.publishEvent(projectId, 'harness:stopped', { code });
      }
    });

    harnessProcess.on('error', (err) => {
      const harness = this.harnesses.get(projectId);
      if (harness) {
        harness.status.status = 'error';
        harness.status.error = err.message;
        this.emit('harness:error', { projectId, error: err.message });
        this.publishEvent(projectId, 'harness:error', { error: err.message });
      }
    });

    // Store in Redis for persistence
    await this.redis.hset(`harness:${projectId}`, {
      pid: harnessProcess.pid?.toString() || '',
      status: 'running',
      startedAt: status.startedAt!.toISOString(),
      config: JSON.stringify(config),
    });

    this.emit('harness:started', { projectId, pid: harnessProcess.pid });
    this.publishEvent(projectId, 'harness:started', { pid: harnessProcess.pid });

    return status;
  }

  /**
   * Stop a running harness
   */
  async stop(projectId: string, force: boolean = false): Promise<HarnessStatus> {
    const harness = this.harnesses.get(projectId);
    
    if (!harness) {
      // Check Redis for orphaned process
      const stored = await this.redis.hgetall(`harness:${projectId}`);
      if (stored.pid) {
        try {
          process.kill(parseInt(stored.pid), force ? 'SIGKILL' : 'SIGTERM');
        } catch (e) {
          // Process already dead
        }
        await this.redis.del(`harness:${projectId}`);
      }
      return { projectId, status: 'idle' };
    }

    harness.status.status = 'stopping';
    this.emit('harness:stopping', { projectId });

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        // Force kill if graceful shutdown takes too long
        harness.process.kill('SIGKILL');
      }, force ? 0 : 10000);

      harness.process.once('close', async () => {
        clearTimeout(timeout);
        harness.status.status = 'idle';
        harness.status.lastUpdate = new Date();
        await this.redis.del(`harness:${projectId}`);
        resolve(harness.status);
      });

      harness.process.kill(force ? 'SIGKILL' : 'SIGTERM');
    });
  }

  /**
   * Get status of a harness
   */
  async getStatus(projectId: string): Promise<HarnessStatus> {
    const harness = this.harnesses.get(projectId);
    
    if (harness) {
      return { ...harness.status };
    }

    // Check Redis for stored status
    const stored = await this.redis.hgetall(`harness:${projectId}`);
    if (stored.status) {
      return {
        projectId,
        status: stored.status as HarnessStatus['status'],
        pid: stored.pid ? parseInt(stored.pid) : undefined,
        startedAt: stored.startedAt ? new Date(stored.startedAt) : undefined,
      };
    }

    return { projectId, status: 'idle' };
  }

  /**
   * Get recent logs for a project
   */
  getLogs(projectId: string, limit: number = 100): string[] {
    const harness = this.harnesses.get(projectId);
    if (!harness) return [];
    
    return harness.logBuffer.slice(-limit);
  }

  /**
   * Stream logs as an async generator
   */
  async *streamLogs(projectId: string): AsyncGenerator<string> {
    const harness = this.harnesses.get(projectId);
    if (!harness) return;

    // Emit buffered logs first
    for (const line of harness.logBuffer) {
      yield line;
    }

    // Then stream new logs
    const logHandler = (data: { projectId: string; line: string }) => {
      if (data.projectId === projectId) {
        return data.line;
      }
    };

    // This is a simplified version - in production use a proper async queue
    while (harness.status.status === 'running') {
      await new Promise(resolve => setTimeout(resolve, 100));
      // In real implementation, yield from an async queue
    }
  }

  /**
   * Process a log line from the harness
   */
  private processLogLine(projectId: string, line: string): void {
    const harness = this.harnesses.get(projectId);
    if (!harness) return;

    // Add to buffer
    harness.logBuffer.push(line);
    if (harness.logBuffer.length > this.MAX_LOG_BUFFER) {
      harness.logBuffer.shift();
    }

    // Parse for status updates
    this.parseLogForStatus(projectId, line);

    // Emit event
    this.emit('harness:log', { projectId, line });
    this.publishEvent(projectId, 'harness:log', { line });
  }

  /**
   * Parse log lines to extract status information
   */
  private parseLogForStatus(projectId: string, line: string): void {
    const harness = this.harnesses.get(projectId);
    if (!harness) return;

    // Parse session info: "Starting session #12 (CODING)"
    const sessionMatch = line.match(/session #?(\d+)\s*\((\w+)\)/i);
    if (sessionMatch) {
      harness.status.sessionNumber = parseInt(sessionMatch[1]);
      harness.status.sessionType = sessionMatch[2].toLowerCase() as 'initializer' | 'coding';
      harness.status.lastUpdate = new Date();
    }

    // Parse progress: "Progress: 45/100 features (45%)"
    const progressMatch = line.match(/(\d+)\/(\d+)\s*features/i);
    if (progressMatch) {
      harness.status.featuresPassing = parseInt(progressMatch[1]);
      harness.status.featuresTotal = parseInt(progressMatch[2]);
      harness.status.lastUpdate = new Date();
      
      this.emit('harness:progress', {
        projectId,
        passing: harness.status.featuresPassing,
        total: harness.status.featuresTotal,
      });
    }

    // Parse completion
    if (line.includes('Project complete') || line.includes('All features implemented')) {
      harness.status.status = 'idle';
      harness.status.lastUpdate = new Date();
    }
  }

  /**
   * Publish event to Redis for Socket.IO distribution
   */
  private async publishEvent(projectId: string, event: string, data: any): Promise<void> {
    await this.redis.publish(`agent:events:${projectId}`, JSON.stringify({
      event,
      data,
      timestamp: new Date().toISOString(),
    }));
  }

  /**
   * Get all running harnesses
   */
  getAllRunning(): HarnessStatus[] {
    return Array.from(this.harnesses.values())
      .filter(h => h.status.status === 'running')
      .map(h => ({ ...h.status }));
  }

  /**
   * Cleanup on shutdown
   */
  async shutdown(): Promise<void> {
    const promises = Array.from(this.harnesses.keys()).map(id => this.stop(id, true));
    await Promise.all(promises);
    await this.redis.quit();
  }
}

// Singleton instance
let instance: HarnessManager | null = null;

export function getHarnessManager(): HarnessManager {
  if (!instance) {
    instance = new HarnessManager();
  }
  return instance;
}

export default HarnessManager;

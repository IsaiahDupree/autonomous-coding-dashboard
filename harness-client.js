/**
 * Harness Client Service
 * Handles API calls and real-time updates for agent harness control
 */

class HarnessClient {
  constructor(baseUrl = 'http://localhost:4545') {
    this.baseUrl = baseUrl;
    this.socket = null;
    this.projectId = null;
    this.listeners = new Map();
    this.logBuffer = [];
    this.maxLogBuffer = 500;
  }

  /**
   * Initialize Socket.IO connection
   */
  connect() {
    if (this.socket) return;

    // Load Socket.IO from CDN if not already loaded
    if (typeof io === 'undefined') {
      console.warn('Socket.IO not loaded. Real-time updates disabled.');
      return;
    }

    this.socket = io(this.baseUrl);

    this.socket.on('connect', () => {
      console.log('Connected to harness server');
      this.emit('connected');
      
      // Re-subscribe to project if we had one
      if (this.projectId) {
        this.socket.emit('subscribe', this.projectId);
      }
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from harness server');
      this.emit('disconnected');
    });

    // Harness events
    this.socket.on('agent_event', (event) => {
      this.handleAgentEvent(event);
    });

    this.socket.on('harness:started', (data) => {
      this.emit('harness:started', data);
    });

    this.socket.on('harness:stopped', (data) => {
      this.emit('harness:stopped', data);
    });

    this.socket.on('harness:log', (data) => {
      this.addLog(data.line);
      this.emit('harness:log', data);
    });

    this.socket.on('features:updated', (data) => {
      this.emit('features:updated', data);
    });

    this.socket.on('progress:updated', (data) => {
      this.emit('progress:updated', data);
    });
  }

  /**
   * Subscribe to a project's events
   */
  subscribeToProject(projectId) {
    this.projectId = projectId;
    if (this.socket && this.socket.connected) {
      this.socket.emit('subscribe', projectId);
    }
  }

  /**
   * Handle agent events from Redis pub/sub
   */
  handleAgentEvent(event) {
    const { event: eventType, data, timestamp } = event;
    
    switch (eventType) {
      case 'harness:log':
        this.addLog(data.line);
        break;
      case 'features:updated':
        this.emit('features:updated', data);
        break;
      case 'progress:updated':
        this.emit('progress:updated', data);
        break;
      case 'harness:started':
      case 'harness:stopped':
      case 'harness:error':
        this.emit(eventType, data);
        break;
    }
  }

  /**
   * Add a log line to the buffer
   */
  addLog(line) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = { timestamp, line };
    
    this.logBuffer.push(logEntry);
    if (this.logBuffer.length > this.maxLogBuffer) {
      this.logBuffer.shift();
    }
    
    this.emit('log', logEntry);
  }

  /**
   * Get all logs
   */
  getLogs() {
    return [...this.logBuffer];
  }

  /**
   * Clear logs
   */
  clearLogs() {
    this.logBuffer = [];
    this.emit('logs:cleared');
  }

  // ==========================================
  // API Methods
  // ==========================================

  /**
   * Start harness for a project
   */
  async startHarness(projectId, options = {}) {
    const response = await fetch(`${this.baseUrl}/api/projects/${projectId}/harness/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });
    
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error?.message || 'Failed to start harness');
    }
    
    this.subscribeToProject(projectId);
    return result.data;
  }

  /**
   * Stop harness for a project
   */
  async stopHarness(projectId, force = false) {
    const response = await fetch(`${this.baseUrl}/api/projects/${projectId}/harness/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force }),
    });
    
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error?.message || 'Failed to stop harness');
    }
    
    return result.data;
  }

  /**
   * Get harness status
   */
  async getStatus(projectId) {
    const response = await fetch(`${this.baseUrl}/api/projects/${projectId}/harness/status`);
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error?.message || 'Failed to get status');
    }
    
    return result.data;
  }

  /**
   * Get harness logs
   */
  async fetchLogs(projectId, limit = 100) {
    const response = await fetch(`${this.baseUrl}/api/projects/${projectId}/harness/logs?limit=${limit}`);
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error?.message || 'Failed to fetch logs');
    }
    
    return result.data;
  }

  /**
   * Get all running harnesses
   */
  async getAllRunning() {
    const response = await fetch(`${this.baseUrl}/api/harnesses`);
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error?.message || 'Failed to fetch harnesses');
    }
    
    return result.data;
  }

  /**
   * Get projects list
   */
  async getProjects() {
    const response = await fetch(`${this.baseUrl}/api/projects`);
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error?.message || 'Failed to fetch projects');
    }
    
    return result.data;
  }

  /**
   * Create a new project
   */
  async createProject(projectData) {
    const response = await fetch(`${this.baseUrl}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(projectData),
    });
    
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error?.message || 'Failed to create project');
    }
    
    return result.data;
  }

  /**
   * Sync features from feature_list.json
   */
  async syncFeatures(projectId, features) {
    const response = await fetch(`${this.baseUrl}/api/projects/${projectId}/features/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ features }),
    });
    
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error?.message || 'Failed to sync features');
    }
    
    return result.data;
  }

  // ==========================================
  // Event Emitter
  // ==========================================

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

// Create singleton instance
const harnessClient = new HarnessClient();

// Export for use
window.harnessClient = harnessClient;

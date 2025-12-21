// Agent Control Panel JavaScript
// Handles requirements checking, agent management, and terminal output

let autoScroll = true;
let agentProcess = null;
let systemRequirements = {
    python: { name: 'Python 3.x', status: 'checking', version: '' },
    pip: { name: 'pip', status: 'checking', version: '' },
    claudeCLI: { name: 'Claude Code CLI', status: 'checking', version: '' },
    git: { name: 'Git', status: 'checking', version: '' },
    nodejs: { name: 'Node.js', status: 'checking', version: '' },
    sdk: { name: 'claude-code-sdk', status: 'checking', version: '' },
    oauth: { name: 'OAuth Token', status: 'checking', value: '' },
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', function () {
    checkRequirements();
    startSystemMonitoring();
});

// Check all system requirements
async function checkRequirements() {
    addSystemLog('🔍 Checking system requirements...', 'info');

    // Simulate requirement checks (in real implementation, these would be API calls)
    setTimeout(() => {
        systemRequirements.python = { name: 'Python 3.x', status: 'success', version: '3.14.0' };
        systemRequirements.pip = { name: 'pip', status: 'success', version: '25.2' };
        systemRequirements.claudeCLI = { name: 'Claude Code CLI', status: 'success', version: '2.0.60' };
        systemRequirements.git = { name: 'Git', status: 'success', version: 'installed' };
        systemRequirements.nodejs = { name: 'Node.js', status: 'success', version: 'v25.2.1' };
        systemRequirements.sdk = { name: 'claude-code-sdk', status: 'success', version: '0.0.25' };
        systemRequirements.oauth = { name: 'OAuth Token', status: 'success', value: 'sk-ant-oat01-***JAAA' };

        renderRequirements();
        addSystemLog('✅ All requirements met!', 'success');
    }, 1000);
}

// Render requirements list
function renderRequirements() {
    const container = document.getElementById('requirements-list');
    container.innerHTML = '';

    Object.values(systemRequirements).forEach(req => {
        const item = document.createElement('div');
        item.className = 'requirement-item';

        const statusIcon = req.status === 'success' ? '✅' :
            req.status === 'error' ? '❌' :
                '⏳';

        const statusClass = req.status === 'success' ? 'success' :
            req.status === 'error' ? 'error' :
                'warning';

        const versionText = req.version || req.value || 'checking...';

        item.innerHTML = `
      <div class="requirement-label">
        <span class="status-icon ${statusClass}">${statusIcon}</span>
        <span>${req.name}</span>
      </div>
      <div class="requirement-status">
        <span style="color: var(--color-text-muted); font-size: 0.875rem;">
          ${versionText}
        </span>
      </div>
    `;

        container.appendChild(item);
    });
}

// Launch agent with configuration
function launchAgent(event) {
    event.preventDefault();

    const projectDir = document.getElementById('project-dir').value;
    const maxIterations = document.getElementById('max-iterations').value;
    const model = document.getElementById('model').value;

    addAgentLog('════════════════════════════════════════════════', 'info');
    addAgentLog('🚀 Launching Autonomous Coding Agent', 'info');
    addAgentLog('════════════════════════════════════════════════', 'info');
    addAgentLog('');
    addAgentLog(`📁 Project Directory: ${projectDir}`, 'info');
    addAgentLog(`🎯 Max Iterations: ${maxIterations || 'Unlimited'}`, 'info');
    addAgentLog(`🤖 Model: ${model}`, 'info');
    addAgentLog('');
    addSystemLog(`🚀 Agent launched with project: ${projectDir}`, 'success');

    // Update status
    document.getElementById('initializer-status').className = 'agent-status-indicator running';
    document.getElementById('initializer-status').innerHTML = '🟢 Running';

    // Simulate agent initialization
    simulateAgentRun(projectDir, maxIterations, model);
}

// Simulate agent running (in real implementation, this would connect to actual agent process)
function simulateAgentRun(projectDir, maxIterations, model) {
    const messages = [
        { delay: 500, text: '✓ Activating virtual environment...', type: 'success' },
        { delay: 800, text: '✓ Loading project configuration...', type: 'success' },
        { delay: 1200, text: `cd /tmp/claude-quickstarts/autonomous-coding`, type: 'info' },
        { delay: 1400, text: `source venv/bin/activate`, type: 'info' },
        { delay: 1800, text: `python3 autonomous_agent_demo.py --project-dir ${projectDir}${maxIterations ? ` --max-iterations ${maxIterations}` : ''}`, type: 'info' },
        { delay: 2200, text: '', type: 'info' },
        { delay: 2400, text: '═══════════════════════════════════════════════════════════', type: 'info' },
        { delay: 2600, text: '🔧 SESSION 1: INITIALIZER AGENT', type: 'info' },
        { delay: 2800, text: '═══════════════════════════════════════════════════════════', type: 'info' },
        { delay: 3000, text: '', type: 'info' },
        { delay: 3200, text: '📋 Reading app_spec.txt...', type: 'info' },
        { delay: 3800, text: '✓ Application specification loaded', type: 'success' },
        { delay: 4200, text: '📝 Generating feature list with 200 test cases...', type: 'info' },
        { delay: 5000, text: '   ⏳ This may take several minutes...', type: 'warning' },
        { delay: 7000, text: '✓ Created feature_list.json (200 test cases)', type: 'success' },
        { delay: 7500, text: '📁 Setting up project structure...', type: 'info' },
        { delay: 8000, text: '✓ Created directories and init.sh', type: 'success' },
        { delay: 8300, text: '🔧 Initializing git repository...', type: 'info' },
        { delay: 8700, text: '✓ Git initialized', type: 'success' },
        { delay: 9000, text: '✓ Initial commit created', type: 'success' },
        { delay: 9300, text: '', type: 'info' },
        { delay: 9500, text: '✅ SESSION 1 COMPLETE', type: 'success' },
        { delay: 9700, text: '', type: 'info' },
        { delay: 10000, text: '⏱️  Waiting 3 seconds before starting Session 2...', type: 'warning' },
        { delay: 13000, text: '', type: 'info' },
        { delay: 13200, text: '═══════════════════════════════════════════════════════════', type: 'info' },
        { delay: 13400, text: '💻 SESSION 2: CODING AGENT', type: 'info' },
        { delay: 13600, text: '═══════════════════════════════════════════════════════════', type: 'info' },
        { delay: 13800, text: '', type: 'info' },
        { delay: 14200, text: '📊 Features: 0/200 passing', type: 'info' },
        { delay: 14600, text: '🔍 Analyzing codebase...', type: 'info' },
        { delay: 15500, text: '📝 Picking next feature: #1 - Initialize Git Repository', type: 'info' },
        { delay: 16000, text: '🔨 Implementing feature...', type: 'info' },
        { delay: 18000, text: '   Running: npm install', type: 'info' },
        { delay: 20000, text: '   Running: npm test', type: 'info' },
        { delay: 21000, text: '✓ Tests passing (1/1)', type: 'success' },
        { delay: 21500, text: '✓ Git commit: feat: initialize git repository', type: 'success' },
        { delay: 21800, text: '✅ Feature #1 complete', type: 'success' },
        { delay: 22000, text: '', type: 'info' },
        { delay: 22500, text: '📊 Progress: 1/200 features (0.5%)', type: 'info' },
        { delay: 23000, text: '⏱️  Average time per feature: 2m 15s', type: 'info' },
        { delay: 23500, text: '', type: 'info' },
        { delay: 24000, text: '🔄 Continuing with next feature...', type: 'info' },
    ];

    let fullOutput = '';
    messages.forEach(({ delay, text, type }) => {
        setTimeout(() => {
            addAgentLog(text, type);
            fullOutput += text + '\n';
            addFullLog(text, type);
            addSystemLog(text, type);
        }, delay);
    });

    // Update status after completion
    setTimeout(() => {
        document.getElementById('initializer-status').className = 'agent-status-indicator idle';
        document.getElementById('initializer-status').innerHTML = '✅ Complete';

        document.getElementById('coding-status').className = 'agent-status-indicator running';
        document.getElementById('coding-status').innerHTML = '🟢 Running';
    }, 10000);
}

// Add log to agent terminal
function addAgentLog(message, type = 'info') {
    const terminal = document.getElementById('agent-terminal');
    const line = document.createElement('div');
    line.className = `terminal-line ${type}`;
    line.textContent = message;
    terminal.appendChild(line);

    if (autoScroll) {
        terminal.scrollTop = terminal.scrollHeight;
    }
}

// Add log to system terminal
function addSystemLog(message, type = 'info') {
    const terminal = document.getElementById('system-terminal');
    const line = document.createElement('div');
    line.className = `terminal-line ${type}`;
    const timestamp = new Date().toLocaleTimeString();
    line.innerHTML = `<span style="color: var(--color-text-muted);">[${timestamp}]</span> ${message}`;
    terminal.appendChild(line);

    if (autoScroll) {
        terminal.scrollTop = terminal.scrollHeight;
    }
}

// Add log to full terminal
function addFullLog(message, type = 'info') {
    const terminal = document.getElementById('full-terminal');
    const line = document.createElement('div');
    line.className = `terminal-line ${type}`;
    line.textContent = message;
    terminal.appendChild(line);

    if (autoScroll) {
        terminal.scrollTop = terminal.scrollHeight;
    }
}

// Clear terminal
function clearTerminal(terminalId) {
    const terminalMap = {
        'agent': 'agent-terminal',
        'system': 'system-terminal',
        'full': 'full-terminal'
    };

    const terminal = document.getElementById(terminalMap[terminalId]);
    terminal.innerHTML = `
    <div class="terminal-line">
      <span class="terminal-prompt">$</span> Terminal cleared
    </div>
  `;
}

// Copy terminal content
function copyTerminal(terminalId) {
    const terminalMap = {
        'agent': 'agent-terminal',
        'system': 'system-terminal'
    };

    const terminal = document.getElementById(terminalMap[terminalId]);
    const text = terminal.innerText;

    navigator.clipboard.writeText(text).then(() => {
        addSystemLog('📋 Terminal content copied to clipboard', 'success');
    });
}

// Toggle auto-scroll
function toggleAutoScroll() {
    autoScroll = !autoScroll;
    const indicator = document.getElementById('autoscroll-indicator');
    indicator.textContent = autoScroll ? '🔽 Auto-scroll ON' : '⏸️ Auto-scroll OFF';
}

// Export logs
function exportLogs() {
    const terminal = document.getElementById('full-terminal');
    const text = terminal.innerText;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agent-logs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    addSystemLog('💾 Logs exported successfully', 'success');
}

// Quick test with 3 iterations
function quickTest() {
    document.getElementById('project-dir').value = './test_project';
    document.getElementById('max-iterations').value = '3';
    document.getElementById('launch-btn').click();
}

// Resume last session
function resumeAgent() {
    addSystemLog('🔄 Resuming from last session...', 'info');
    addAgentLog('🔄 Looking for existing sessions...', 'info');
    addAgentLog('✓ Found session: my_project', 'success');
    addAgentLog('✓ Resuming from feature #142', 'success');
    document.getElementById('coding-status').className = 'agent-status-indicator running';
    document.getElementById('coding-status').innerHTML = '🟢 Running';
}

// Open in VS Code
function openProjectInCode() {
    const projectDir = document.getElementById('project-dir').value;
    addSystemLog(`📂 Opening ${projectDir} in VS Code...`, 'info');
    // In real implementation, this would open VS Code
    setTimeout(() => {
        addSystemLog('✓ Project opened in VS Code', 'success');
    }, 500);
}

// Start agent
function startAgent(agentType) {
    const statusId = `${agentType}-status`;
    const statusElement = document.getElementById(statusId);
    statusElement.className = 'agent-status-indicator running';
    statusElement.innerHTML = '🟢 Running';

    addSystemLog(`▶️ Starting ${agentType} agent...`, 'info');
    addAgentLog(`═══ ${agentType.toUpperCase()} AGENT STARTED ═══`, 'success');
}

// Stop agent
function stopAgent(agentType) {
    const statusId = `${agentType}-status`;
    const statusElement = document.getElementById(statusId);
    statusElement.className = 'agent-status-indicator idle';
    statusElement.innerHTML = '⏸️ Paused';

    addSystemLog(`⏸️ Stopping ${agentType} agent...`, 'warning');
    addAgentLog(`═══ ${agentType.toUpperCase()} AGENT STOPPED ═══`, 'warning');
    addAgentLog('To resume, run the same command again', 'info');
}

// View logs
function viewLogs(agentType) {
    addSystemLog(`📋 Viewing ${agentType} agent logs...`, 'info');
    addFullLog(`═══════════ ${agentType.toUpperCase()} AGENT LOGS ═══════════`, 'info');
    addFullLog('Session logs would appear here...', 'info');
}

// Start system monitoring
function startSystemMonitoring() {
    // Update system stats every 5 seconds
    setInterval(() => {
        const timestamp = new Date().toLocaleTimeString();
        addFullLog(`[${timestamp}] System health check: OK`, 'info');
    }, 30000);
}

// Export functions to global scope
window.checkRequirements = checkRequirements;
window.launchAgent = launchAgent;
window.clearTerminal = clearTerminal;
window.copyTerminal = copyTerminal;
window.toggleAutoScroll = toggleAutoScroll;
window.exportLogs = exportLogs;
window.quickTest = quickTest;
window.resumeAgent = resumeAgent;
window.openProjectInCode = openProjectInCode;
window.startAgent = startAgent;
window.stopAgent = stopAgent;
window.viewLogs = viewLogs;

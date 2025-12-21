// Mock Data Generator for Autonomous Coding Agent Dashboard
// This file simulates data from the autonomous-coding agent

// Feature list with 200 test cases (showing sample)
const mockFeatures = [
    { id: 1, name: "Initialize Git Repository", status: "passing", timeSpent: "2m 15s", session: 1 },
    { id: 2, name: "Create Project Structure", status: "passing", timeSpent: "1m 30s", session: 1 },
    { id: 3, name: "Setup Package.json", status: "passing", timeSpent: "3m 45s", session: 2 },
    { id: 4, name: "Install Dependencies", status: "passing", timeSpent: "4m 20s", session: 2 },
    { id: 5, name: "Create Express Server", status: "passing", timeSpent: "6m 10s", session: 2 },
    { id: 6, name: "Setup Database Connection", status: "passing", timeSpent: "8m 35s", session: 2 },
    { id: 7, name: "User Authentication System", status: "passing", timeSpent: "12m 40s", session: 2 },
    { id: 8, name: "JWT Token Implementation", status: "passing", timeSpent: "9m 15s", session: 2 },
    { id: 9, name: "Password Hashing", status: "passing", timeSpent: "5m 50s", session: 2 },
    { id: 10, name: "User Registration Endpoint", status: "passing", timeSpent: "7m 25s", session: 2 },
    { id: 11, name: "Login Endpoint", status: "passing", timeSpent: "6m 30s", session: 2 },
    { id: 12, name: "Profile Management", status: "passing", timeSpent: "10m 15s", session: 2 },
    { id: 13, name: "Email Validation", status: "passing", timeSpent: "4m 45s", session: 2 },
    { id: 14, name: "Password Reset Flow", status: "passing", timeSpent: "11m 20s", session: 3 },
    { id: 15, name: "Email Service Integration", status: "passing", timeSpent: "9m 40s", session: 3 },
    { id: 16, name: "API Rate Limiting", status: "passing", timeSpent: "7m 55s", session: 3 },
    { id: 17, name: "CORS Configuration", status: "passing", timeSpent: "3m 30s", session: 3 },
    { id: 18, name: "Error Handling Middleware", status: "passing", timeSpent: "8m 10s", session: 3 },
    { id: 19, name: "Logging System", status: "passing", timeSpent: "6m 25s", session: 3 },
    { id: 20, name: "Environment Variables", status: "passing", timeSpent: "4m 15s", session: 3 },
];

// Generate more features to reach 200
for (let i = 21; i <= 142; i++) {
    const features = [
        "Data Model", "API Endpoint", "Validation Logic", "Test Suite",
        "UI Component", "Service Layer", "Controller", "Middleware",
        "Helper Function", "Utility Module", "Configuration"
    ];
    const randomFeature = features[Math.floor(Math.random() * features.length)];
    const session = i <= 45 ? 2 : i <= 83 ? 3 : i <= 130 ? 4 : 5;

    mockFeatures.push({
        id: i,
        name: `${randomFeature} #${i}`,
        status: "passing",
        timeSpent: `${Math.floor(Math.random() * 15) + 3}m ${Math.floor(Math.random() * 60)}s`,
        session: session
    });
}

// Add pending features
for (let i = 143; i <= 200; i++) {
    const features = [
        "Data Model", "API Endpoint", "Validation Logic", "Test Suite",
        "UI Component", "Service Layer", "Controller", "Middleware"
    ];
    const randomFeature = features[Math.floor(Math.random() * features.length)];

    mockFeatures.push({
        id: i,
        name: `${randomFeature} #${i}`,
        status: "pending",
        timeSpent: "-",
        session: 5
    });
}

// Activity timeline data
const mockActivities = [
    {
        time: "2 min ago",
        title: "Feature Completed",
        description: "✅ User Authentication - Tests passing",
        type: "success"
    },
    {
        time: "5 min ago",
        title: "Git Commit",
        description: "feat: implement user authentication system",
        type: "info"
    },
    {
        time: "8 min ago",
        title: "Command Executed",
        description: "npm test -- user-auth.test.js",
        type: "info"
    },
    {
        time: "12 min ago",
        title: "Feature Started",
        description: "🔨 Working on JWT Token Implementation",
        type: "warning"
    },
    {
        time: "18 min ago",
        title: "Feature Completed",
        description: "✅ Database Connection Setup - Tests passing",
        type: "success"
    },
    {
        time: "25 min ago",
        title: "Git Commit",
        description: "feat: setup database connection and models",
        type: "info"
    },
    {
        time: "32 min ago",
        title: "Command Executed",
        description: "npm install mongoose dotenv",
        type: "info"
    },
    {
        time: "38 min ago",
        title: "Session Started",
        description: "🚀 Session 5 initialized",
        type: "success"
    }
];

// Git commit history
const mockGitCommits = [
    {
        time: "5 min ago",
        hash: "a3f4b2c",
        message: "feat: implement user authentication system",
        files: 4
    },
    {
        time: "25 min ago",
        hash: "d7e9f1a",
        message: "feat: setup database connection and models",
        files: 3
    },
    {
        time: "42 min ago",
        hash: "b2c8d4e",
        message: "feat: initialize express server and middleware",
        files: 5
    },
    {
        time: "1 hour ago",
        hash: "f5a7c9b",
        message: "chore: setup project dependencies",
        files: 2
    },
    {
        time: "1 hour ago",
        hash: "c4d6e8f",
        message: "feat: create project structure",
        files: 8
    },
    {
        time: "2 hours ago",
        hash: "e9f1a3d",
        message: "init: initialize git repository",
        files: 1
    }
];

// Command execution log
const mockCommands = [
    {
        time: "1 min ago",
        command: "npm test user-auth.test.js",
        status: "success",
        output: "All tests passed (12/12)"
    },
    {
        time: "3 min ago",
        command: "git commit -m 'feat: implement user authentication'",
        status: "success",
        output: "4 files changed, 247 insertions(+)"
    },
    {
        time: "5 min ago",
        command: "npm run lint",
        status: "success",
        output: "No linting errors found"
    },
    {
        time: "8 min ago",
        command: "git add .",
        status: "success",
        output: "Staged 4 files"
    },
    {
        time: "12 min ago",
        command: "npm install jsonwebtoken bcrypt",
        status: "success",
        output: "Added 2 packages"
    },
    {
        time: "15 min ago",
        command: "cat src/auth/controller.js",
        status: "success",
        output: "Displayed file contents (87 lines)"
    },
    {
        time: "18 min ago",
        command: "ls src/",
        status: "success",
        output: "auth/ models/ routes/ utils/"
    },
    {
        time: "22 min ago",
        command: "npm run dev",
        status: "success",
        output: "Server started on port 3000"
    },
    {
        time: "28 min ago",
        command: "grep -r 'TODO' src/",
        status: "success",
        output: "Found 3 TODOs"
    },
    {
        time: "35 min ago",
        command: "git status",
        status: "success",
        output: "On branch main. Working tree clean."
    }
];

// Token usage over time (last 24 hours)
const mockTokenUsage = {
    labels: ["12am", "3am", "6am", "9am", "12pm", "3pm", "6pm", "9pm"],
    input: [120000, 85000, 95000, 180000, 250000, 320000, 280000, 150000],
    output: [45000, 32000, 38000, 72000, 98000, 125000, 110000, 58000]
};

// Command execution frequency
const mockCommandStats = {
    labels: ["git", "npm", "node", "cat", "ls", "grep", "test"],
    counts: [156, 89, 45, 234, 178, 67, 142]
};

// Session data
const mockSessions = [
    {
        id: 1,
        type: "Initializer",
        features: 0,
        duration: "4m 32s",
        status: "completed",
        startTime: "2024-12-05 08:00:00",
        endTime: "2024-12-05 08:04:32",
        commits: 2,
        tokens: 45000
    },
    {
        id: 2,
        type: "Coding",
        features: 45,
        duration: "6h 15m",
        status: "completed",
        startTime: "2024-12-05 08:05:00",
        endTime: "2024-12-05 14:20:00",
        commits: 47,
        tokens: 850000
    },
    {
        id: 3,
        type: "Coding",
        features: 38,
        duration: "5h 42m",
        status: "completed",
        startTime: "2024-12-05 14:23:00",
        endTime: "2024-12-05 20:05:00",
        commits: 40,
        tokens: 720000
    },
    {
        id: 4,
        type: "Coding",
        features: 47,
        duration: "7h 8m",
        status: "completed",
        startTime: "2024-12-05 20:08:00",
        endTime: "2024-12-06 03:16:00",
        commits: 49,
        tokens: 920000
    },
    {
        id: 5,
        type: "Coding",
        features: 12,
        duration: "2h 14m",
        status: "running",
        startTime: "2024-12-06 03:19:00",
        endTime: null,
        commits: 14,
        tokens: 185000
    }
];

// Progress timeline data (features completed per hour)
const mockProgressTimeline = {
    labels: Array.from({ length: 24 }, (_, i) => `${i}h`),
    data: [0, 0, 0, 0, 0, 0, 0, 0, 2, 5, 8, 12, 15, 18, 23, 28, 35, 42, 47, 52, 58, 65, 72, 80]
};

// Extended timeline for "all" view
const mockProgressTimelineAll = {
    labels: ["Session 1", "Session 2", "Session 3", "Session 4", "Session 5"],
    data: [0, 45, 83, 130, 142]
};

// Export all mock data
const mockData = {
    features: mockFeatures,
    activities: mockActivities,
    gitCommits: mockGitCommits,
    commands: mockCommands,
    tokenUsage: mockTokenUsage,
    commandStats: mockCommandStats,
    sessions: mockSessions,
    progressTimeline: mockProgressTimeline,
    progressTimelineAll: mockProgressTimelineAll
};

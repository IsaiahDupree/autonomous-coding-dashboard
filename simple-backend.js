/**
 * Simple backend server for PRD Viewer
 * Serves the PRD Viewer API endpoints
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3435; // Use different port to avoid conflicts

// Middleware
app.use(cors());
app.use(express.json());

// GET /api/projects/list - List all projects from repo-queue.json
app.get('/api/projects/list', (req, res) => {
    try {
        const queueFilePath = path.join(__dirname, 'harness', 'repo-queue.json');

        if (!fs.existsSync(queueFilePath)) {
            return res.status(404).json({
                success: false,
                error: 'repo-queue.json not found'
            });
        }

        const queueData = JSON.parse(fs.readFileSync(queueFilePath, 'utf-8'));

        res.json({
            success: true,
            data: {
                repos: queueData.repos || [],
                total: queueData.repos?.length || 0
            }
        });
    } catch (error) {
        console.error('Error loading projects:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to load projects'
        });
    }
});

// GET /api/prd/read - Read PRD file content
app.get('/api/prd/read', (req, res) => {
    try {
        const prdPath = req.query.path;

        if (!prdPath) {
            return res.status(400).json({
                success: false,
                error: 'PRD path is required'
            });
        }

        // Check if file exists
        if (!fs.existsSync(prdPath)) {
            return res.status(404).json({
                success: false,
                error: 'PRD file not found at: ' + prdPath
            });
        }

        // Read file content
        const content = fs.readFileSync(prdPath, 'utf-8');
        const stats = fs.statSync(prdPath);

        res.json({
            success: true,
            data: {
                content,
                path: prdPath,
                size: content.length,
                lastModified: stats.mtime
            }
        });
    } catch (error) {
        console.error('Error reading PRD:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to read PRD file'
        });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'simple-prd-backend' });
});

// Start server
app.listen(PORT, () => {
    console.log(`✅ Simple PRD Backend running on http://localhost:${PORT}`);
    console.log(`   - GET /api/projects/list`);
    console.log(`   - GET /api/prd/read?path=<filepath>`);
});

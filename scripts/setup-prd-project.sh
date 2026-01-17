#!/bin/bash
# Setup a project directory with PRD for autonomous coding

set -e

PROJECT_NAME=${1:-"test-project"}
PROJECT_DIR="test-projects/${PROJECT_NAME}"
PRD_FILE=${2:-""}

if [ -z "$PROJECT_NAME" ]; then
    echo "Usage: $0 <project-name> [prd-file.md]"
    exit 1
fi

echo "🚀 Setting up autonomous coding project: ${PROJECT_NAME}"

# Create project directory
mkdir -p "${PROJECT_DIR}"
cd "${PROJECT_DIR}"

# Copy PRD if provided
if [ -n "$PRD_FILE" ] && [ -f "$PRD_FILE" ]; then
    cp "$PRD_FILE" PRD.md
    echo "✅ Copied PRD from: $PRD_FILE"
elif [ -f "PRD.md" ]; then
    echo "✅ PRD.md already exists"
else
    # Create a sample PRD
    cat > PRD.md << 'EOF'
# Project Requirements Document

## Overview
This is a test project for autonomous coding.

## Features
- Feature 1: Basic functionality
- Feature 2: User interface
- Feature 3: Data persistence

## Technical Requirements
- Modern web framework
- Responsive design
- API integration

## Success Criteria
- All features implemented
- Tests passing
- Documentation complete
EOF
    echo "✅ Created sample PRD.md"
fi

# Initialize git if not already
if [ ! -d ".git" ]; then
    git init
    echo "✅ Initialized git repository"
fi

# Create initial feature list (empty - will be populated by initializer)
cat > feature_list.json << 'EOF'
{
  "features": []
}
EOF

# Create progress file
touch claude-progress.txt
echo "# Progress Log" > claude-progress.txt
echo "" >> claude-progress.txt
echo "=== Session $(date +%Y-%m-%d\ %H:%M:%S) ===" >> claude-progress.txt
echo "- Project initialized" >> claude-progress.txt

# Create init.sh
cat > init.sh << 'EOF'
#!/bin/bash
# Initialize development environment

echo "🚀 Starting development environment for $(basename $(pwd))"
echo ""
echo "Project: $(pwd)"
echo "PRD: $(test -f PRD.md && echo 'PRD.md exists' || echo 'No PRD.md')"
echo ""
echo "Ready for autonomous coding!"
EOF
chmod +x init.sh

echo ""
echo "✅ Project setup complete!"
echo ""
echo "📁 Project directory: $(pwd)"
echo "📄 PRD: PRD.md"
echo "📋 Features: feature_list.json (will be populated by initializer)"
echo ""
echo "Next steps:"
echo "  1. Review/edit PRD.md"
echo "  2. Run harness: cd harness && node run-harness.js"
echo "  3. Or use dashboard to start harness for this project"


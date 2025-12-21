#!/usr/bin/env python3
"""
Autonomous Coding Agent - Requirements Checker
Verifies all dependencies and configurations needed to run the autonomous-coding agent
"""

import subprocess
import sys
import os
from pathlib import Path

class RequirementsChecker:
    def __init__(self):
        self.blockers = []
        self.warnings = []
        self.passed = []
        
    def check_command(self, cmd, name, required=True):
        """Check if a command exists and is executable"""
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=5
            )
            version = result.stdout.strip() or result.stderr.strip()
            self.passed.append(f"✅ {name}: {version.split()[0] if version else 'Installed'}")
            return True
        except (subprocess.TimeoutExpired, FileNotFoundError) as e:
            if required:
                self.blockers.append(f"❌ {name}: Not found (REQUIRED)")
            else:
                self.warnings.append(f"⚠️  {name}: Not found (optional)")
            return False
    
    def check_env_var(self, var_name, required=True):
        """Check if environment variable is set"""
        value = os.environ.get(var_name)
        if value:
            # Mask the token for security
            masked = value[:15] + "..." + value[-4:] if len(value) > 20 else value
            self.passed.append(f"✅ {var_name}: Set ({masked})")
            return True
        else:
            if required:
                self.blockers.append(f"❌ {var_name}: Not set (REQUIRED)")
            else:
                self.warnings.append(f"⚠️  {var_name}: Not set (optional)")
            return False
    
    def check_python_package(self, package_name, required=True):
        """Check if a Python package is installed"""
        try:
            result = subprocess.run(
                [sys.executable, "-m", "pip", "show", package_name],
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode == 0:
                # Extract version
                for line in result.stdout.split('\n'):
                    if line.startswith('Version:'):
                        version = line.split(':', 1)[1].strip()
                        self.passed.append(f"✅ Python package '{package_name}': v{version}")
                        return True
            raise Exception("Not found")
        except Exception as e:
            if required:
                self.blockers.append(f"❌ Python package '{package_name}': Not installed (REQUIRED)")
            else:
                self.warnings.append(f"⚠️  Python package '{package_name}': Not installed (optional)")
            return False
    
    def run_all_checks(self):
        """Run all requirement checks"""
        print("=" * 70)
        print("🔍 AUTONOMOUS CODING AGENT - REQUIREMENTS CHECK")
        print("=" * 70)
        print()
        
        # 1. Check Python
        print("📦 Checking Python Environment...")
        self.check_command([sys.executable, "--version"], "Python", required=True)
        self.check_command([sys.executable, "-m", "pip", "--version"], "pip", required=True)
        print()
        
        # 2. Check Claude CLI
        print("🤖 Checking Claude Code CLI...")
        self.check_command(["claude", "--version"], "Claude Code CLI", required=True)
        print()
        
        # 3. Check Git
        print("📝 Checking Version Control...")
        self.check_command(["git", "--version"], "Git", required=True)
        print()
        
        # 4. Check Node.js (for generated apps)
        print("🟢 Checking Node.js Environment...")
        self.check_command(["node", "--version"], "Node.js", required=False)
        self.check_command(["npm", "--version"], "npm", required=False)
        print()
        
        # 5. Check Python packages
        print("📚 Checking Python Dependencies...")
        self.check_python_package("claude-code-sdk", required=True)
        print()
        
        # 6. Check environment variables
        print("🔑 Checking Authentication...")
        
        # Check for API key
        has_api_key = self.check_env_var("ANTHROPIC_API_KEY", required=False)
        
        # Check for OAuth token
        has_oauth = self.check_env_var("CLAUDE_CODE_OAUTH_TOKEN", required=False)
        
        # At least one auth method is required
        if not has_api_key and not has_oauth:
            self.blockers.append(
                "❌ Authentication: Must set either ANTHROPIC_API_KEY or CLAUDE_CODE_OAUTH_TOKEN"
            )
        print()
        
        # 7. Print summary
        self.print_summary()
        
        return len(self.blockers) == 0
    
    def print_summary(self):
        """Print final summary and recommendations"""
        print("=" * 70)
        print("📊 SUMMARY")
        print("=" * 70)
        print()
        
        if self.passed:
            print("✅ PASSED CHECKS:")
            for item in self.passed:
                print(f"  {item}")
            print()
        
        if self.warnings:
            print("⚠️  WARNINGS:")
            for item in self.warnings:
                print(f"  {item}")
            print()
        
        if self.blockers:
            print("❌ BLOCKERS (Must fix before running):")
            for item in self.blockers:
                print(f"  {item}")
            print()
            print("🔧 RECOMMENDED FIXES:")
            print()
            
            # Provide specific fix instructions
            for blocker in self.blockers:
                if "claude-code-sdk" in blocker:
                    print("  Install Claude Agent SDK:")
                    print("    pip3 install claude-code-sdk")
                    print()
                
                if "ANTHROPIC_API_KEY" in blocker or "Authentication" in blocker:
                    print("  Set up authentication (choose one):")
                    print("    Option 1 - OAuth Token (recommended for interactive use):")
                    print("      claude setup-token")
                    print("      export CLAUDE_CODE_OAUTH_TOKEN=<token>")
                    print()
                    print("    Option 2 - API Key (for automation):")
                    print("      export ANTHROPIC_API_KEY=<your-api-key>")
                    print()
                
                if "Claude Code CLI" in blocker:
                    print("  Install Claude Code CLI:")
                    print("    npm install -g @anthropic-ai/claude-code")
                    print()
                
                if "Git" in blocker:
                    print("  Install Git:")
                    print("    brew install git  # macOS")
                    print()
        
        print("=" * 70)
        
        if not self.blockers:
            print("🎉 ALL REQUIREMENTS MET!")
            print("✅ You're ready to run the autonomous coding agent!")
            print()
            print("To get started:")
            print("  cd /tmp/claude-quickstarts/autonomous-coding")
            print("  pip3 install -r requirements.txt")
            print("  python3 autonomous_agent_demo.py --project-dir ./my_project")
        else:
            print("⛔ CANNOT RUN - Fix blockers above first")
            print(f"   Found {len(self.blockers)} blocker(s)")
        
        print("=" * 70)

if __name__ == "__main__":
    checker = RequirementsChecker()
    success = checker.run_all_checks()
    sys.exit(0 if success else 1)

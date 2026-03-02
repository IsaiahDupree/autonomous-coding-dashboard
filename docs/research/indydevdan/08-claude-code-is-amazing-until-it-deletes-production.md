# Claude Code is Amazing... Until It DELETES Production

**URL**: https://www.youtube.com/watch?v=VqDs46A8pqE
**Uploaded**: NA
**Views**: 19143
**Duration**: 1343.0s
**Research Date**: 2026-03-01

---

## Summary
The video by @IndyDevDan focuses on the potential risks and mitigation strategies when using agentic AI systems, specifically Claude Code, in production environments. It demonstrates how to set up robust damage control mechanisms to prevent accidental or malicious deletion of critical production assets through hooks and prompt-based safeguards.

## Core Concepts & Ideas
- Agentic AI systems and their potential for hallucinations.
- Importance of damage control in AI-assisted coding environments.
- Use of hooks (local, global, prompt) to prevent destructive commands.
- Configurable skill for managing hooks and preventing irreversible damage.
- Importance of deterministic and non-deterministic command blocking.

## Key Software Practices
- Setting up pre-tool use hooks to block dangerous commands.
- Using prompt hooks to ask for confirmation before executing risky operations.
- Implementing a patterns file for managing command restrictions.
- Employing interactive installation processes for setting up security hooks.
- Leveraging global hooks for comprehensive protection across all projects.

## Architecture & Design Patterns
- Use of a lightweight patterns file to manage command restrictions.
- Agentic workflow using a cookbook for installation and configuration.
- Hierarchical hook system: global, project, and local levels.
- Integration of prompt-based decision-making in command execution.

## Tools & Technologies
- Claude Code: AI system used for coding assistance.
- Bash: Command-line shell for executing scripts.
- JSON: Configuration format for managing hooks.
- YAML: Used for patterns file to manage command restrictions.
- Astral UV and Bun: Tools for setting up deterministic hooks.
- Git: Version control system for managing codebases.

## Actionable Takeaways
1. Implement pre-tool use hooks to block known destructive commands.
2. Use prompt hooks to confirm execution of potentially risky operations.
3. Set up a patterns file to manage command restrictions and permissions.
4. Employ global hooks for consistent protection across all projects.
5. Use interactive installation processes to streamline security setup.
6. Regularly update deterministic hooks with new dangerous commands.
7. Consider using sandboxes to mitigate risks and build trust with AI agents.

## Integration Opportunities for Our Stack
- **actp-worker**: Integrate hooks to prevent destructive commands during workflow execution.
- **Safari Automation**: Use prompt hooks to confirm sensitive browser actions.
- **ACTP Lite services**: Implement global hooks to safeguard content and data operations.
- **CRMLite, WorkflowEngine**: Employ patterns file to manage command restrictions in workflows.
- **Dual-agent system**: Use deterministic and non-deterministic hooks to manage agent interactions.
- **Blotato publishing pipeline**: Ensure hooks are in place to protect publishing assets from accidental deletion.

## Quotable Moments
1. "Your agents are always one hallucination away from destroying everything you've built."
2. "It's important to have great defaults for security and then run with it."
3. "Running a prompt every single time is faster than potentially deleting a valuable production asset."

## Tags
AI safety, agentic AI, Claude Code, damage control, hooks, prompt hooks, software security, production systems, coding practices, AI automation, indie developer, software architecture, coding workflows, AI hallucinations.

---

## Raw Transcript Excerpt

```
It's 7:30 in the morning and you're a hotshot agentic engineer getting ahead on the new year. You crack open your terminal and fire up the best agent coding tool claude code running open 4.5 in yolo mode. You're running Claude in your 7 figureure revenue generating codebase and you scaled it to this level with your powerful/ sentient command. This command does your job for you. But today something goes wrong. Your agent had too much compute last night and it starts hallucinating at the worst possible time back to backto back running damaging commands. Thankfully, they were all caught by your clawed code hooks, your local hooks, your global hooks, and your prompt hooks. You even set up prompt requests where if your agent is unsure, it's going to ask you, "We don't want to delete this user, so we're going to go down and we're going to type skip." Every catastrophic command that your agent tried to run was blocked. You think back to that Andy Devdan video you watched and you think about that clawed code damage control you learned that prevented your agents from running catastrophic irreversible double Thanos snap career destroying commands. This can happen at any time to any engineer. Obviously I set up this example as a proof of concept to showcase this idea to you. If you delete your codebase, your git repo, or your production database, like we've seen the vibe coders do over and over, it doesn't matter how fast, powerful, or autonomous your agents are. All of your months and years of hard work can be evaporated in a single misinterpreted or hallucinated command. Today in this video, we're going to enhance your agentic coating and add the armor to your production systems it needs to prevent irreversible damage. I have this all configurable in a simple skill you can use to both install and manage your hooks. Let's start the new year outright by not deleting our most valuable engineering resources we work so hard for. This dangerous mock command/s sentient showcased several unique damage control measures through clawed code hooks. Local hooks, global hooks, ask permission functionality and the prompt hook. Most engineers don't know about prompt hooks, so let's start there. I want to show you how you can quickly set this up end to end and then we'll jump right into the prompt hook. The setup here is very simple. We're going to spin up a new terminal window here. We're going to go to temp. Let's go ahead and get the clone command for this. I'll have this linked in the description for you. I'll hit code, copy, get clone, fire that off, cd into claw code damage control, and then right away, we'll just boot up cloud code here. All you have to do to get started is type /install. Now, while this is running, I'm going to open up a new tab here and just open this up. We'll go ahead and use cursor here. And this /install command is a new pattern I'm going to be using more often where we can set up interactive installation processes. So you can see here our ag...
```

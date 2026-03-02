# One Prompt Every AGENTIC Codebase Should Have (For Engineering Teams)

**URL**: https://www.youtube.com/watch?v=3_mwKbYvbUg
**Uploaded**: NA
**Views**: 18381
**Duration**: 1356.0s
**Research Date**: 2026-03-01

---

## Summary
The video discusses the integration of agentic AI systems with deterministic scripts to streamline the setup and maintenance of codebases. It introduces a new pattern using a command runner called "just file" to automate and standardize the onboarding process for new engineers, enhancing efficiency and consistency in engineering workflows.

## Core Concepts & Ideas
- Agentic AI systems for codebase management
- Deterministic hooks combined with agentic prompts
- Standardization of installation and maintenance processes
- Human-in-the-loop interactive workflows
- Automation of common engineering tasks

## Key Software Practices
- Use of command runners (just file) to standardize workflows
- Combining scripts with AI agents for intelligent automation
- Logging and documentation generation during setup processes
- Interactive onboarding processes for new engineers
- Embedding common issue resolutions within prompts

## Architecture & Design Patterns
- Use of setup and maintenance hooks in codebase lifecycle
- Integration of agentic prompts with deterministic scripts
- Human-in-the-loop design for interactive installations
- Modular command execution via a centralized command runner

## Tools & Technologies
- **Just file**: A command runner used to standardize and automate workflows.
- **Cloud Code**: Provides setup hooks for codebase initialization and maintenance.
- **SQLite3**: Used for database operations in the example codebase.
- **Node.js and npm**: For managing dependencies and running scripts.
- **Agentic AI systems**: Utilized for intelligent oversight and interactivity.

## Actionable Takeaways
1. Implement a command runner like just file to standardize your team's workflows.
2. Combine scripts with AI agents to automate setup and maintenance tasks.
3. Create interactive onboarding processes using human-in-the-loop designs.
4. Embed common issue resolutions directly into your setup prompts.
5. Use logging and documentation generation to enhance transparency and troubleshooting.
6. Standardize installation processes to ensure consistency across environments.
7. Leverage agentic AI systems to validate and optimize codebase operations.

## Integration Opportunities for Our Stack
- **actp-worker**: Use just file to manage and execute workflow scripts within the Python daemon.
- **Safari Automation**: Automate browser-based tasks using standardized command prompts.
- **ACTP Lite services**: Integrate agentic prompts to streamline content generation and publishing workflows.
- **CRMLite, WorkflowEngine**: Enhance workflow automation with agentic AI systems for intelligent task management.
- **Dual-agent system (OpenAI + Claude)**: Utilize dual agents for enhanced interactivity and oversight in codebase management.
- **Blotato publishing pipeline**: Standardize publishing processes using just file and agentic prompts.

## Quotable Moments
1. "You can tell how great an engineering team is by the time it takes for a new engineer to run the project locally."
2. "Combine deterministic hooks with standardized agentic prompts for predictable execution and intelligent oversight."
3. "Why do this by hand anymore? We're adding to the pile of things that our agents can do that we don't have to do anymore."

## Tags
Agentic AI, Codebase Management, Onboarding, Automation, Command Runner, Cloud Code, AI Agents, Workflow Standardization, Software Engineering, Human-in-the-loop

---

## Raw Transcript Excerpt

```
Do you know the simplest way to install and maintain your code bases as they grow? Here's something I've learned over 15 years of engineering with more than 50 plus code bases. You can tell how great an engineering team is by the time it takes for a new engineer to run the project locally. This says a lot about the team's growth and proficiency. And when you're joining a new team, that first interaction with the codebase and with the team members is so important. It really sets the stage for the new hire. For great teams, it's one link to one doc, a list of config file updates, and then a few commands. For most teams though, it's one to two days of pair programming, Slack messages, rumaging through outdated docs, and tons of back and forth testing. In the age of agents, we can do much better than this. The trick is in combining scripts, docs, and agents because agents when combined with code beats either alone. Cloud code released a brand new setup hook for this very purpose. It's an interesting hook though because it doesn't show up in the life cycle diagram for cloud code hooks. We're going to take this hook and push it further because when you combine deterministic hooks with standardized agentic prompts, you get the best of both worlds. Predictable execution, intelligent oversight, and interactivity when you need it. Let's discuss the best way to install and maintain your code bases as they grow in size and value. The first thing I want to do here is showcase a new powerful tool I've been using to guide my commands, agents, and developer tools. Let me introduce you to just file. This is a simple command runner that serves as a launchpad for your engineering work. You can see I have several commands set up, front end setup, backend, reset artifacts, and then we have something really interesting. I'm kicking off many different cloud agents with different CLI flags. With just file, you, your team, and your agents don't need to remember or look up flags more than once. They just run this. If we open the terminal and type just, you can see all the commands ready to go. This is a very powerful tool for scaling and reusing your customizable agents. Let's go ahead and run our first command that activates this new setup hook. If we type just cli, we're going to kick off this claw code command. It doesn't look like anything happened there, but this init flag changed the workflow. This init flag in fact ran the setup hook before it booted up this full cloud code instance. If we look under the hood here, open up the settings file, we can see we have a brand new setup hook. If we collapse just to our setup hook, you can see we have two new options for this hook. We're matching a knit and maintenance. You can see just like all of our other hooks, we're running a setup init command. Let's crack that open and let's see what happened. We have a script that runs several commands when we pass in d-init into cloud code. It's just going to run a few setup command...
```

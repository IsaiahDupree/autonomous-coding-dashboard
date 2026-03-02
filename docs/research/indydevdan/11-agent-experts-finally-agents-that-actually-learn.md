# Agent Experts: Finally, Agents That ACTUALLY Learn

**URL**: https://www.youtube.com/watch?v=zTcDwqopvKE
**Uploaded**: NA
**Views**: 19768
**Duration**: 1134.0s
**Research Date**: 2026-03-01

---

## Summary
The video explores the concept of "agent experts," AI systems that not only execute tasks but also learn and improve over time. It emphasizes the importance of creating agents with self-improving capabilities, differentiating them from generic agents that forget and require manual updates.

## Core Concepts & Ideas
- Agent experts vs. generic agents
- Self-improving templates and meta-prompts
- Meta-agentics: meta-prompts, meta-agents, and meta-skills
- Mental models as evolving data structures
- Importance of continuous learning and expertise accumulation
- Differentiation between source of truth and mental models

## Key Software Practices
- Use of meta-agentics to automate and scale agent creation
- Prompt chaining and orchestration for complex workflows
- Validation of mental models against the codebase
- Deployment of multiple agents for collaborative problem-solving
- Automation of expertise accumulation and management

## Architecture & Design Patterns
- Use of meta-agentics for building self-improving agents
- Prompt chaining for executing complex workflows
- Multi-agent orchestration for parallel problem-solving
- Expertise files as mental models for agents

## Tools & Technologies
- Meta-prompts: Used to generate new prompts and agents
- Meta-agents: Agents that build other agents
- Meta-skills: Skills that automate specific tasks
- YAML files: Used for storing expertise files
- Postgres: Database mentioned for tracking agent activities
- Mermaid diagrams: Used for visualizing information flow

## Actionable Takeaways
1. Implement meta-agentics to automate agent creation and scaling.
2. Use expertise files to maintain a mental model for agents.
3. Validate agent mental models against the actual codebase.
4. Deploy multiple agents for collaborative problem-solving to ensure accuracy.
5. Automate the accumulation and management of agent expertise.
6. Use prompt chaining to execute complex workflows efficiently.
7. Continuously update and improve agents to maintain their expertise.

## Integration Opportunities for Our Stack
- Use meta-agentics in the actp-worker for automating workflow execution.
- Implement expertise files in CRMLite to maintain evolving mental models.
- Leverage multi-agent orchestration in Safari Automation for market research.
- Use prompt chaining in ACTP Lite services for efficient content generation.
- Integrate self-improving agents in the Dual-agent system for enhanced learning.

## Quotable Moments
1. "The difference between a generic agent and an agent expert is simple. One executes and forgets, the other executes and learns."
2. "The true source of truth is always the code. But that does not mean that auxiliary documents and memory and mental models are not valuable."
3. "We're entering this really weird phase where you can truly create high-performance agents, and all you need is the right information, the right prompts."

## Tags
AI agents, agent experts, meta-agentics, prompt engineering, self-improving systems, mental models, multi-agent orchestration, automation, software engineering, AI learning

---

## Raw Transcript Excerpt

```
Agents of today have many problems. Most of them can be solved with great context engineering and great agentic prompt engineering. But there is one massive problem that persists no matter how great your context engineering or agentic prompt engineering becomes. Traditional software improves as it's used, storing user analytics, usage data, and patterns that create algorithms. Agents of today don't. The massive problem with agents is this. Your agents forget. And that means your agents don't learn. There are a few solutions, but each has their own problems. Memory files are global forced context that always loads. As you know, expertise requires breaking rules when the time is right. Memory files also must be manually updated, consuming your time or your team's time. Then we have prime prompts, sub aents, and skills. Powerful agentic tools. But again, these all have to be manually updated when you want to add new information and steer your agents in a different direction. So what if you could take the best tool for the job of engineering agents to the next level by teaching your agents to act, learn, and reuse its expertise at runtime? What if you could create agent experts? The difference between a generic agent and an agent expert is simple. One executes and forgets, the other executes and learns. In this lesson, all execute, and you'll learn to build agents that turn actions into expertise, automatically storing the right information and reusing it with no human in the loop. This is key. This is what makes an expert an expert. You don't need to tell an expert to learn. It's in their DNA. Also, real experts don't relearn their craft every time they have a new task. True experts are always learning. They're updating their mental model. This mental model is simply put a data structure that evolves over time. With each useful action, experts accumulate information, examples, and ultimately expertise around a specific topic. This is key. You're not trying to solve every problem. You're trying to solve the one that matters the most to you, your business, and your customers. The expert understands that the game they're operating in never ends except for one condition. The moment they stop learning. I don't know about you, but I certainly want experts operating my codebase and products, not generic agents that forget that you have to boot up over and over and manage the memory files of manually. That's the focus of this lesson. So, in the world of agent coding, prompt engineering, and context engineering, what is an agent expert exactly? The agent expert is a concrete form of a self-improving template metaprompt. That's a mouthful. Let's break this down because if you understand meta prompts, you will understand agent experts. In this lesson, we'll walk through meta agentics or put plainly, no fancy language, meta prompts, meta sub aents, and meta skills. We're going to do this to showcase the atoms of what makes up the agent expert. We'll use our orc...
```

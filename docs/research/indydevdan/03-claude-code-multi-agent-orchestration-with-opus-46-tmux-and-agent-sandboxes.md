# Claude Code Multi-Agent Orchestration with Opus 4.6, Tmux and Agent Sandboxes

**URL**: https://www.youtube.com/watch?v=RpUTF_U4kiw
**Uploaded**: NA
**Views**: 36590
**Duration**: 1443.0s
**Research Date**: 2026-03-01

---

## Summary
The video by Indy Devdan explores the concept of multi-agent orchestration using Claude Opus 4.6, Tmux, and agent sandboxes. It emphasizes the shift from focusing solely on AI model capabilities to leveraging human skills in orchestrating these models for enhanced productivity and engineering outcomes.

## Core Concepts & Ideas
- Multi-agent orchestration
- Agent observability
- Agentic engineering
- Context and prompt engineering
- Task management within agent teams
- Scaling compute to scale impact

## Key Software Practices
- Using Tmux for managing multiple agent sessions and enhancing observability.
- Employing agent sandboxes to safely test and run applications without affecting the local environment.
- Creating specialized agent teams to handle specific tasks efficiently.
- Prompt engineering to trigger specific workflows and tools.
- Iterative development with ad hoc agent teams for specific tasks.

## Architecture & Design Patterns
- Multi-agent orchestration: Creating teams of agents that work in parallel and communicate to achieve a common goal.
- Task-based architecture: Using task lists as a central hub for managing agent activities.
- Context resetting: Deleting agents after task completion to ensure a clean state for future tasks.

## Tools & Technologies
- Claude Opus 4.6: Used for creating and managing agent tasks.
- Tmux: Utilized for session management and observability.
- E2B: A platform for running agent sandboxes.
- Agent sandboxes: Used for isolated testing and running of applications.
- API billing and Cloud Max plan: For managing API usage and costs.

## Actionable Takeaways
1. Utilize Tmux for managing multiple agent sessions to enhance workflow observability.
2. Implement agent sandboxes to safely test and deploy applications without affecting the local environment.
3. Develop specialized agent teams for specific tasks to improve efficiency and focus.
4. Practice prompt engineering to effectively trigger and control agent workflows.
5. Use task lists to manage and coordinate agent activities within a multi-agent system.
6. Reset agent contexts after task completion to maintain a clean state for future tasks.
7. Explore the potential of multi-agent orchestration to scale engineering efforts and impact.

## Integration Opportunities for Our Stack
- **actp-worker**: Implement multi-agent orchestration to manage workflow execution more efficiently.
- **Safari Automation**: Use agent sandboxes to test browser control scripts safely.
- **ACTP Lite services**: Apply multi-agent orchestration to optimize content generation and publishing workflows.
- **CRMLite, WorkflowEngine**: Enhance task management and execution with agent teams.
- **Dual-agent system**: Leverage the strengths of both OpenAI and Claude in orchestrating complex tasks.
- **Blotato publishing pipeline**: Use agent sandboxes for testing and deploying publishing workflows.

## Quotable Moments
1. "The true limitation is you and I. It's our capabilities, our ability to prompt engineer and context engineer the outcomes we're looking for."
2. "Engineers are the best positioned to use agentic technology."
3. "Scale your compute to scale your impact."

## Tags
multi-agent orchestration, agentic engineering, Claude Opus 4.6, Tmux, agent sandboxes, prompt engineering, context engineering, task management, software development, indie hacking, AI automation

---

## Raw Transcript Excerpt

```
What's up engineers? Andy Devdan here. We've got a couple massive releases to cover. Of course, there is the brand new Claude Opus 4.6. It's a fantastic model. What else is there to say? It's beating all the benchmarks. You've already heard, you've already seen this. This is not what I want to focus on here. The real big idea I want to cover with you today is multi- aent orchestration. The game on the field is changing. It's no longer about what the models allow us to do. As of Sonnet 4.5, these models can do much more than you and I give them credit for. Than you and I really know how to unlock. The true constraint of agentic engineering now is twofold. It's the tools we have available and it's you and I. It is our capabilities. It's our ability to prompt engineer and context engineer the outcomes we're looking for and build them into reusable systems to build them into powerful agentic layers that you and I can wield. The true limitation is you and I. So let's take another stab at improving what we can do. Frontends, backends, scripts. It's too simple for these models. So what I have here is eight unique applications that I had claude opus 4.6 create. I touched none of these by the way. These are all oneshotted. I like to use E2B. Use whatever you want. So Asian sandboxes very powerful. But once again, this is not exactly what I want to focus on here. We're going to use Asian sandboxes as a playground to understand and to really dive into two key big ideas. Multi- aent orchestration, multi- aent observability. Once you put these two pieces together, you can do much more with your powerful cloud code opus 4.6 agent. So, first things first, we're going to crack open the terminal. If we create a new cloud code instance on our multi- aent observability, you'll see that we have a new agent joining the session and we have that session start hook captured. We have a rocket and we've officially kicked off a new session. But before we touch our new multi- aent orchestration capabilities, we need to boot up cloud code in a different way. Close this. And you'll see we got that session end event captured here. And instead of opening this up in a classic terminal, we're going to use T-Mox. And so this is going to give us some powerful capabilities. You'll see in a second. The next thing we're going to do is I just want to make this super clear. I'm going to type which and then clio. So you can see this exact command that I'm running. We're going to export the new cloud code experimental agent teams feature. Setting that to one. We're enabling that feature. So now we're running cloud code inside of a team session. You can see we kicked off a brand new agent. And this is where things get interesting. If I type ls, these are the agent sandbox directories that you saw here. We're going to have our agents investigate and break down how we can set up these applications. So, this going to be our first agent team. Build a new agent team for each codebase in this di...
```

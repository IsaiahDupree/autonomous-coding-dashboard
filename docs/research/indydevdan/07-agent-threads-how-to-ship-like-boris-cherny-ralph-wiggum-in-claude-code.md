# AGENT THREADS. How to SHIP like Boris Cherny. Ralph Wiggum in Claude Code.

**URL**: https://www.youtube.com/watch?v=-WBHNFAB0OE
**Uploaded**: NA
**Views**: 27140
**Duration**: 1861.0s
**Research Date**: 2026-03-01

---

## Summary
The video by Indy Devdan introduces "Thread-Based Engineering," a framework for improving as a software engineer in the age of AI. It emphasizes using agentic systems to scale engineering output by running multiple threads of work, each consisting of prompting, agent execution, and review. The video explores various thread types and how they can be used to enhance productivity and efficiency.

## Core Concepts & Ideas
- Thread-Based Engineering
- Agentic AI systems
- Continuous improvement in engineering
- Parallel execution of tasks
- Self-awareness in skill development
- Measuring progress through tool calls
- High autonomy end-to-end workflows

## Key Software Practices
- Running multiple agents in parallel to increase productivity.
- Using prompts to initiate threads of work with AI agents.
- Reviewing and validating agent output to ensure quality.
- Scaling engineering output through parallelism and fusion.
- Using chained threads for complex, multi-phase tasks.
- Employing fusion threads to aggregate and synthesize results from multiple agents.

## Architecture & Design Patterns
- Base Thread: A simple unit of work with a start (prompt) and end (review).
- P Thread (Parallel Thread): Running multiple threads simultaneously.
- C Thread (Chained Thread): Breaking down work into phases for better management.
- F Thread (Fusion Thread): Aggregating results from multiple agents.
- B Thread (Big Thread): Meta-structure where prompts fire off other prompts.
- L Thread (Long Thread): High autonomy, long-duration workflows.
- Z Thread (Zero Touch Thread): Maximum trust, no review required.

## Tools & Technologies
- Claude: Used for powering agentic systems.
- Claw Code: A setup for running multiple agents in parallel.
- Terminal: For executing agentic coding tools and prompts.
- Cloud Code: Web interface for running background agents.
- Pthread tool: For parallelizing agent execution.
- System notifications and text-to-speech hooks: For agent communication.
- MROS tool: For managing multiple agent sandboxes.

## Actionable Takeaways
1. Implement thread-based engineering by defining clear start and end points for agent tasks.
2. Utilize parallel threads to increase the volume of work done simultaneously.
3. Break down complex tasks into chained threads to manage them effectively.
4. Use fusion threads to combine results from multiple agents for better outcomes.
5. Develop big threads to automate the orchestration of sub-agents.
6. Aim for long threads to increase agent autonomy and reduce manual intervention.
7. Strive towards zero touch threads by building trust in agent outputs.

## Integration Opportunities for Our Stack
- **actp-worker**: Implement thread-based workflows to enhance task execution efficiency.
- **Safari Automation**: Use parallel threads for simultaneous market research tasks.
- **ACTP Lite services**: Apply fusion threads to aggregate content and research results.
- **CRMLite, WorkflowEngine**: Use chained threads for complex customer relationship workflows.
- **Dual-agent system**: Leverage big threads to orchestrate tasks between OpenAI and Claude agents.
- **Blotato publishing pipeline**: Implement long threads for end-to-end content publishing automation.

## Quotable Moments
1. "Agentic engineering is a new skill. New skills need new frameworks to measure progress against."
2. "If you don't measure it, you will not be able to improve it."
3. "The future of rapid prototyping will be done with fusion threads."

## Tags
Agentic AI, Thread-Based Engineering, Software Development, Parallel Execution, AI Automation, Engineering Frameworks, Continuous Improvement, Claude AI, Claw Code, Software Architecture, Workflow Automation, AI Agents

---

## Raw Transcript Excerpt

```
What's up engineers? Andy Devdan here. I have a simple trick question for you. How do you know you're improving from the vibe coder to the senior engineer shipping to production? With each prompt, how do you really know you're improving your ability to ship with agents? Even Andrew Carpathy, one of the greatest engineers of our generation, feels left behind. He says, "I've never felt this much behind as a programmer." I think this speaks to a larger trend going on right now where we see a widening gap between engineers that are using agents and engineers that haven't been able to keep up. And with the creator of Claw Code himself sharing his individual setup, I thought this would be a great time to talk about a new mental framework I've been using for over 2 years that's helped me operationalize my agents so that I can continuously improve. One step is not enough. You need to be thinking about how to continuously day after day improve what you can do with agents because the ceiling keeps moving higher. This framework I'm going to share with you here strikes a common thread between everything happening right now in the age of agents from some of the best engineers feeling like they're falling behind which by the way Andrew Karpath is going to catch up with no problem. All the best engineers have one thing in common. They are self-aware. You can see he knows that this feels like a skill issue and he's 100% right about that. Agentic engineering is a new skill. New skills need new frameworks to measure progress against. This mental framework I'm going to share with you will tie together the Ralph Wickham technique with Boris Churnney setup and it'll give you a concrete road map for knowing for a fact that you're improving. If you don't measure it, you will not be able to improve it. So let me introduce you to threadbased engineering. So what do I mean when I say a thread? I'm talking about a unit of work over time driven by you and your agents. A thread has two mandatory nodes. You show up for the prompt or the plan and the review or the validation. Now, the middle piece here is your agent doing work. These are the individual tool calls that your agent makes. The beginning is you prompting or planning. The middle is your agent doing work. And the work here is the string of tool calls. And the end is you reviewing or validating. This should look very familiar. Every time you hit enter on a prompt in a tool with an agent, you are starting a thread of work. Let me be super concrete here. Every time you open a terminal and you fire up your agentic coding tool and you run a prompt, what is this codebase about? You are firing up a new thread of work. So, I've just ran the prompt and now my agent is doing its line of work. It's running a chain of tool calls. In this case, it's firing off a sub agent to accomplish work. But you can see there are all the tool calls running. When this completes, I'm going to have to review the work. So, you and I show up at th...
```

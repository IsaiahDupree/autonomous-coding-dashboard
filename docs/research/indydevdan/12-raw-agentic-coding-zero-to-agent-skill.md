# RAW Agentic Coding: ZERO to Agent SKILL

**URL**: https://www.youtube.com/watch?v=X2ciJedw2vU
**Uploaded**: NA
**Views**: 40474
**Duration**: 3024.0s
**Research Date**: 2026-03-01

---

## Summary
The video by IndyDevDan demonstrates the process of building an agent skill from scratch using agentic AI systems. It covers the creation of a fork terminal tool, emphasizing the importance of planning, understanding the problem, and defining the solution before coding. The video showcases a hands-on approach to developing reusable skills that leverage generative AI for increased productivity.

## Core Concepts & Ideas
- Agentic AI systems and their role in software development
- Importance of planning and understanding the problem before coding
- Reusable skills for consistent and efficient problem-solving
- Progressive disclosure in agent skills
- Forking terminal sessions to scale compute and impact
- Balancing speed and context for better performance

## Key Software Practices
- Begin with the end in mind: Define the purpose, problem, and solution before coding.
- Use notebooks for planning and brainstorming.
- Develop reusable skills and prompts for consistent results.
- Employ progressive disclosure to manage complexity.
- Test and iterate incrementally to ensure functionality.
- Use agentic coding practices to offload tasks to AI agents.

## Architecture & Design Patterns
- Modular design with a clear file structure: skills, tools, prompts, and cookbook directories.
- Use of pivot files (skill.md) to centralize skill logic.
- Conditional prompts and progressive disclosure for managing agent behavior.
- Forking sessions to create isolated execution environments.

## Tools & Technologies
- Claude: Used for agentic coding and automation.
- Astral UV: Preferred for Python tooling in single-file scripts.
- Cursor: IDE used for coding and tab completion.
- OAS script: Used to open new terminal instances on Mac.
- Various CLI tools (ffmpeg, G-Cloud, AWS) for command execution.
- Codeex and Gemini CLI for agentic coding tools.

## Actionable Takeaways
1. Always plan and define the problem and solution before starting to code.
2. Use a modular file structure to organize skills, tools, and documentation.
3. Implement progressive disclosure to manage complexity in agent skills.
4. Leverage agentic coding to offload repetitive tasks to AI agents.
5. Test incrementally and iterate to ensure functionality and correctness.
6. Use forked sessions to scale compute and manage multiple tasks simultaneously.
7. Document and summarize agent interactions to maintain context across sessions.

## Integration Opportunities for Our Stack
- **actp-worker**: Implement agentic skills to automate workflow execution and task management.
- **Safari Automation**: Use forked sessions to run parallel browser automation tasks.
- **ACTP Lite services**: Develop reusable skills for content generation, publishing, and research tasks.
- **CRMLite, WorkflowEngine**: Integrate agentic coding practices to streamline workflow automation.
- **Dual-agent system**: Use Claude and OpenAI agents to handle different aspects of task execution.
- **Blotato publishing pipeline**: Apply forked session techniques to manage multiple publishing tasks concurrently.

## Quotable Moments
1. "Those who plan the future tend to create it."
2. "The limitation is not the models. It's not the agents. It's you and I, right? It's what we're doing with these tools."
3. "Skills are important because they put together reusable code and reusable prompts."

## Tags
agentic AI, software development, coding practices, automation, AI skills, progressive disclosure, terminal forking, Claude, Astral UV, modular design, planning, problem-solving, reusable skills, agentic coding, workflow automation

---

## Raw Transcript Excerpt

```
What's up engineers? [music] Indydean here. So, I thought it would be cool to take a step back from our normal type of video and [music] kind of go back to the root of this channel where we just sit down and we just build let's write [music] a skill from scratch. I've been building software for over 15 years and I've been building with language models [music] since GPT 3.5 was released back when we were running ADER, the original AI coding tool. I've written thousands of prompts by hand and even more with agents. So, I think it's important to always ask the question, why are skills becoming more important and more popular? Skills let you deploy prompts and code against any problem in a consistent, reusable way. In this video, we'll showcase exactly that. In this video, we'll be building a fork terminal tool, and we'll break down why that's important, why that's valuable as we progress. This is a real raw agent coding video. I don't have a flashy demo for you. You know, there's no spicy hook to get you into this video. I really want to go back to the roots of this channel as we kind of push into the end of the year and into 2026. So, in this video, I want to raise the stakes a little bit and I want to show you how you can build a skill from scratch. So, I'm not going to use any existing agentics. I'm not going to use any existing agent orchestration frameworks. We're just going to use a raw agent and we're going to write prompts by hand. The only thing we're going to do is use a couple code snippets. Before I even start touching the computer, start touching anything, you know, using agents, using generative AI, using orchestrators, I go back to the fundamentals of engineering. I think and I plan. So, the first thing we're going to do here is just push the laptop aside. Okay? We never start by just blasting out prompts. We start by thinking through the problem we're trying to solve. So, I have a whole stack of notebooks here um that I just fill up over and over and over. And I've got a whole box more. Um you know, you can get this off Amazon. Pack of 20 for I don't know, 20 bucks. This is an engineer's true most important tool. I'm definitely on the agentic engineering train. I think the future is all [music] Asian forward. I think that's all great, but I think none of that matters if you don't begin with the end in mind. If you don't actually fully understand what you want to see. [music] So, um, I like to just start by writing. So, the first thing I do when I'm trying to build something new [music] down to a skill, down to a prompt, is I understand what's the purpose, what's the problem, what's the solution. And of course, the solution that you're bringing to the table, it is your perceived best solution. There's always a better solution. There's always something else out there that you're going to miss. That's okay. You have to start somewhere. beginning with the end in mind for engineering work. That often means defining the concrete output str...
```

# Nuxt Agent

This project is a runnable ViteHub demo for the Nuxt ecosystem call.

This demo mirrors the Nuxt.com Nuxi agent. In `gh:nuxt/nuxt.com`, the current original agent definition lives in `layers/nuxi/server/api/chats/[id].post.ts`; the native UI tools live in `layers/nuxi/server/utils/tools/`. Keep this repo aligned with that source when changing agent behavior.

## Current status

Nuxt Agent is a ViteHub canary/showcase. It runs the Nuxt Agent to showcase the ViteHub API and discuss improvements, bug fixes, and working in parallel on both projects.

This project is very early. The first local capsule loop exists. When fixing issues or redesigning the API in ViteHub, feel free to apply breaking changes first, since we don't have any users.

## Agent Definition Style

Use the Nuxt.com Nuxi agent definition as the prompt-shape reference for Quiver support agents. In `nuxt/nuxt.com`, the active source prompt is in `layers/nuxi/server/api/chats/[id].post.ts`, with native UI tools in `layers/nuxi/server/utils/tools/`.

When changing `server/agents/support/workspace/AGENTS.md` or any support-agent behavior, keep the same kind of structure.

## Some thoughts from the author (Maxi)

This project, ViteHub, is the server primitives for any host, meaning that this is the server layer missing in the unjs ecosystem. The idea is to provide agnostic functionality for server primitives, as well as defining agents using the similar philosophy that Better Auth has.

This is meant to be a bold project. Going with the flow and using existing solutions will not get us where we want to be. But ViteHub depends so much on primitives that have already been built by others. We're just putting glue between them and improving the developer experience overall.

This project would have been way too bold before agents existed.

When planning, do not be afraid to suggest seemingly insane solutions. For example, rewriting esbuild to work entirely in JS without file system access. Seems insane, but it's absolutely doable with modern tools.

## Let their agents build what they need

We should avoid feature creep, and assume our users can use their agents to build whatever they need. This may seem to counter "boil the ocean", but it does not. We're building the primitives for a new era of software development.

As an example, let's discuss specific agents.

Should we build a deep research in ViteHub and Quiver Agents? Absolutely. No developer should have to create a new agent from scratch to get a simple research agent working.

Should we build the UI for it? Probably not. This is trivial for an agent to implement and there are other client-related tools for it.

## Fight for the "obvious" solution

We should avoid being clever and doing things because they seem smart. We want everything we build to be so obvious it feels kind of stupid. Similar to unjs and nuxt developer experience.

When one of us prompts you, never hesitate to push back and suggest ways we could make things more obvious. Note that "simple" and "obvious" are not always aligned, sometimes the "obvious" solution is more complex.

"Obvious" solutions are the defaults that agents would assume are the case.

## Don't be afraid to lie (to agents) if it makes building easier

This might seem counter-intuitive, so hear me out.

Agents need tools and instructions. They don't need accurate implementation details of those tools. They don't need real environments.

Tools like just-bash should always be top of mind. Agents like working a certain way, and we should provide them with that way to work. If they want file systems, they should get them. The implementation can be a mirage, as long as the agent gets what it expects and we get outputs that work.

Simulate familiar affordances freely, but do not lie about contracts: durability, isolation, security, persistence, and production readiness must be explicit.
Some general rules

These are meant to steer us in the right direction. They are not hard-set, but we should default to following them. If you think one should be ignored, be very loud and clear about that and get approval from us before doing it.

- preserve the capsule abstraction above all;
- prefer code/CLI control over dashboards;
- Design APIs for agents writing apps, not humans browsing docs; unjs is a great example of references;
- Every runtime feature should be inspectable by an agent;
- When in doubt, make the obvious agent assumption true.
- Try to avoid reinventing the wheel, prefer existing libraries and tools but with the DX in mind.

## Working in parallel

Most of the time when working with you, you have to be aware that other agents are running in parallel and making changes at the same time. I will try to give them instructions so you don't collide with each other.

But if there is some kind of collision, make sure that you don't overwrite their changes.

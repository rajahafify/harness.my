# harness.my

> Personal project harness for high-quality, intentional software development.

This repository contains tools, guidelines, scripts, and experiments for building better software — with a focus on design, clarity, and minimalism.

**Current direction**: An evolving **conversation-based agentic harness** (modeled on Codex / Claude Code) that treats **HTML as first-class UI**. 

The interface is a chat-style thread in the main column: the user sends text prompts, and the agent responds with rich, self-contained **HTML cards** (interactive documents containing HTML + CSS + JS, supporting images, sound, and in-card actions) rendered inline in the conversation — not plain text.

The prompt input lives at the bottom of the main column. A left sidebar provides context (sessions/artifacts), and a right panel offers environment details.

See:
- [harness-ui-mock.html](harness-ui-mock.html) — high-fidelity static mock (open in browser; closely follows the reference Cursor/Claude Code screenshot).
- [HTML_CONTRACT.html](HTML_CONTRACT.html) — the agent contract for HTML-first responses.
- [CHANGELOG.html](CHANGELOG.html) — prepend-only, blogpost-style living log with commit IDs and GitHub links (newest updates on top).
- [AGENTS.html](AGENTS.html) — design-oriented guidelines.

## Guidelines

The canonical instructions for AI coding agents (and humans) working in this project live in:

- **[AGENTS.html](AGENTS.html)** — Design-oriented guidelines emphasizing:
  - Thinking before coding
  - Simplicity first
  - Surgical changes
  - Goal-driven execution
  - Beautiful, deliberate HTML for documentation

All documentation, specs, and internal references in this project prefer thoughtfully designed HTML over plain Markdown.

## Getting started

```bash
# Clone
git clone https://github.com/rajahafify/harness.my.git
cd harness.my
```

Open `harness-ui-mock.html` in a browser to explore the current target UI. It is fully interactive: send messages in the composer at the bottom of the main column to see new HTML cards appear in the conversation thread.

The current prototype and direction are captured in the artifacts listed above. More (the real interactive viewer, etc.) will be added as the harness evolves.

## Philosophy

- Minimum code that solves the problem.
- Prefer clarity and craft over cleverness.
- Every artifact should feel intentional.

---

Maintained by [Raja Hafify](https://github.com/rajahafify).

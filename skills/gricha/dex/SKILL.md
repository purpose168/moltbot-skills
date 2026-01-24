---
name: dex
description: Task tracking for async/multi-step work. Use dex to create, track, and complete tasks that span multiple sessions or require coordination (e.g., coding agent dispatches, PR reviews, background jobs). Tasks stored as JSON files in .dex/tasks/.
---

# Dex Task Tracking

Use `dex` CLI for tracking work that isn't a single back-and-forth—async tasks, coding agent dispatches, multi-step projects.

## When to Use Dex

- Dispatching work to OpenCode/Claude Code (track workspace, branch, session)
- Multi-step projects spanning sessions
- Anything requiring follow-up or handoff
- Coordinating parallel work streams

## Core Commands

```bash
# Create task with full context
dex create -d "Short description" --context "Background, requirements, approach, done-when criteria"

# List tasks
dex list                    # Pending tasks (tree view)
dex list --all              # Include completed
dex list --json             # For scripting

# View task
dex show <id>               # Summary
dex show <id> --full        # Full context

# Complete task
dex complete <id> --result "What was done, decisions made, follow-ups"

# Subtasks
dex create -d "Subtask" --context "..." --parent <parent-id>

# Delete
dex delete <id>
```

## Task Structure

**Description**: One-line summary (like issue title)  
**Context**: Full background—what, why, requirements, approach, done criteria  
**Result**: On completion—what was built, decisions, trade-offs, follow-ups

## Example: Coding Agent Dispatch

```bash
# Create task before dispatching
dex create -d "Fix Sentry auth bug on PR #145" \
  --context "Workspace: feat1 (100.109.173.45)
Branch: feat/auth-token-support
Issue: Auth check blocks static files, users can't load web UI
Fix: Add static paths to PUBLIC_PATHS or reorder handlers
Done when: Commit pushed, CI passes"

# After completion
dex complete abc123 --result "Fixed in commit b483647
- Reordered handlers to serve static files before auth
- Pushed to branch, CI running"
```

## Storage

Tasks stored in `.dex/tasks/{id}.json` (git root or home). One file per task = git-friendly, no conflicts.

---
name: deploy-agent
description: Multi-step deployment agent for full-stack apps. Build → Test → GitHub → Cloudflare Pages with human approval at each step.
metadata:
  clawdbot:
    emoji: "🚀"
    requires:
      bins: ["gh", "wrangler", "git"]
---

# deploy-agent

Deploy full-stack applications via a multi-step workflow with human approval at each stage.

## Quick Start

```bash
# Install via ClawdHub
clawdhub install deploy-agent

# Initialize a new deployment
deploy-agent init my-app

# Check status
deploy-agent status my-app

# Continue through steps
deploy-agent continue my-app
```

## Workflow Steps

| Step | Command | Description | Requires Approval |
|------|---------|-------------|-------------------|
| 1 | `deploy-agent init <name>` | Start deployment | ✅ Design phase |
| 2 | `deploy-agent build <name>` | Build app | ✅ Before testing |
| 3 | `deploy-agent test <name>` | Test locally | ✅ Before GitHub |
| 4 | `deploy-agent push <name>` | Push to GitHub | ✅ Before Cloudflare |
| 5 | `deploy-agent deploy <name>` | Deploy to Cloudflare | ✅ Final |

## Commands

### Initialize Deployment
```bash
deploy-agent init my-app
```
Creates a new deployment state and waits for design input.

### Check Status
```bash
deploy-agent status my-app
```
Shows current step, approvals, and deployment info.

### Continue
```bash
deploy-agent continue my-app
```
Get guidance on what to do next in the current step.

### Build (Step 2)
```bash
deploy-agent build my-app
```
After designing with C.R.A.B, run this to build the app.

### Test (Step 3)
```bash
deploy-agent test my-app
```
Verify the app is running locally before pushing.

### Push to GitHub (Step 4)
```bash
deploy-agent push my-app [repo-name]
```
Creates GitHub repo and pushes code. Default repo name = app name.

### Deploy to Cloudflare (Step 5)
```bash
deploy-agent deploy my-app [custom-domain]
```
Deploys to Cloudflare Pages. Default domain: `{name}.sheraj.org`

### Cancel
```bash
deploy-agent cancel my-app
```
Aborts and cleans up the deployment.

### List
```bash
deploy-agent list
```
Shows all active deployments.

## Example Session

```bash
# Start new deployment
$ deploy-agent init my-blog
🚀 Deployment initialized: my-blog
Step 1: Design your app with C.R.A.B

# ... design phase with C.R.A.B ...

$ deploy-agent build my-blog
🚀 Build complete! Step 2: Local Testing
Start dev server: cd my-blog && npm run dev

# ... test locally ...

$ deploy-agent push my-blog
🚀 GitHub repository ready!
Say 'deploy-agent deploy my-blog' to deploy to Cloudflare

$ deploy-agent deploy my-blog my-blog.sheraj.org
🎉 Deployment complete!
App live at: https://my-blog.sheraj.org
```

## State Management

State stored in: `~/.clawdbot/skills/deploy-agent/state/{deployment-name}.json`

```json
{
  "name": "my-blog",
  "step": 5,
  "status": "deployed",
  "created_at": "2026-01-18T08:00:00Z",
  "repo_url": "https://github.com/user/my-blog",
  "domain": "https://my-blog.sheraj.org"
}
```

## Requirements

| Tool | Purpose |
|------|---------|
| `gh` | GitHub repo creation and management |
| `wrangler` | Cloudflare Pages deployment |
| `git` | Version control |
| `jq` | JSON parsing (for state management) |

## Configuration

Cloudflare token should be configured in `~/.wrangler.toml`:
```toml
[account]
api_token = "your-cloudflare-token"
```

## Notes

- Each deployment is independent
- State persists across sessions
- Human approval required at each major step
- Use "cancel" to abort anytime

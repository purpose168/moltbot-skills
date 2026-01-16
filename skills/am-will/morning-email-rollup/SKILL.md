---
name: morning-email-rollup
description: Daily morning rollup of important emails and calendar events at 8am
metadata: {"clawdbot":{"emoji":"📧","requires":{"bins":["gog","jq","date"]}}}
---

# Morning Email Rollup

Automatically generates a daily summary of important emails and delivers it to Telegram at 8am Denver time.

## Setup

**Required:** Set your Gmail account email:
```bash
export GOG_ACCOUNT="your-email@gmail.com"
```

Or edit the script directly to set the default.

## What It Does

- Runs every day at 8:00 AM (configurable timezone)
- **Shows today's calendar events** from Google Calendar
- Searches for emails marked as **important** or **starred** from the last 24 hours
- Shows up to 20 most important emails with:
  - 🔴 Unread indicator
  - Sender name/email
  - Subject line
  - Date/time received
  - Preview snippet (first 150 characters)
- Delivers formatted summary to Telegram

## Usage

### Manual Run
```bash
# Default (10 emails)
bash skills/morning-email-rollup/rollup.sh

# Custom number of emails
MAX_EMAILS=20 bash skills/morning-email-rollup/rollup.sh
MAX_EMAILS=5 bash skills/morning-email-rollup/rollup.sh
```

### View Log
```bash
cat $HOME/clawd/morning-email-rollup-log.md
```

## How It Works

1. **Checks calendar** - Lists today's events from Google Calendar via `gog`
2. **Searches Gmail** - Query: `is:important OR is:starred newer_than:1d`
3. **Fetches details** - Gets sender, subject, date, snippet for each email
4. **Formats output** - Creates readable summary with unread markers
5. **Sends to Telegram** - Delivers via Clawdbot's messaging system

## Calendar Integration

The script automatically includes today's calendar events from your Google Calendar using the same `gog` CLI that queries Gmail.

**Graceful Fallback:**
- If `gog` is not installed → Calendar section is silently skipped (no errors)
- If no events today → Calendar section is silently skipped
- If events exist → Shows formatted list with 12-hour times and titles

**Requirements:**
- `gog` must be installed and authenticated
- Uses the same Google account configured for Gmail (set via `GOG_ACCOUNT` environment variable)

## Email Criteria

Emails are included if they match **any** of:
- Marked as **Important** by Gmail (lightning bolt icon)
- Manually **Starred** by you
- Received in the **last 24 hours**

## Cron Schedule

Set up a daily cron job at your preferred time:
```bash
cron add --name "Morning Email Rollup" \
  --schedule "0 8 * * *" \
  --tz "America/Denver" \
  --session isolated \
  --message "bash /path/to/skills/morning-email-rollup/rollup.sh"
```

Adjust the time (8:00 AM) and timezone to your preference.

## Customization

### Change Number of Emails

By default, the rollup shows **10 emails**. To change this:

**Temporary (one-time):**
```bash
MAX_EMAILS=20 bash skills/morning-email-rollup/rollup.sh
```

**Permanent:**
Edit `skills/morning-email-rollup/rollup.sh`:
```bash
MAX_EMAILS="${MAX_EMAILS:-20}"  # Change 10 to your preferred number
```

### Change Search Criteria

Edit `skills/morning-email-rollup/rollup.sh`:

```bash
# Current: important or starred from last 24h
IMPORTANT_EMAILS=$(gog gmail search 'is:important OR is:starred newer_than:1d' --max 20 ...)

# Examples of other searches:
# Unread important emails only
IMPORTANT_EMAILS=$(gog gmail search 'is:important is:unread newer_than:1d' --max 20 ...)

# Specific senders
IMPORTANT_EMAILS=$(gog gmail search 'from:boss@company.com OR from:client@example.com newer_than:1d' --max 20 ...)

# By label/category
IMPORTANT_EMAILS=$(gog gmail search 'label:work is:important newer_than:1d' --max 20 ...)
```

### Change Time

Update the cron schedule:
```bash
# List cron jobs to get the ID
cron list

# Update schedule (example: 7am instead of 8am)
cron update <job-id> --schedule "0 7 * * *" --tz "America/Denver"
```

### Change Max Emails

Edit the `--max 20` parameter in rollup.sh to show more/fewer emails.

## Troubleshooting

### Not receiving rollups
```bash
# Check if cron job is enabled
cron list

# Check last run status
cron runs <job-id>

# Test manually
bash skills/morning-email-rollup/rollup.sh
```

### Missing emails
- Gmail's importance markers may filter out expected emails
- Check if emails are actually marked important/starred in Gmail
- Try running manual search: `gog gmail search 'is:important newer_than:1d'`

### Wrong timezone
- Cron uses `America/Denver` (MST/MDT)
- Update with: `cron update <job-id> --tz "Your/Timezone"`

## Log History

All rollup runs are logged to:
```
$HOME/clawd/morning-email-rollup-log.md
```

Format:
```markdown
- [2026-01-15 08:00:00] 🔄 Starting morning email rollup
- [2026-01-15 08:00:02] ✅ Rollup complete: 15 emails
```

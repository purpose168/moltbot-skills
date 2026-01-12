# Daily Recap Skill

Generate a personalized daily recap image featuring your agent's avatar holding a posterboard with the day's accomplishments.

## Features

- Reviews the day's memory files for accomplishments
- Checks cron job summaries for completed tasks
- Generates a weather-appropriate image based on local conditions
- Agent holds a posterboard with 4-6 key wins written in marker
- Customizable to any agent identity

## Configuration

Set these in your `clawdbot.json` under `skills.entries.daily-recap`:

```json
{
  "skills": {
    "entries": {
      "daily-recap": {
        "env": {
          "RECAP_LOCATION": "Boston, MA",
          "RECAP_TELEGRAM_ID": "1234567890",
          "RECAP_TIME": "17:00"
        }
      }
    }
  }
}
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `RECAP_LOCATION` | Location for weather lookup | Required |
| `RECAP_TELEGRAM_ID` | Telegram chat ID for delivery | Required |
| `RECAP_TIME` | Cron time (24h format) | `17:00` |

## Agent Identity

The skill reads your agent's `IDENTITY.md` for visual appearance details. Include a section like:

```markdown
## Visual Appearance (for image generation)

[Your agent] is a [description] with:
- [Physical traits]
- [Clothing/accessories]
- [Style notes]
```

## Dependencies

- **nano-banana-pro** skill (for Gemini image generation)
- Telegram configured for delivery

## Cron Setup

The skill includes a sample cron job. After installation, create your cron:

```bash
clawdbot cron add --name "daily-recap" --schedule "0 17 * * *" --tz "America/New_York"
```

## How It Works

1. **Weather Check**: Gets current conditions for your location
2. **Review Day**: Scans memory files and cron summaries for accomplishments
3. **Pick Wins**: Selects 4-6 key items (kept short for posterboard)
4. **Generate Image**: Creates agent holding posterboard with wins
5. **Deliver**: Sends to configured Telegram chat

## Tips

- Keep accomplishments SHORT (3-5 words each) for readable posterboard text
- Include weather-appropriate attire in your identity description
- If no accomplishments found, generates a "quiet day" relaxation image
- Works best with Pixar/3D animation style prompts

## Example Output

Your agent holding a posterboard:
```
TODAY'S WINS
✓ Fixed config bug
✓ Merged 50 commits
✓ Created new cron
✓ Cleaned up data
```

## Credits

Created by the Clawdbot community.

# Discord Ticket Bot

A Discord bot with ticket functionality built with Discord.js v14.

## Features

- Create and manage support tickets
- Customizable ticket categories and sections
- Ticket claiming and closing
- Ticket transcripts (HTML format)
- Rating system for closed tickets
- Multi-language support (currently: English, Arabic)

## Setup Instructions

### 1. Create a Discord Bot

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to the "Bot" tab and click "Add Bot"
4. Under the bot's username, click "Reset Token" and copy your bot token
5. Enable the following Privileged Gateway Intents:
   - Server Members Intent
   - Message Content Intent

### 2. Configure Your Bot Token

Your Discord bot token should be stored as a secret environment variable called `DISCORD_BOT_TOKEN`.

### 3. Invite the Bot to Your Server

1. In the Developer Portal, go to the "OAuth2" tab
2. Under "OAuth2 URL Generator", select the following scopes:
   - `bot`
   - `applications.commands`
3. Under "Bot Permissions", select:
   - Manage Channels
   - Send Messages
   - Embed Links
   - Attach Files
   - Read Message History
   - Use Slash Commands
4. Copy the generated URL and open it in your browser to invite the bot

### 4. Configure Your Server

Edit `config.json` to customize your bot settings:

- `categoryID`: The category where ticket channels will be created
- `log`: The channel ID for logging ticket actions
- `language`: Default language (ar/en)
- `SECTION_TYPE`: How sections are displayed (list/button)
- `optionConfig`: Configure ticket types with roles and embed text
- `ticketOptions`: Ticket selection menu options

### 5. Run the Bot

The bot will start automatically. Use `/setup` in your Discord server to initialize the ticket system.

## Available Commands

- `/setup` - Set up the ticket system in a channel
- `/editsettings` - Modify bot settings
- `/addsection` - Add a new ticket section
- `/deletesection` - Remove a ticket section

## Project Structure

- `index.js` - Main bot entry point
- `src/commands/` - Slash command handlers
- `src/events/` - Discord event handlers
- `src/interactions/` - Button/interaction handlers
- `src/locale/` - Language files
- `src/utils/` - Utility functions and custom client
- `config.json` - Bot configuration
- `database/` - SQLite database for tickets

## License

MIT

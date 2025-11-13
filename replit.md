# Unified Discord Bot - Project Documentation

## Project Overview
This is a unified Discord bot built with Discord.js v14 that combines ticket management and leveling systems. The bot provides support ticket functionality with claiming, closing, rating features, plus XP-based leveling with role rewards and animated welcome messages.

## Last Updated
November 13, 2025

## Recent Changes

### November 13, 2025 - Slash Commands Admin Permissions Added
- ✅ All slash commands now require admin role from dashboard (bot-config.json adminRoleIds)
- ✅ Added isAdmin() check to: setupticket, setupwelcome, addsection, deletesection
- ✅ Existing commands already had protection: addlevel, resetlevel, rolelevel, xpsettings, blacklist, join
- ✅ Prefix commands (rank, leaderboard) remain accessible to all users as requested
- ✅ Clear error messages for unauthorized access: "❌ You do not have permission to use this command! You need to be an admin."
- ✅ Admin roles are centrally managed through the web dashboard
- ✅ All 10 slash commands working correctly and registered

### November 13, 2025 - Dashboard Authentication Security Fixed
- ✅ Fixed infinite refresh loop in dashboard - replaced localStorage-only check with server-side /api/auth/status validation
- ✅ Enabled server-side authentication protection - re-enabled requireAuth middleware in dashboard.js
- ✅ Added server-side static file protection - dashboard.html now requires authenticated session
- ✅ Fixed logout button - added functional logout() method that invalidates session and redirects to login
- ✅ Fixed sidebar menu toggle - updated toggleSidebar() and showSection(event, sectionName) with proper event handling
- ✅ Added credentials: 'include' to all fetch requests for proper session cookie handling
- ✅ Updated login flow to save session token and redirect to dashboard.html
- ✅ Security improvements: All protected routes now properly check session on server-side, preventing bypass attempts

### November 10, 2025 - Major Dashboard & Command Updates
- ✅ Converted leveling commands to slash commands: /addlevel, /resetlevel, /rolelevel, /xpsettings, /blacklist, /join
- ✅ Kept !rank and !leaderboard as prefix commands (user preference)
- ✅ Removed /editsettings slash command
- ✅ Added comprehensive Tickets configuration section to web dashboard:
  - Category ID for ticket channels
  - Log Channel ID for ticket logs and transcripts
  - Background URL for ticket embeds
  - Setup message customization
  - Ticket embed title and description customization
- ✅ Modified ticket transcript system:
  - Transcripts now saved as HTML files in Tickets/ folder
  - Transcripts displayed directly in browser (no download required)
  - View Transcript button links to dashboard URL instead of Discord attachment
- ✅ Updated configuration system:
  - Bot now reads from bot-config.json (dashboard settings)
  - Maintains backwards compatibility with config.json
  - Automatic migration of legacy settings
  - All ticket interactions updated to use new config structure

### November 10, 2025 - DTBot Dashboard Integration Completed
- ✅ Added missing dashboard files (dashboard.js, public/dashboard.html, public/login.html)
- ✅ Updated start.js to run both bot and dashboard simultaneously
- ✅ Fixed database schema error (user keyword properly escaped)
- ✅ Fixed command registration to skip undefined slash commands
- ✅ Created database directory for ticket system SQLite files
- ✅ Configured Unified Bot workflow with webview on port 5000
- ✅ Bot and Dashboard now running successfully

### Earlier - November 10, 2025 - DTBot Merge Completed
- ✅ Merged DTBot leveling system into ticket bot
- ✅ Added prefix command support (!rank, !leaderboard, !addlevel, etc.)
- ✅ Integrated XP tracking system with customizable cooldowns and XP gains
- ✅ Added role reward system for level-ups
- ✅ Implemented animated GIF welcome service with custom backgrounds
- ✅ Extended CustomClient with leveling features (MessageContent intent, cooldowns, welcome service)
- ✅ Dual database support: QuickDB for tickets, PostgreSQL for leveling
- ✅ Created src/assets structure for fonts, backgrounds, and images
- ✅ Created src/prefix-commands for leveling commands
- ✅ Added config-helper.js for bot-config.json management
- ✅ Installed system dependencies (libuuid) and npm packages (gif-encoder, body-parser, express-session, promise-queue)

### Earlier - November 10, 2025
- ✅ Migrated project to Replit environment
- ✅ Configured Node.js dependencies installation
- ✅ Set up Discord bot workflow
- ✅ Configured secure token management using DISCORD_BOT_TOKEN secret
- ✅ Fixed "View Transcript" button - now appears after rating submission
- ✅ Verified channel locking functionality - channel permissions are correctly set to prevent sending messages and attachments after close reason is submitted

## Project Architecture

### Core Files
- `index.js` - Main entry point, loads slash commands, prefix commands, interactions, events, and locales
- `src/utils/index.js` - Extended CustomClient with ticket and leveling features
- `src/config-helper.js` - Helper functions for bot-config.json management (admin checks, command permissions)
- `src/database.js` - PostgreSQL database manager for leveling system
- `src/services/welcome.js` - Animated GIF welcome message generator
- `config.json` - Ticket system configuration (category IDs, log channel, ticket options)
- `bot-config.json` - Leveling system configuration (admin roles, level-up messages, welcome settings)

### Slash Commands (`src/commands/`)
Ticket system commands:
- `setup.js` - Initialize ticket system in a channel
- `addSection.js` - Add new ticket sections
- `deleteSection.js` - Remove ticket sections

Leveling system commands:
- `addlevel.js` - Add levels to a user (admin only)
- `resetlevel.js` - Reset user's level (admin only)
- `rolelevel.js` - Configure role rewards for levels (admin only)
- `xpsettings.js` - Configure XP settings (admin only)
- `blacklist.js` - Manage XP blacklist (admin only)
- `join.js` - Join user's voice channel

### Prefix Commands (`src/prefix-commands/`)
Leveling system commands (prefix: `!`):
- `rank.js` - Show user's current rank and XP
- `leaderboard.js` - Display server leaderboard
- `help.js` - Show available commands

### Events (`src/events/`)
- `interaction.js` - Handles all interaction events (buttons, modals, commands)

### Interactions (`src/interactions/`)
- `claim.js` - Claim a ticket
- `close.js` - Open modal to close ticket with reason
- `closeReason.js` - Process close reason and lock channel
- `rating.js` - Show rating modal
- `ratingComment.js` - Process rating and generate transcript
- `delete.js` - Delete ticket
- `rename.js` - Rename ticket channel
- `save.js` - Save ticket transcript
- `select.js` - Handle ticket creation from dropdown

### Database Systems
**QuickDB (SQLite) - Ticket System:**
- Database file: `database/tickets.sqlite`
- Stores ticket data (creator, claimed by, close reason, timestamps)

**PostgreSQL - Leveling System:**
- Environment variable: `DATABASE_URL`
- Tables: levels, roles, rankCardTable, blacklistTable, settings, channel, prefix, prefixSettings, welcomeChannels, roleRewardChannels, defaultRoleMessages, dashboard_auth, customcommands
- Stores user XP, levels, role rewards, blacklists, and custom settings

### Assets
- `src/assets/fonts/` - Font files for welcome images (Roboto-Medium.ttf)
- `src/assets/backgrounds/arccorp/` - Background images for animated welcome GIFs
- `src/assets/leaderboard.png` - Background for leaderboard display
- `src/assets/wallpaper.png` - Background for rank cards

### Localization
- Supports multiple languages
- Current locales: English (`en.json`), Arabic (configured)
- Language files stored in `src/locale/`

## Key Features

### Ticket System Features

#### 1. Ticket Creation
- Users can create tickets through a dropdown menu
- Each ticket is a new private channel
- Customizable ticket types with roles and embed text

#### 2. Ticket Management
- **Claiming**: Staff can claim tickets
- **Closing**: Tickets can be closed with a reason
- **Channel Locking**: After close reason is submitted:
  - Channel permissions are set to prevent sending messages
  - Channel permissions are set to prevent attaching files
  - This allows users to ONLY submit ratings without chatting

#### 3. Rating System
- After a ticket is closed, users can rate their experience (1-5 stars)
- Users can add optional feedback comments
- Ratings are logged to the configured log channel

#### 4. Transcript Generation
- HTML transcripts are generated for all closed tickets
- Transcripts are sent to the log channel
- **View Transcript Button**: A "عرض التذكرة" button is added to the log message for easy access
- Transcripts include all messages, images, and metadata

#### 5. Auto-Deletion
- Tickets are automatically deleted 5 minutes after close if no rating is given
- After rating is submitted, tickets are deleted after 3 seconds

### Leveling System Features

#### 1. XP Tracking
- Users gain XP for sending messages (random amount up to configured maximum)
- Configurable XP cooldown to prevent spam (default: 1000ms)
- XP blacklist system to exclude specific users or channels
- Automatic level-up when XP threshold is reached

#### 2. Role Rewards
- Assign roles automatically when users reach specific levels
- Custom DM messages for role rewards
- Configurable role reward channel for announcements
- Level-specific custom messages support

#### 3. Rank System
- `!rank` command shows user's current rank with visual card
- Customizable rank card colors (text, bar, background)
- Displays current XP, level, and progress to next level
- Canvas-based rank card generation

#### 4. Leaderboard
- `!leaderboard` command shows top users by level and XP
- Visual leaderboard with custom background
- Pagination support for large servers
- Shows user avatars, names, levels, and XP

#### 5. Animated Welcome Messages
- Generates animated GIF welcome images for new members
- Custom backgrounds with smooth transitions
- User avatar integration with glow effects
- Configurable welcome message text
- Supports custom rules/support channel mentions

#### 6. Admin Commands
- `!addlevel` - Manually add levels to users
- `!resetlevel` - Reset user's progress
- `!rolelevel` - Configure role rewards
- `!xpsettings` - Customize XP gain and cooldown
- `!blacklist` - Manage XP blacklist
- Admin permissions based on roles in bot-config.json

## Environment Configuration

### Required Secrets
- `DISCORD_BOT_TOKEN` - Discord bot authentication token (required)
- `DATABASE_URL` - PostgreSQL database connection string (optional - for leveling system)
  - If not provided, leveling features will be disabled but ticket system will still work

### Bot Permissions Required
- Manage Channels
- Manage Roles (for role rewards)
- Send Messages
- Embed Links
- Attach Files
- Read Message History
- Use Slash Commands
- Read Message Content (for prefix commands)
- View Channels
- Connect (for voice channel features)

### Configuration File (`config.json`)
- `TOKEN` - Bot token (overridden by DISCORD_BOT_TOKEN env var)
- `categoryID` - Discord category where ticket channels are created
- `log` - Channel ID for logging ticket actions
- `language` - Default language (ar/en)
- `SECTION_TYPE` - Display type for sections (list/button)
- `optionConfig` - Ticket type configurations
- `ticketOptions` - Dropdown menu options for ticket creation

## User Preferences
- User prefers Arabic language for Discord bot messages
- User wants secure handling of sensitive data (tokens)

## Technical Notes
- Node.js v20 is installed
- Bot uses Discord.js v14.14.1
- Database uses better-sqlite3 v8.6.0
- Transcript generation uses discord-html-transcripts v3.2.0
- Environment variables are managed through Replit Secrets

## Development Workflow
- Main workflow: "Discord Bot" runs `node index.js`
- Bot automatically restarts when code changes are detected
- Logs are available in the console output type

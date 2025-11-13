const discordTranscripts = require('discord-html-transcripts');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { QuickDB } = require('quick.db');
const WelcomeService = require('../services/welcome');
const { pool } = require('../database');
const fs = require('fs');
const path = require('path');

const generateHtmlPage = async (channel) => {
  const transcript = await discordTranscripts.createTranscript(channel, {
    limit: -1,
    returnType: 'string',
    filename: './database/tickets.sqlite.html',
    saveImages: true,
    poweredBy: false,
    ssr: false
  });
  
  return transcript;
};

// Load config from bot-config.json (dashboard) or fallback to config.json
function loadBotConfig() {
  const botConfigPath = path.join(__dirname, '../../bot-config.json');
  const oldConfigPath = path.join(__dirname, '../../config.json');
  
  let config = {
    ticketOptions: [],
    optionConfig: {},
    tickets: {
      categoryId: '',
      logChannelId: '',
      backgroundUrl: 'https://g.top4top.io/p_3598op42k0.png'
    }
  };
  
  // Try loading from bot-config.json first (dashboard config)
  if (fs.existsSync(botConfigPath)) {
    try {
      const botConfig = JSON.parse(fs.readFileSync(botConfigPath, 'utf8'));
      config = { ...config, ...botConfig };
    } catch (error) {
      console.error('❌ Error reading bot-config.json:', error.message);
    }
  }
  
  // Load old config.json for legacy settings (TOKEN, category, log)
  if (fs.existsSync(oldConfigPath)) {
    try {
      const oldConfig = JSON.parse(fs.readFileSync(oldConfigPath, 'utf8'));
      // Merge old config with new, giving priority to bot-config for overlapping settings
      config = { ...oldConfig, ...config };
      
      // Migrate old ticket settings to new format if not already set in bot-config
      if (!config.tickets) {
        config.tickets = {
          categoryId: oldConfig.category || '',
          logChannelId: oldConfig.log || '',
          backgroundUrl: 'https://g.top4top.io/p_3598op42k0.png'
        };
      } else {
        // Ensure old category/log are used if not set in tickets
        if (!config.tickets.categoryId && oldConfig.category) {
          config.tickets.categoryId = oldConfig.category;
        }
        if (!config.tickets.logChannelId && oldConfig.log) {
          config.tickets.logChannelId = oldConfig.log;
        }
      }
      
      // Keep legacy category and log at root level for backwards compatibility
      if (!config.category && oldConfig.category) config.category = oldConfig.category;
      if (!config.log && oldConfig.log) config.log = oldConfig.log;
      
      console.log('✅ Merged settings from config.json');
    } catch (error) {
      console.error('❌ Error reading config.json:', error.message);
    }
  }
  
  if (!config.tickets) {
    config.tickets = {
      categoryId: '',
      logChannelId: '',
      backgroundUrl: 'https://g.top4top.io/p_3598op42k0.png'
    };
  }
  
  return config;
}

class CustomClient extends Client {
  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates
      ]
    });
    
    this.commands = new Collection();
    this.interactions = new Collection();
    this.locale = new Collection();
    this.prefixCommands = new Collection();
    this.aliases = new Collection();
    
    // Load config from bot-config.json (dashboard) with fallback to config.json
    this.config = loadBotConfig();
    
    this.cooldowns = new Collection();
    this.talkedRecently = new Map();
    
    this.welcomeService = new WelcomeService();
    
    // Override TOKEN from environment variable if available
    if (process.env.DISCORD_BOT_TOKEN) {
      this.config.TOKEN = process.env.DISCORD_BOT_TOKEN;
    }
    
    this.db = new QuickDB({
      filePath: './database/tickets.sqlite'
    });
    
    this.pg = pool;
    
    this.prefix = '!';
  }
  
  // Reload config from disk (useful after dashboard updates)
  reloadConfig() {
    this.config = loadBotConfig();
    if (process.env.DISCORD_BOT_TOKEN) {
      this.config.TOKEN = process.env.DISCORD_BOT_TOKEN;
    }
    console.log('🔄 Configuration reloaded');
  }
}

module.exports = {
  generateHtmlPage,
  CustomClient,
  loadBotConfig
};

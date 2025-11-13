const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const session = require('express-session');
const { query, initDB } = require('./src/database');

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';

// Initialize database on startup
initDB().then(ready => {
  if (!ready) {
    console.error('⚠️  Dashboard running without database');
  }
});

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // Set to true if using HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Authentication middleware
const requireAuth = (req, res, next) => {
    if (req.session && req.session.authenticated) {
        return next();
    }

    // If it's an API request, return JSON
    if (req.path.startsWith('/api/')) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Otherwise redirect to login
    res.redirect('/');
};

// Hash password function
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

const CONFIG_FILE = path.join(__dirname, 'bot-config.json');
const defaultConfig = {
    serverId: '',
    adminRoleIds: [],
    levelUpMessage: '**Congratulations** {member}! You have now leveled up to **level {level}**',
    levelUpChannel: '',
    welcome: {
        mentionText: 'Welcome to DT Organization! ${member} 👋',
        message: 'Please check the rules here: ${rulesChannel}\nFor assistance, open: ${supportChannel}\nNumber: ${memberCount}',
        rulesChannelId: '',
        supportChannelId: '',
        embedColor: '#FFD700'
    },
    roleReward: {
        message: 'Congratulations! 🎉 You have earned the {role} role!',
        channelId: '',
        levelMessages: {}
    },
    tickets: {
        categoryId: '',
        logChannelId: '',
        backgroundUrl: 'https://g.top4top.io/p_3598op42k0.png',
        setupMessage: '📋 **Support Ticket System**\n\nPlease select the type of assistance you need from the dropdown menu below.',
        ticketEmbedTitle: '🎫 Support Ticket',
        ticketEmbedDescription: 'Thank you for contacting support! A member of our team will assist you shortly.\n\n**Please describe your issue in detail below.**'
    },
    commands: {
        rank: {
            enabled: true,
            allowedChannels: []
        },
        leaderboard: {
            enabled: true,
            allowedChannels: []
        }
    }
};

async function loadConfig() {
    try {
        const data = await fs.readFile(CONFIG_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.log('Creating new config file...');
        await saveConfig(defaultConfig);
        return defaultConfig;
    }
}

async function saveConfig(config) {
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
    console.log('✅ Config saved to bot-config.json');
}

// Middleware to protect static files
app.use((req, res, next) => {
    // Skip middleware for API routes
    if (req.path.startsWith('/api/')) {
        return next();
    }

    // Allow access to login page and its assets
    const publicPaths = [
        '/login.html',
        '/css/',
        '/js/login.js',
        '/images/',
        '/favicon.ico',
        '/fonts/',
        '/transcripts/'
    ];

    const isPublicPath = publicPaths.some(path => req.path.startsWith(path)) || req.path === '/';

    if (isPublicPath) {
        return next();
    }

    // Protect all other files (including dashboard.html)
    if (req.session && req.session.authenticated) {
        return next();
    }

    res.redirect('/');
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Serve ticket transcripts (public access)
app.get('/transcripts/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'Tickets', filename);

    // Check if file exists
    const fsSync = require('fs');
    if (!fsSync.existsSync(filePath)) {
        return res.status(404).send('Transcript not found');
    }

    // Send HTML file with proper content type
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.sendFile(filePath);
});

// Root route
app.get('/', (req, res) => {
    if (req.session && req.session.authenticated) {
        res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
    } else {
        res.sendFile(path.join(__dirname, 'public', 'login.html'));
    }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
    try {
        const { password } = req.body;
        if (!password) {
            return res.status(400).json({ success: false, message: 'Password required' });
        }

        const hashedPassword = hashPassword(password);
        const result = await query('SELECT * FROM dashboard_auth WHERE password_hash = $1', [hashedPassword]);

        if (result.rows.length > 0) {
            req.session.authenticated = true;
            res.json({ success: true, message: 'Login successful' });
        } else {
            res.status(401).json({ success: false, message: 'Invalid password' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Logout endpoint
app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Logout failed' });
        }
        res.json({ success: true, message: 'Logged out' });
    });
});

// Check authentication status
app.get('/api/auth/status', (req, res) => {
    res.json({ 
        authenticated: !!(req.session && req.session.authenticated) 
    });
});

// Initialize password endpoint (one-time use)
app.post('/api/init-password', async (req, res) => {
    try {
        const { password } = req.body;
        if (!password || password.length < 8) {
            return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
        }

        const existing = await query('SELECT COUNT(*) as count FROM dashboard_auth');
        if (existing.rows[0].count > 0) {
            return res.status(403).json({ success: false, message: 'Password already initialized' });
        }

        const hashedPassword = hashPassword(password);
        await query('INSERT INTO dashboard_auth (password_hash) VALUES ($1)', [hashedPassword]);
        res.json({ success: true, message: 'Password initialized successfully' });
    } catch (error) {
        console.error('Password init error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.get('/api/config', requireAuth, async (req, res) => {
    try {
        const config = await loadConfig();
        res.json(config);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error loading configuration' });
    }
});

app.post('/api/config/home', requireAuth, async (req, res) => {
    try {
        const config = await loadConfig();

        config.serverId = req.body.serverId || '';
        config.adminRoleIds = req.body.adminRoleIds || [];

        await saveConfig(config);
        res.json({ success: true, message: 'Home settings saved!' });
    } catch (error) {
        console.error('Error saving home config:', error);
        res.status(500).json({ success: false, message: 'Error saving configuration' });
    }
});

app.post('/api/config/level', requireAuth, async (req, res) => {
    try {
        const config = await loadConfig();

        if (!config.commands) {
            config.commands = {};
        }

        if (!config.commands.rank) {
            config.commands.rank = { enabled: true, allowedChannels: [] };
        }

        if (!config.commands.leaderboard) {
            config.commands.leaderboard = { enabled: true, allowedChannels: [] };
        }

        config.commands.rank.allowedChannels = req.body.rankChannels || [];
        config.commands.leaderboard.allowedChannels = req.body.leaderboardChannels || [];

        config.levelUpMessage = req.body.levelUpMessage || defaultConfig.levelUpMessage;
        config.levelUpChannel = req.body.levelUpChannel || '';

        if (!config.roleReward) {
            config.roleReward = {};
        }
        config.roleReward.message = req.body.roleRewardMessage || defaultConfig.roleReward.message;
        config.roleReward.channelId = req.body.roleRewardChannel || '';

        await saveConfig(config);
        res.json({ success: true, message: 'Level settings saved!' });
    } catch (error) {
        console.error('Error saving level config:', error);
        res.status(500).json({ success: false, message: 'Error saving configuration' });
    }
});

app.post('/api/config/welcome', requireAuth, async (req, res) => {
    try {
        const config = await loadConfig();

        if (!config.welcome) {
            config.welcome = {};
        }

        config.welcome.mentionText = req.body.mentionText || '';
        config.welcome.message = req.body.message || '';
        config.welcome.rulesChannelId = req.body.rulesChannelId || '';
        config.welcome.supportChannelId = req.body.supportChannelId || '';
        config.welcome.embedColor = req.body.embedColor || '#FFD700';

        await saveConfig(config);
        res.json({ success: true, message: 'Welcome settings saved!' });
    } catch (error) {
        console.error('Error saving welcome config:', error);
        res.status(500).json({ success: false, message: 'Error saving configuration' });
    }
});

app.post('/api/config/tickets', requireAuth, async (req, res) => {
    try {
        const config = await loadConfig();

        if (!config.tickets) {
            config.tickets = {};
        }

        config.tickets.categoryId = req.body.categoryId || '';
        config.tickets.logChannelId = req.body.logChannelId || '';
        config.tickets.backgroundUrl = req.body.backgroundUrl || 'https://g.top4top.io/p_3598op42k0.png';
        config.tickets.setupMessage = req.body.setupMessage || defaultConfig.tickets.setupMessage;
        config.tickets.ticketEmbedTitle = req.body.ticketEmbedTitle; // Updated to use dynamic value from body
        config.tickets.ticketEmbedDescription = req.body.ticketEmbedDescription || defaultConfig.tickets.ticketEmbedDescription;

        await saveConfig(config);
        res.json({ success: true, message: 'Ticket settings saved!' });
    } catch (error) {
        console.error('Error saving ticket config:', error);
        res.status(500).json({ success: false, message: 'Error saving configuration' });
    }
});

app.listen(PORT, HOST, () => {
    console.log(`🎨 Dashboard running on ${HOST}:${PORT}`);
    console.log(`📊 Configure your bot settings in the web interface`);
    console.log('🚂 Railway deployment ready');
});
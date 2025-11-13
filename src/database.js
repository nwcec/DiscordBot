const { Pool } = require('pg');

let pool;

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
} else {
  pool = null;
}

async function initDB() {
  if (!pool) {
    console.error('⚠️  No DATABASE_URL found. Please create a PostgreSQL database from the Replit Database panel.');
    console.error('⚠️  The bot will not be able to store level data until a database is connected.');
    return false;
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS levels (
        id TEXT PRIMARY KEY,
        "user" TEXT NOT NULL,
        guild TEXT NOT NULL,
        xp INTEGER DEFAULT 0,
        level INTEGER DEFAULT 0,
        "totalXP" INTEGER DEFAULT 0
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS roles (
        guildID TEXT NOT NULL,
        roleID TEXT NOT NULL,
        level INTEGER NOT NULL,
        dmMessage TEXT DEFAULT 'Congratulations! 🎉 You have reached level {level} and earned the {role} role!',
        PRIMARY KEY (guildID, level)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS prefix (
        serverprefix TEXT NOT NULL,
        guild TEXT PRIMARY KEY
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS blacklistTable (
        guild TEXT NOT NULL,
        typeId TEXT NOT NULL,
        type TEXT NOT NULL,
        id TEXT PRIMARY KEY
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS settings (
        guild TEXT PRIMARY KEY,
        levelUpMessage TEXT,
        customXP INTEGER,
        customCooldown INTEGER
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS channel (
        guild TEXT PRIMARY KEY,
        channel TEXT
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS rankCardTable (
        id TEXT PRIMARY KEY,
        "user" TEXT NOT NULL,
        guild TEXT NOT NULL,
        textColor TEXT DEFAULT '#beb1b1',
        barColor TEXT DEFAULT '#838383',
        backgroundColor TEXT DEFAULT '#36393f'
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS customcommands (
        guild TEXT NOT NULL,
        command TEXT NOT NULL,
        roleid TEXT NOT NULL,
        PRIMARY KEY (guild, command)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS welcomeChannels (
        guild TEXT PRIMARY KEY,
        channel TEXT NOT NULL
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS roleRewardChannels (
        guild TEXT PRIMARY KEY,
        channel TEXT NOT NULL
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS defaultRoleMessages (
        guild VARCHAR(255) PRIMARY KEY,
        message TEXT
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS dashboard_auth (
        id SERIAL PRIMARY KEY,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS prefixSettings (
        guild TEXT PRIMARY KEY,
        requirePrefix BOOLEAN DEFAULT true
      )
    `);

    // Ticket system tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id TEXT PRIMARY KEY,
        guild TEXT NOT NULL,
        "user" TEXT NOT NULL,
        channel TEXT NOT NULL,
        claimed TEXT,
        closedBy TEXT,
        closeReason TEXT,
        selectedOption TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        closedAt TIMESTAMP
      )
    `);

    await pool.query(`
      ALTER TABLE roles 
      ADD COLUMN IF NOT EXISTS dmMessage TEXT DEFAULT 'Congratulations! 🎉 You have reached level {level} and earned the {role} role!';
    `);

    // Fix existing tables to use correct column name
    try {
      // Check if old column exists
      const checkColumn = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'levels' AND column_name = 'totalxp'
      `);
      
      if (checkColumn.rows.length > 0) {
        console.log('🔄 Migrating totalxp to totalXP...');
        
        // Rename column if it exists
        await pool.query(`
          ALTER TABLE levels 
          RENAME COLUMN totalxp TO "totalXP"
        `);
        
        console.log('✅ Column migration completed');
      }
    } catch (migrationError) {
      // Column might already be correct or doesn't exist
      console.log('ℹ️  Column migration not needed or already done');
    }

    console.log('✅ Database tables initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    return false;
  }
}

async function getLevel(userId, guildId) {
  if (!pool) return null;
  try {
    const result = await pool.query(
      'SELECT id, "user", guild, xp, level, "totalXP" FROM levels WHERE "user" = $1 AND guild = $2',
      [userId, guildId]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting level:', error);
    return null;
  }
}

async function setLevel(data) {
  if (!pool) return;
  try {
    await pool.query(
      'INSERT INTO levels (id, "user", guild, xp, level, "totalXP") VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO UPDATE SET xp = $4, level = $5, "totalXP" = $6',
      [data.id, data.user, data.guild, data.xp, data.level, data.totalXP]
    );
  } catch (error) {
    console.error('Error setting level:', error);
    throw error;
  }
}

async function query(text, params) {
  if (!pool) return { rows: [] };
  try {
    return await pool.query(text, params);
  } catch (error) {
    console.error('Error executing query:', error);
    console.error('Query:', text);
    console.error('Params:', params);
    throw error;
  }
}

async function getWelcomeChannel(guildId) {
  if (!pool) return null;
  try {
    const result = await pool.query(
      'SELECT channel FROM welcomeChannels WHERE guild = $1',
      [guildId]
    );
    return result.rows[0]?.channel || null;
  } catch (error) {
    console.error('Error getting welcome channel:', error);
    return null;
  }
}

async function setWelcomeChannel(guildId, channelId) {
  if (!pool) return;
  try {
    await pool.query(
      'INSERT INTO welcomeChannels (guild, channel) VALUES ($1, $2) ON CONFLICT (guild) DO UPDATE SET channel = $2',
      [guildId, channelId]
    );
  } catch (error) {
    console.error('Error setting welcome channel:', error);
  }
}

// Ticket system functions
async function getTicket(ticketId) {
  if (!pool) return null;
  try {
    const result = await pool.query(
      'SELECT * FROM tickets WHERE id = $1',
      [ticketId]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting ticket:', error);
    return null;
  }
}

async function setTicket(data) {
  if (!pool) return;
  try {
    // For new tickets (insert)
    if (data.createdAt) {
      await pool.query(
        `INSERT INTO tickets (id, guild, "user", channel, claimed, closedBy, closeReason, selectedOption, createdAt, closedAt)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO UPDATE SET
         claimed = $5, closedBy = $6, closeReason = $7, selectedOption = $8, closedAt = $10`,
        [data.id, data.guild, data.user, data.channel, data.claimed, data.closedBy, data.closeReason, data.selectedOption, data.createdAt, data.closedAt]
      );
    } else {
      // For new tickets without explicit createdAt (use default)
      await pool.query(
        `INSERT INTO tickets (id, guild, "user", channel, claimed, closedBy, closeReason, selectedOption, closedAt)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO UPDATE SET
         claimed = $5, closedBy = $6, closeReason = $7, selectedOption = $8, closedAt = $9`,
        [data.id, data.guild, data.user, data.channel, data.claimed, data.closedBy, data.closeReason, data.selectedOption, data.closedAt]
      );
    }
  } catch (error) {
    console.error('Error setting ticket:', error);
    throw error;
  }
}

async function deleteTicket(ticketId) {
  if (!pool) return;
  try {
    await pool.query('DELETE FROM tickets WHERE id = $1', [ticketId]);
  } catch (error) {
    console.error('Error deleting ticket:', error);
  }
}

module.exports = {
  initDB,
  getLevel,
  setLevel,
  query,
  getWelcomeChannel,
  setWelcomeChannel,
  getTicket,
  setTicket,
  deleteTicket,
  pool
};

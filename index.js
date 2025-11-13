const { Routes, REST, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { CustomClient } = require('./src/utils');
const { initDB, getLevel, setLevel, query, getWelcomeChannel } = require('./src/database');
const fs = require('fs');
const path = require('path');

const client = new CustomClient();
const commands = [];

const commandFiles = fs.readdirSync('./src/commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const command = require('./src/commands/' + file);
  client.commands.set(command.name, command);
  if (command.data) {
    commands.push(command.data);
  }
}

const prefixCommandFiles = fs.readdirSync('./src/prefix-commands').filter(file => file.endsWith('.js'));
for (const file of prefixCommandFiles) {
  try {
    const command = require('./src/prefix-commands/' + file);
    if (command.name) {
      client.prefixCommands.set(command.name, command);
      if (command.aliases && Array.isArray(command.aliases)) {
        command.aliases.forEach(alias => {
          client.aliases.set(alias, command.name);
        });
      }
      console.log(`✅ Loaded prefix command: ${command.name}`);
    }
  } catch (error) {
    console.error(`❌ Error loading prefix command ${file}:`, error.message);
  }
}

const interactionsFiles = fs.readdirSync('./src/interactions').filter(file => file.endsWith('.js'));
for (const file of interactionsFiles) {
  const interaction = require('./src/interactions/' + file);
  client.interactions.set(interaction.name, interaction);
}

const eventsFiles = fs.readdirSync('./src/events').filter(file => file.endsWith('.js'));
for (const file of eventsFiles) {
  const event = require('./src/events/' + file);
  client.on(event.name, async (...args) => {
    event.execute(client, ...args);
  });
}

const eventsLangs = fs.readdirSync('./src/locale').filter(file => file.endsWith('.json'));
for (const file of eventsLangs) {
  const locale = require('./src/locale/' + file);
  client.locale.set(file.split('.')[0], locale);
}

const rest = new REST().setToken(client.config.TOKEN);

client.once('ready', async () => {
  const dbReady = await initDB();
  if (!dbReady) {
    console.warn('⚠️  Bot is running but PostgreSQL database is not connected.');
    console.warn('⚠️  Leveling data will not be saved. Please add a PostgreSQL database.');
  } else {
    console.log('✅ PostgreSQL database initialized successfully');
  }
  
  try {
    await client.welcomeService.preloadBackgroundSequence();
    console.log('✅ Welcome backgrounds preloaded');
  } catch (error) {
    console.error('❌ Error preloading welcome backgrounds:', error.message);
  }
  
  // تسجيل أوامر السلاش
  try {
    console.log('🔄 Started refreshing application (/) commands...');
    
    // الحصول على Server ID من الداشبورد
    const fs = require('fs');
    const path = require('path');
    let GUILD_ID = null;
    
    try {
      const configPath = path.join(__dirname, 'bot-config.json');
      const configData = fs.readFileSync(configPath, 'utf8');
      const botConfig = JSON.parse(configData);
      GUILD_ID = botConfig.serverId;
    } catch (err) {
      console.error('⚠️ Could not read serverId from bot-config.json');
    }
    
    if (!GUILD_ID) {
      console.error('❌ No serverId found in bot-config.json! Please configure it in the dashboard.');
      return;
    }
    
    // ترتيب الأوامر بشكل منطقي
    const orderedCommands = commands.sort((a, b) => {
      const order = {
        // Ticket Commands
        'setupticket': 1,
        'addsection': 2,
        'deletesection': 3,
        
        // Welcome Commands
        'setupwelcome': 4,
        'join': 5,
        
        // Leveling Admin Commands
        'xpsettings': 6,
        'rolelevel': 7,
        'addlevel': 8,
        'resetlevel': 9,
        'blacklist': 10
      };
      
      return (order[a.name] || 999) - (order[b.name] || 999);
    });
    
    // حذف جميع الأوامر القديمة (عالمياً ومن السيرفر)
    console.log('🗑️ Removing all old commands...');
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: [] }
    );
    
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, GUILD_ID),
      { body: [] }
    );
    
    // تسجيل الأوامر على السيرفر المحدد فقط (فوري)
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, GUILD_ID),
      { body: orderedCommands }
    );
    
    console.log(`✅ Successfully registered ${orderedCommands.length} guild commands (instant)`);
    console.log(`📍 Server ID: ${GUILD_ID}`);
    console.log('📋 Registered commands:', orderedCommands.map(c => c.name).join(', '));
    console.log('ℹ️  Commands will only appear in the configured server');
  } catch (error) {
    console.error('❌ Error registering slash commands:', error);
    console.error('Error details:', error.message);
  }
  
  console.log(`\x1b[32m✅ Bot is online! ${client.user.username}\x1b[0m`);
  console.log(`📊 Serving ${client.guilds.cache.size} guilds`);
  console.log(`📝 Prefix: ${client.prefix}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  // Initialize rank card entry
  try {
    const cardResult = await query(
      'SELECT * FROM rankCardTable WHERE "user" = $1 AND guild = $2',
      [message.author.id, message.guild.id]
    );

    if (cardResult.rows.length === 0) {
      await query(
        'INSERT INTO rankCardTable (id, "user", guild, textColor, barColor, backgroundColor) VALUES ($1, $2, $3, $4, $5, $6)',
        [`${message.author.id}-${message.guild.id}`, message.author.id, message.guild.id, "#beb1b1", "#838383", "#36393f"]
      );
    }
  } catch (error) {
    console.error('Error creating rank card entry:', error);
  }

  // Handle no-prefix commands (rank, level, top, leaderboard)
  const noPrefixCommands = ['rank', 'level', 'top', 'leaderboard', 'lb'];
  const messageContent = message.content.trim().toLowerCase();
  const firstWord = messageContent.split(/\s+/)[0];
  
  if (noPrefixCommands.includes(firstWord)) {
    const args = message.content.trim().split(/\s+/).slice(1);
    let command;
    
    if (firstWord === 'rank' || firstWord === 'level') {
      command = client.prefixCommands.get('rank');
    } else if (firstWord === 'top' || firstWord === 'leaderboard' || firstWord === 'lb') {
      command = client.prefixCommands.get('leaderboard');
    }
    
    if (command) {
      if (!client.cooldowns.has(command.name)) {
        client.cooldowns.set(command.name, new Map());
      }

      const now = Date.now();
      const timestamps = client.cooldowns.get(command.name);
      const cooldownAmount = (command.cooldown || 3) * 1000;

      if (timestamps.has(message.author.id)) {
        const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

        if (now < expirationTime) {
          const timeLeft = (expirationTime - now) / 1000;
          return message.reply(`Please wait ${timeLeft.toFixed(1)} more second(s) before using \`${command.name}\` again.`);
        }
      }

      timestamps.set(message.author.id, now);
      setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

      try {
        await command.execute(message, args, client);
        return;
      } catch (error) {
        console.error(`Error executing no-prefix command ${command.name}:`, error);
        message.reply('There was an error executing that command.');
        return;
      }
    }
  }

  // Handle prefix commands
  try {
    const currentPrefixResult = await query('SELECT * FROM prefix WHERE guild = $1', [message.guild.id]);
    const prefixSettingResult = await query('SELECT * FROM prefixSettings WHERE guild = $1', [message.guild.id]);

    const Prefix = client.prefix;
    let getPrefix;

    if (currentPrefixResult.rows.length === 0) {
      await query('INSERT INTO prefix (serverprefix, guild) VALUES ($1, $2)', [Prefix, message.guild.id]);
      getPrefix = Prefix.toString();
    } else {
      getPrefix = currentPrefixResult.rows[0].serverprefix.toString();
    }

    const requirePrefix = prefixSettingResult.rows.length === 0 ? true : prefixSettingResult.rows[0].requireprefix;

    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const prefixRegex = new RegExp(`^(<@!?${client.user.id}>|${escapeRegex(getPrefix)})\\s*`);

    let commandName, args, matchedPrefix;

    if (prefixRegex.test(message.content)) {
      [, matchedPrefix] = message.content.match(prefixRegex);
      args = message.content.slice(matchedPrefix.length).trim().split(/ +/);
      commandName = args.shift().toLowerCase();
    } else if (!requirePrefix) {
      args = message.content.trim().split(/ +/);
      commandName = args.shift().toLowerCase();
    } else {
      // No command found, continue to XP tracking
      commandName = null;
    }

    if (commandName) {
      let command = client.prefixCommands.get(commandName) || client.prefixCommands.get(client.aliases.get(commandName));

      if (command) {
        if (!client.cooldowns.has(command.name)) {
          client.cooldowns.set(command.name, new Map());
        }

        const now = Date.now();
        const timestamps = client.cooldowns.get(command.name);
        const cooldownAmount = (command.cooldown || 3) * 1000;

        if (timestamps.has(message.author.id)) {
          const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

          if (now < expirationTime) {
            const timeLeft = (expirationTime - now) / 1000;
            return message.reply(`Please wait ${timeLeft.toFixed(1)} more second(s) before using \`${command.name}\` again.`);
          }
        }

        timestamps.set(message.author.id, now);
        setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

        try {
          await command.execute(message, args, client);
          return; // Stop processing after command execution
        } catch (error) {
          console.error(`Error executing command ${command.name}:`, error);
          message.reply('There was an error executing that command.');
          return;
        }
      }
    }
  } catch (error) {
    console.error('Error in message command handler:', error);
  }

  // XP tracking system
  try {
    const blacklistResult = await query(
      'SELECT id FROM blacklistTable WHERE id = $1 OR id = $2',
      [`${message.guild.id}-${message.author.id}`, `${message.guild.id}-${message.channel.id}`]
    );
    if (blacklistResult.rows.length > 0) return;

    const level = await getLevel(message.author.id, message.guild.id);
    if (!level) {
      await query(
        'INSERT INTO levels (id, "user", guild, xp, level, "totalXP") VALUES ($1, $2, $3, $4, $5, $6)',
        [`${message.author.id}-${message.guild.id}`, message.author.id, message.guild.id, 0, 0, 0]
      );
      return;
    }

    const customSettingsResult = await query('SELECT * FROM settings WHERE guild = $1', [message.guild.id]);
    const channelLevelResult = await query('SELECT * FROM channel WHERE guild = $1', [message.guild.id]);

    const customSettings = customSettingsResult.rows[0];
    const channelLevel = channelLevelResult.rows[0];

    let getXpfromDB = customSettings ? customSettings.customxp : 16;
    let getCooldownfromDB = customSettings ? customSettings.customcooldown : 1000;

    const generatedXp = Math.floor(Math.random() * getXpfromDB);
    const nextXP = level.level * 2 * 250 + 250;

    if (client.talkedRecently.get(message.author.id)) {
      return;
    } else {
      level.xp += generatedXp;
      level.totalXP = (level.totalXP || 0) + generatedXp;

      if (level.xp >= nextXP) {
        level.xp = 0;
        level.level += 1;

        let hasRoleReward = false;

        try {
          const rolesResult = await query(
            'SELECT * FROM roles WHERE guildID = $1 AND level = $2',
            [message.guild.id, level.level]
          );
          const roleData = rolesResult.rows[0];

          if (roleData && roleData.roleid) {
            hasRoleReward = true;
            const roleId = roleData.roleid.toString();
            const role = message.guild.roles.cache.get(roleId);

            if (!message.member.roles.cache.has(roleId)) {
              if (message.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
                try {
                  await message.member.roles.add(roleId);
                  console.log(`✅ Assigned role ${roleId} to ${message.author.tag} for reaching level ${level.level}`);
                } catch (roleError) {
                  console.error('Error assigning role:', roleError.message);
                }
              } else {
                console.error('⚠️ Bot lacks ManageRoles permission to assign role for level', level.level);
              }
            }

            try {
              let roleRewardChannelId = null;
              let roleMessage = roleData.dmmessage || 'Congratulations! 🎉 You have reached level {level} and earned the {role} role!';

              try {
                const configPath = path.join(__dirname, 'bot-config.json');
                const configData = fs.readFileSync(configPath, 'utf8');
                const botConfig = JSON.parse(configData);
                roleRewardChannelId = botConfig.roleReward?.channelId || null;

                if (botConfig.roleReward?.levelMessages && botConfig.roleReward.levelMessages[level.level]) {
                  roleMessage = botConfig.roleReward.levelMessages[level.level];
                } else if (botConfig.roleReward?.message) {
                  roleMessage = botConfig.roleReward.message;
                }
              } catch (err) {
                console.log('Error loading bot-config.json for role reward:', err.message);
              }

              if (!roleRewardChannelId) {
                console.error(`⚠️ Role reward channel not configured in dashboard! Skipping role reward message for level ${level.level}`);
                return;
              }

              const formattedMessage = roleMessage
                .replace(/{level}/gi, level.level)
                .replace(/{role}/gi, role ? role.name : 'the reward role')
                .replace(/{user}/gi, message.author.username)
                .replace(/{member}/gi, `<@${message.author.id}>`);

              const roleRewardChannel = message.guild.channels.cache.get(roleRewardChannelId);

              if (!roleRewardChannel) {
                console.error(`⚠️ Role reward channel ${roleRewardChannelId} not found!`);
                return;
              }

              const permissions = roleRewardChannel.permissionsFor(message.guild.members.me);
              if (permissions && permissions.has(PermissionFlagsBits.SendMessages)) {
                await roleRewardChannel.send(formattedMessage);
              } else {
                console.error(`⚠️ Bot lacks SendMessages permission in role reward channel ${roleRewardChannelId}`);
              }
            } catch (rewardError) {
              console.error('Error sending role reward message:', rewardError);
            }
          }
        } catch (roleQueryError) {
          console.error('Error querying role rewards:', roleQueryError);
        }

        if (!hasRoleReward) {
          try {
            let levelUpMessage = customSettings?.levelupmessage || '**Congratulations** {member}! You have now leveled up to **level {level}**';
            let levelUpChannelId = null;

            try {
              const configPath = path.join(__dirname, 'bot-config.json');
              const configData = fs.readFileSync(configPath, 'utf8');
              const botConfig = JSON.parse(configData);
              if (botConfig.levelUpMessage) {
                levelUpMessage = botConfig.levelUpMessage;
              }
              levelUpChannelId = botConfig.levelUpChannel || (channelLevel ? channelLevel.channel : null);
            } catch (err) {
              console.log('Error loading bot-config.json for level up message:', err.message);
              levelUpChannelId = channelLevel ? channelLevel.channel : null;
            }

            if (!levelUpChannelId) {
              console.error(`⚠️ Level up channel not configured! Skipping level up message for level ${level.level}`);
              return;
            }

            const formattedMessage = levelUpMessage
              .replace(/{level}/gi, level.level)
              .replace(/{user}/gi, message.author.username)
              .replace(/{member}/gi, `<@${message.author.id}>`);

            const levelChannel = message.guild.channels.cache.get(levelUpChannelId);

            if (!levelChannel) {
              console.error(`⚠️ Level up channel ${levelUpChannelId} not found!`);
              return;
            }

            const permissions = levelChannel.permissionsFor(message.guild.members.me);
            if (permissions && permissions.has(PermissionFlagsBits.SendMessages)) {
              await levelChannel.send(formattedMessage);
            } else {
              console.error(`⚠️ Bot lacks SendMessages permission in level up channel ${levelChannel.id}`);
            }
          } catch (levelUpError) {
            console.error('Error sending level up message:', levelUpError);
          }
        }
      }

      await setLevel(level);

      client.talkedRecently.set(message.author.id, true);
      setTimeout(() => {
        client.talkedRecently.delete(message.author.id);
      }, getCooldownfromDB);
    }
  } catch (error) {
    console.error('Error in XP tracking:', error);
  }
});

client.on('guildMemberAdd', async (newMember) => {
  try {
    let welcomeChannelId = null;
    let config = null;
    
    try {
      const configPath = path.join(__dirname, 'bot-config.json');
      const configData = fs.readFileSync(configPath, 'utf8');
      config = JSON.parse(configData);
      welcomeChannelId = config?.welcome?.channelId || null;
    } catch (err) {
      console.log('Could not read bot-config.json, checking database...');
    }
    
    if (!welcomeChannelId) {
      welcomeChannelId = await getWelcomeChannel(newMember.guild.id);
    }
    
    if (!welcomeChannelId) {
      console.log(`No welcome channel configured for guild ${newMember.guild.id}`);
      return;
    }

    const welcomeChannel = newMember.guild.channels.cache.get(welcomeChannelId);
    
    if (!welcomeChannel) {
      console.error(`Welcome channel ${welcomeChannelId} not found in guild ${newMember.guild.id}`);
      return;
    }

    const permissions = welcomeChannel.permissionsFor(newMember.guild.members.me);
    if (!permissions || !permissions.has(PermissionFlagsBits.SendMessages) || !permissions.has(PermissionFlagsBits.AttachFiles)) {
      console.error(`Bot lacks permissions in welcome channel ${welcomeChannelId}`);
      return;
    }

    try {
      const attachment = await client.welcomeService.generateWelcomeImage(newMember);
      const welcomeContent = client.welcomeService.createWelcomeContent(newMember, attachment, config);
      
      await welcomeChannel.send({
        content: welcomeContent.content,
        embeds: [welcomeContent.embed],
        files: [attachment]
      });
      
      console.log(`✅ Sent welcome message for ${newMember.user.tag} in guild ${newMember.guild.name}`);
    } catch (error) {
      console.error('Error generating welcome image:', error);
      
      const fallbackEmbed = new EmbedBuilder()
        .setColor('#FFD700')
        .setDescription(`Welcome to the server, <@${newMember.id}>! 👋`);
      
      await welcomeChannel.send({ embeds: [fallbackEmbed] });
    }
  } catch (error) {
    console.error('Error in guildMemberAdd event:', error);
  }
});

client.login(client.config.TOKEN);

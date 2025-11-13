
const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const { isAdmin } = require("../config-helper");

module.exports = {
    name: 'helpdt',
    data: new SlashCommandBuilder()
        .setName('helpdt')
        .setDescription('Display all available commands')
        .addStringOption(option =>
            option.setName('command')
                .setDescription('Get detailed help for a specific command')
                .setRequired(false)),
    
    async execute(interaction) {
        const commandName = interaction.options.getString('command');
        
        if (!commandName) {
            let help = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle(`${interaction.guild.name} - Bot Commands`)
                .setDescription(`Use \`/helpdt <command>\` for detailed information about a specific command.\n\n**Total Commands:** 15`)
                .addFields(
                    { 
                        name: '📊 Leveling Commands', 
                        value: `\`!rank\` - View your or another user's rank card\n` +
                               `\`!leaderboard\` - View server XP leaderboard\n` +
                               `\`/addlevel\` - Add levels to a user (Admin)\n` +
                               `\`/resetlevel\` - Reset a user's level to 0 (Admin)\n` +
                               `\`/rolelevel\` - Manage role rewards for levels (Admin)\n` +
                               `\`/xpsettings\` - Configure XP and leveling settings (Admin)\n` +
                               `\`/blacklist\` - Manage XP blacklist (Admin)\n`
                    },
                    { 
                        name: '🎫 Ticket System Commands', 
                        value: `\`/setupticket\` - Initialize ticket system (Admin)\n` +
                               `\`/addsection\` - Add new ticket section (Admin)\n` +
                               `\`/deletesection\` - Remove ticket section (Admin)\n`
                    },
                    { 
                        name: '👋 Welcome System Commands', 
                        value: `\`/setupwelcome\` - Configure welcome messages (Admin)\n` +
                               `\`/join\` - Test the welcome message (Admin)\n`
                    },
                    { 
                        name: '❓ Utility Commands', 
                        value: `\`/helpdt\` - Show this help menu\n`
                    }
                )
                .setFooter({ text: `Prefix: ! | Use the dashboard for additional customization` })
                .setTimestamp();

            return interaction.reply({ embeds: [help], ephemeral: true });
        }

        const commandExamples = {
            'rank': {
                description: 'View your or another user\'s rank card with XP, level, and server ranking.',
                usage: `!rank [@user]`,
                examples: [
                    `!rank - View your own rank`,
                    `!rank @John - View John's rank`,
                    `!rank 123456789012345678 - View rank by user ID`
                ],
                aliases: ['level', 'xp'],
                type: 'prefix'
            },
            'leaderboard': {
                description: 'View the server leaderboard showing top users by total XP.',
                usage: `!leaderboard [page]`,
                examples: [
                    `!leaderboard - View page 1`,
                    `!leaderboard 2 - View page 2`,
                    `!lb - Same command (alias)`,
                    `!top - Same command (alias)`
                ],
                aliases: ['lb', 'top'],
                type: 'prefix'
            },
            'addlevel': {
                description: 'Add levels to a user. Requires admin permission.',
                usage: `/addlevel <user> <amount>`,
                examples: [
                    `/addlevel user:@John amount:5 - Add 5 levels to John`,
                    `/addlevel user:@Jane amount:10 - Add 10 levels to Jane`
                ],
                adminOnly: true,
                type: 'slash'
            },
            'resetlevel': {
                description: 'Reset a user\'s level to 0. Requires admin permission.',
                usage: `/resetlevel <user>`,
                examples: [
                    `/resetlevel user:@John - Reset John to level 0`
                ],
                adminOnly: true,
                type: 'slash'
            },
            'blacklist': {
                description: 'Prevent users or channels from gaining XP. Requires admin permission.',
                usage: `/blacklist <subcommand>`,
                examples: [
                    `/blacklist user target:@John - Blacklist John from gaining XP`,
                    `/blacklist remove_user target:@John - Remove John from blacklist`,
                    `/blacklist channel target:#spam - Blacklist #spam channel`,
                    `/blacklist list - View all blacklisted users/channels`
                ],
                adminOnly: true,
                type: 'slash'
            },
            'rolelevel': {
                description: 'Assign roles as rewards when users reach certain levels. Requires admin permission.',
                usage: `/rolelevel <subcommand>`,
                examples: [
                    `/rolelevel add level:10 role:@Member - Give Member role at level 10`,
                    `/rolelevel add level:50 role:@VIP - Give VIP role at level 50`,
                    `/rolelevel remove level:10 - Remove role reward for level 10`,
                    `/rolelevel show - View all role rewards`,
                    `/rolelevel setmessage level:10 message:Congrats! - Set custom message`
                ],
                adminOnly: true,
                type: 'slash'
            },
            'xpsettings': {
                description: 'Set custom XP gain and cooldown. Requires admin permission.',
                usage: `/xpsettings <xp> <cooldown>`,
                examples: [
                    `/xpsettings xp:20 cooldown:60 - Users gain 1-20 XP every 60 seconds`,
                    `/xpsettings xp:15 cooldown:30 - Users gain 1-15 XP every 30 seconds`
                ],
                adminOnly: true,
                type: 'slash'
            },
            'setupticket': {
                description: 'Initialize the ticket system in a channel. Requires admin permission.',
                usage: `/setupticket`,
                examples: [
                    `/setupticket - Set up ticket system in current channel`
                ],
                adminOnly: true,
                type: 'slash',
                note: 'You must add sections with /addsection before setup'
            },
            'addsection': {
                description: 'Add a new ticket section/category. Requires admin permission.',
                usage: `/addsection`,
                examples: [
                    `/addsection - Opens a modal to configure new ticket section`
                ],
                adminOnly: true,
                type: 'slash'
            },
            'deletesection': {
                description: 'Remove a ticket section. Requires admin permission.',
                usage: `/deletesection <section>`,
                examples: [
                    `/deletesection section:Support - Delete support section`
                ],
                adminOnly: true,
                type: 'slash'
            },
            'setupwelcome': {
                description: 'Configure welcome messages for new members. Requires admin permission.',
                usage: `/setupwelcome <channel> [options]`,
                examples: [
                    `/setupwelcome channel:#welcome - Set welcome channel`,
                    `/setupwelcome channel:#welcome mention_text:Welcome \${member}! - Custom mention`,
                    `/setupwelcome channel:#welcome embed_color:#FFD700 - Custom color`
                ],
                adminOnly: true,
                type: 'slash',
                note: 'Variables: ${member}, ${username}, ${serverName}, ${memberCount}, ${rulesChannel}, ${supportChannel}'
            },
            'join': {
                description: 'Test the welcome message by simulating you joining the server. Requires admin permission.',
                usage: `/join`,
                examples: [
                    `/join - Trigger your own welcome message`
                ],
                adminOnly: true,
                type: 'slash',
                note: 'Useful for testing welcome message configuration'
            },
            'helpdt': {
                description: 'Display all available commands or detailed help for a specific command.',
                usage: `/helpdt [command]`,
                examples: [
                    `/helpdt - Show all commands`,
                    `/helpdt command:rank - Show detailed help for rank command`
                ],
                type: 'slash'
            }
        };

        const cmdInfo = commandExamples[commandName.toLowerCase()];

        if (!cmdInfo) {
            return interaction.reply({ 
                content: `❌ Command \`${commandName}\` not found! Use \`/helpdt\` to see all commands.`, 
                ephemeral: true 
            });
        }

        let embed = new EmbedBuilder()
            .setTitle(`📖 Command: ${commandName}`)
            .setColor('#FFD700')
            .setDescription(cmdInfo.description)
            .addFields(
                { name: '📝 Usage', value: `\`${cmdInfo.usage}\``, inline: false },
                { name: '🔧 Type', value: cmdInfo.type === 'slash' ? 'Slash Command' : 'Prefix Command', inline: true }
            );

        if (cmdInfo.examples && cmdInfo.examples.length > 0) {
            embed.addFields({ 
                name: '💡 Examples', 
                value: cmdInfo.examples.map(ex => `\`${ex}\``).join('\n'), 
                inline: false 
            });
        }

        if (cmdInfo.aliases && cmdInfo.aliases.length > 0) {
            embed.addFields({ 
                name: '🔄 Aliases', 
                value: cmdInfo.aliases.map(a => `\`${a}\``).join(', '), 
                inline: false 
            });
        }

        if (cmdInfo.note) {
            embed.addFields({ 
                name: '📌 Note', 
                value: cmdInfo.note, 
                inline: false 
            });
        }

        if (cmdInfo.adminOnly) {
            embed.setFooter({ text: '⚠️ This command requires admin permission' });
        }

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
};

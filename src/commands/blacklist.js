const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { query } = require("../database");
const { isAdmin } = require("../config-helper");

module.exports = {
    name: 'blacklist',
    data: new SlashCommandBuilder()
        .setName('blacklist')
        .setDescription('Manage XP blacklist for users and channels')
        .addSubcommand(subcommand =>
            subcommand
                .setName('user')
                .setDescription('Blacklist a user from gaining XP')
                .addUserOption(option =>
                    option.setName('target')
                        .setDescription('The user to blacklist')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('channel')
                .setDescription('Blacklist a channel from giving XP')
                .addChannelOption(option =>
                    option.setName('target')
                        .setDescription('The channel to blacklist')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove_user')
                .setDescription('Remove a user from blacklist')
                .addUserOption(option =>
                    option.setName('target')
                        .setDescription('The user to remove')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove_channel')
                .setDescription('Remove a channel from blacklist')
                .addChannelOption(option =>
                    option.setName('target')
                        .setDescription('The channel to remove')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Show all blacklisted users and channels'))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(client, interaction) {
        if (!isAdmin(interaction.member)) {
            return interaction.reply({ content: 'You do not have permission to use this command! You need to be an admin.', ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();

        try {
            if (subcommand === 'list') {
                const listsResult = await query('SELECT * FROM blacklistTable WHERE guild = $1', [interaction.guild.id]);
                const lists = listsResult.rows;
                
                if (lists.length === 0) {
                    return interaction.reply({ content: 'No blacklisted users or channels found!', ephemeral: true });
                }

                const users = lists.filter(l => l.type === 'User').map(l => `<@${l.typeid}>`).join('\n') || 'None';
                const channels = lists.filter(l => l.type === 'Channel').map(l => `<#${l.typeid}>`).join('\n') || 'None';
                
                return interaction.reply(`**Blacklist:**\n\n**Users:**\n${users}\n\n**Channels:**\n${channels}`);
            }

            if (subcommand === 'user') {
                const user = interaction.options.getUser('target');
                const ifExistsResult = await query('SELECT id FROM blacklistTable WHERE id = $1', [`${interaction.guild.id}-${user.id}`]);
                
                if (ifExistsResult.rows.length > 0) {
                    return interaction.reply({ content: 'This user is already blacklisted!', ephemeral: true });
                }
                
                await query('INSERT INTO blacklistTable (guild, typeId, type, id) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING', [interaction.guild.id, user.id, "User", `${interaction.guild.id}-${user.id}`]);
                return interaction.reply(`✅ ${user.toString()} has been blacklisted from gaining XP!`);
            }

            if (subcommand === 'channel') {
                const channel = interaction.options.getChannel('target');
                const ifExistsResult = await query('SELECT id FROM blacklistTable WHERE id = $1', [`${interaction.guild.id}-${channel.id}`]);
                
                if (ifExistsResult.rows.length > 0) {
                    return interaction.reply({ content: 'This channel is already blacklisted!', ephemeral: true });
                }
                
                await query('INSERT INTO blacklistTable (guild, typeId, type, id) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING', [interaction.guild.id, channel.id, "Channel", `${interaction.guild.id}-${channel.id}`]);
                return interaction.reply(`✅ ${channel.toString()} has been blacklisted from giving XP!`);
            }

            if (subcommand === 'remove_user') {
                const user = interaction.options.getUser('target');
                const ifExistsResult = await query('SELECT id FROM blacklistTable WHERE id = $1', [`${interaction.guild.id}-${user.id}`]);
                
                if (ifExistsResult.rows.length === 0) {
                    return interaction.reply({ content: 'This user is not blacklisted!', ephemeral: true });
                }
                
                await query('DELETE FROM blacklistTable WHERE id = $1', [`${interaction.guild.id}-${user.id}`]);
                return interaction.reply(`✅ Successfully removed ${user.toString()} from the blacklist!`);
            }

            if (subcommand === 'remove_channel') {
                const channel = interaction.options.getChannel('target');
                const ifExistsResult = await query('SELECT id FROM blacklistTable WHERE id = $1', [`${interaction.guild.id}-${channel.id}`]);
                
                if (ifExistsResult.rows.length === 0) {
                    return interaction.reply({ content: 'This channel is not blacklisted!', ephemeral: true });
                }
                
                await query('DELETE FROM blacklistTable WHERE id = $1', [`${interaction.guild.id}-${channel.id}`]);
                return interaction.reply(`✅ Successfully removed ${channel.toString()} from the blacklist!`);
            }
        } catch (error) {
            console.error('Error in blacklist command:', error);
            return interaction.reply({ content: 'An error occurred. Please try again.', ephemeral: true });
        }
    }
};

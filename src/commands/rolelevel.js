const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { query } = require("../database");
const { isAdmin } = require("../config-helper");

module.exports = {
    name: 'rolelevel',
    data: new SlashCommandBuilder()
        .setName('rolelevel')
        .setDescription('Manage role rewards for leveling up')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a role reward for a specific level')
                .addIntegerOption(option =>
                    option.setName('level')
                        .setDescription('The level to assign the role at')
                        .setRequired(true)
                        .setMinValue(1))
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('The role to give')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a role reward from a level')
                .addIntegerOption(option =>
                    option.setName('level')
                        .setDescription('The level to remove the role from')
                        .setRequired(true)
                        .setMinValue(1)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('show')
                .setDescription('Show all role rewards'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('setmessage')
                .setDescription('Set a custom DM message for a role reward')
                .addIntegerOption(option =>
                    option.setName('level')
                        .setDescription('The level')
                        .setRequired(true)
                        .setMinValue(1))
                .addStringOption(option =>
                    option.setName('message')
                        .setDescription('The message (use {level}, {role}, {user} as placeholders)')
                        .setRequired(true)))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(client, interaction) {
        if (!isAdmin(interaction.member)) {
            return interaction.reply({ content: 'You do not have permission to use this command! You need to be an admin.', ephemeral: true });
        }

        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return interaction.reply({ content: 'I do not have permission to manage roles!', ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();

        try {
            if (subcommand === 'show') {
                const allRolesResult = await query('SELECT * FROM roles WHERE guildID = $1 ORDER BY level ASC', [interaction.guild.id]);
                const allRoles = allRolesResult.rows;
                
                if (allRoles.length === 0) {
                    return interaction.reply({ content: 'There are no role rewards set!', ephemeral: true });
                }

                let embed = new EmbedBuilder()
                    .setTitle(`${interaction.guild.name} Role Rewards`)
                    .setDescription('Level role rewards configured for this server')
                    .setColor("#FFD700");
                
                for (const data of allRoles) {
                    embed.addFields({ name: `Level ${data.level}`, value: `<@&${data.roleid}>` });
                }
                
                return interaction.reply({ embeds: [embed] });
            }

            if (subcommand === 'add') {
                const level = interaction.options.getInteger('level');
                const role = interaction.options.getRole('role');

                const levelExistsResult = await query('SELECT * FROM roles WHERE guildID = $1 AND level = $2', [interaction.guild.id, level]);
                const levelExists = levelExistsResult.rows[0];
                
                if (!levelExists) {
                    await query('INSERT INTO roles (guildID, roleID, level) VALUES ($1, $2, $3)', [interaction.guild.id, role.id, level]);
                    let embed = new EmbedBuilder()
                        .setTitle(`✅ Role Reward Set!`)
                        .setDescription(`${role} has been set for level ${level}`)
                        .setColor("#FFD700");
                    return interaction.reply({ embeds: [embed] });
                } else {
                    await query('UPDATE roles SET roleID = $1 WHERE guildID = $2 AND level = $3', [role.id, interaction.guild.id, level]);
                    let embed = new EmbedBuilder()
                        .setTitle(`✅ Role Reward Updated!`)
                        .setDescription(`${role} has been updated for level ${level}`)
                        .setColor("#FFD700");
                    return interaction.reply({ embeds: [embed] });
                }
            }

            if (subcommand === 'remove') {
                const level = interaction.options.getInteger('level');
                
                const levelsResult = await query('SELECT * FROM roles WHERE guildID = $1 AND level = $2', [interaction.guild.id, level]);
                const levels = levelsResult.rows[0];

                if (!levels) {
                    return interaction.reply({ content: `No role reward is set for level ${level}!`, ephemeral: true });
                }

                await query('DELETE FROM roles WHERE guildID = $1 AND level = $2', [interaction.guild.id, level]);
                let embed = new EmbedBuilder()
                    .setTitle(`✅ Role Reward Removed!`)
                    .setDescription(`Role rewards for level ${level} have been removed.`)
                    .setColor("#FFD700");
                return interaction.reply({ embeds: [embed] });
            }

            if (subcommand === 'setmessage') {
                const level = interaction.options.getInteger('level');
                const customMessage = interaction.options.getString('message');

                const levelExistsResult = await query('SELECT * FROM roles WHERE guildID = $1 AND level = $2', [interaction.guild.id, level]);
                
                if (levelExistsResult.rows.length === 0) {
                    return interaction.reply({ content: `No role is set for level ${level}. Please use \`/rolelevel add\` first.`, ephemeral: true });
                }

                await query('UPDATE roles SET dmMessage = $1 WHERE guildID = $2 AND level = $3', [customMessage, interaction.guild.id, level]);
                let embed = new EmbedBuilder()
                    .setTitle(`✅ DM Message Updated!`)
                    .setDescription(`The DM message for level ${level} has been set to:\n\n${customMessage}`)
                    .setColor("#FFD700");
                return interaction.reply({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Error in rolelevel command:', error);
            return interaction.reply({ content: 'An error occurred. Please try again.', ephemeral: true });
        }
    }
};

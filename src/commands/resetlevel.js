const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { query } = require("../database");
const { isAdmin } = require("../config-helper");

module.exports = {
    name: 'resetlevel',
    data: new SlashCommandBuilder()
        .setName('resetlevel')
        .setDescription('Reset a user\'s level and XP to 0')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to reset')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(client, interaction) {
        if (!isAdmin(interaction.member)) {
            return interaction.reply({ content: 'You do not have permission to use this command! You need to be an admin.', ephemeral: true });
        }

        const user = interaction.options.getUser('user');
        const member = interaction.guild.members.cache.get(user.id);

        if (!member) {
            return interaction.reply({ content: 'User not found in this server!', ephemeral: true });
        }

        try {
            const scoreResult = await query('SELECT * FROM levels WHERE "user" = $1 AND guild = $2', [user.id, interaction.guild.id]);
            const score = scoreResult.rows[0];
            
            if (!score) {
                return interaction.reply({ content: `${user.toString()} doesn't have any levels to reset!`, ephemeral: true });
            }

            const oldLevel = score.level;

            await query(
                'UPDATE levels SET xp = $1, level = $2, "totalXP" = $3 WHERE "user" = $4 AND guild = $5',
                [0, 0, 0, user.id, interaction.guild.id]
            );

            let embed = new EmbedBuilder()
                .setTitle('🔄 Level Reset Successfully!')
                .setDescription(`Reset ${user.toString()}'s level!\n\n**Previous Level:** ${oldLevel}\n**New Level:** 0`)
                .setColor('#FF6B6B')
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in resetlevel command:', error);
            return interaction.reply({ content: 'An error occurred while resetting the level. Please try again.', ephemeral: true });
        }
    }
};

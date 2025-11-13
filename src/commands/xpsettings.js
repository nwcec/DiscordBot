const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { query } = require("../database");
const { isAdmin } = require("../config-helper");

module.exports = {
    name: 'xpsettings',
    data: new SlashCommandBuilder()
        .setName('xpsettings')
        .setDescription('Configure custom XP gain and cooldown settings')
        .addIntegerOption(option =>
            option.setName('xp')
                .setDescription('Maximum XP gain per message (0 or higher)')
                .setRequired(true)
                .setMinValue(0))
        .addIntegerOption(option =>
            option.setName('cooldown')
                .setDescription('Cooldown in seconds between XP gains (0 or higher)')
                .setRequired(true)
                .setMinValue(0))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(client, interaction) {
        if (!isAdmin(interaction.member)) {
            return interaction.reply({ content: 'You do not have permission to use this command! You need to be an admin.', ephemeral: true });
        }

        const xpAmount = interaction.options.getInteger('xp');
        const cooldownSeconds = interaction.options.getInteger('cooldown');

        try {
            const checkIfResult = await query('SELECT levelupmessage FROM settings WHERE guild = $1', [interaction.guild.id]);
            if (checkIfResult.rows.length > 0) {
                await query('UPDATE settings SET customxp = $1 WHERE guild = $2', [xpAmount, interaction.guild.id]);
                await query('UPDATE settings SET customcooldown = $1 WHERE guild = $2', [cooldownSeconds * 1000, interaction.guild.id]);
            } else {
                await query('INSERT INTO settings (guild, levelupmessage, customxp, customcooldown) VALUES ($1, $2, $3, $4)', [interaction.guild.id, `**Congratulations** {member}! You have now leveled up to **level {level}**`, xpAmount, cooldownSeconds * 1000]);
            }

            await interaction.reply(`✅ XP Settings Updated!\n\nUsers will now gain **1-${xpAmount} XP** per message with a **${cooldownSeconds} second** cooldown.`);
        } catch (error) {
            console.error('Error in xpsettings command:', error);
            return interaction.reply({ content: 'An error occurred while updating XP settings. Please try again.', ephemeral: true });
        }
    }
};

const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { isAdmin } = require("../config-helper");

module.exports = {
    name: 'join',
    data: new SlashCommandBuilder()
        .setName('join')
        .setDescription('Test the welcome message system')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(client, interaction) {
        if (!interaction.member) {
            return interaction.reply({ content: '❌ This command can only be used in a server!', ephemeral: true });
        }

        if (!isAdmin(interaction.member)) {
            return interaction.reply({ content: '❌ You do not have permission to use this command! You need to be an admin.', ephemeral: true });
        }

        await interaction.reply({ content: '✅ Triggering welcome message test...', ephemeral: true });
        
        interaction.client.emit('guildMemberAdd', interaction.member);
    }
};

const { ActionRowBuilder, StringSelectMenuBuilder, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Locale = require('../locale/en.json');
const { isAdmin } = require('../config-helper');

module.exports = {
  name: 'deletesection',
  data: new SlashCommandBuilder()
    .setName('deletesection')
    .setDescription(Locale.deleteSection.Description)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  
  async execute(client, interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: '❌ You do not have permission to use this command! You need to be an admin.', ephemeral: true });
    }

    const locale = Locale;
    
    await interaction.deferReply({ ephemeral: true });
    
    const selectMenu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('delete_section')
        .setPlaceholder(locale.deleteSection.SelectPlaceholder)
        .addOptions(client.config.ticketOptions)
    );
    
    interaction.editReply({
      content: locale.deleteSection.deleteMessage,
      ephemeral: true,
      components: [selectMenu]
    });
  }
};

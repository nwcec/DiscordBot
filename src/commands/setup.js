
const {
  StringSelectMenuBuilder,
  AttachmentBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  EmbedBuilder
} = require('discord.js');
const Locale = require('../locale/en.json');
const { isAdmin } = require('../config-helper');

module.exports = {
  name: 'setupticket',
  data: new SlashCommandBuilder()
    .setName('setupticket')
    .setDescription(Locale.setup.Description)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  
  async execute(client, interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: '❌ You do not have permission to use this command! You need to be an admin.', ephemeral: true });
    }

    const locale = Locale;
    
    await interaction.deferReply({ ephemeral: true });
    
    if (!client.config.ticketOptions || client.config.ticketOptions.length === 0) {
      return interaction.editReply({
        content: 'You must add at least one section before setting up the ticket system. Use /addsection to add a section.',
        ephemeral: true
      });
    }
    
    if (!client.config.backgroundUrl) {
      return interaction.editReply({
        content: 'You need to set up the ticket background first before proceeding.',
        ephemeral: true
      });
    }
    
    const backgroundEmbed = new EmbedBuilder()
      .setImage(client.config.backgroundUrl)
      .setColor('#5865F2');
    
    const embedText = client.config.EMBED_TEXT || '📋 **Support Ticket System**\n\nPlease select the type of assistance you need from the dropdown menu below.';
    
    const textEmbed = new EmbedBuilder()
      .setDescription(embedText)
      .setColor('#5865F2')
      .setFooter({ text: 'Our support team is here to help!' });
    
    const selectMenu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('select*')
        .setPlaceholder(locale.setup.SelectPlaceholder)
        .addOptions(client.config.ticketOptions)
    );
    
    const buttons = [];
    for (const option of client.config.ticketOptions) {
      const button = new ButtonBuilder()
        .setCustomId('select*' + option.value)
        .setLabel(option.label)
        .setStyle('Secondary');
      
      if (option.emoji) {
        button.setEmoji(option.emoji);
      }
      
      buttons.push(button);
    }
    
    const buttonRows = [];
    for (let i = 0; i < buttons.length; i += 5) {
      buttonRows.push(
        new ActionRowBuilder().addComponents(buttons.slice(i, i + 5))
      );
    }
    
    const components = client.config.SECTION_TYPE === 'list' ? [selectMenu] : buttonRows;
    
    await interaction.channel.send({
      embeds: [backgroundEmbed, textEmbed],
      components: components.length ? components : []
    });
    
    interaction.editReply({ content: locale.setup.success, ephemeral: true });
  }
};

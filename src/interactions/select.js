const { ActionRowBuilder, ButtonBuilder, AttachmentBuilder, ChannelType, PermissionFlagsBits, ButtonInteraction, AnySelectMenuInteraction, ButtonStyle, EmbedBuilder } = require('discord.js');
const { CustomClient } = require('../utils');

module.exports = {
  name: 'select',
  async execute(client, interaction) {
    const Locale = require('../locale/en.json');
    const locale = Locale;

    // Always use reply to keep the menu interactive
    await interaction.deferReply({ ephemeral: true }).catch(() => {});

    const selectedOption = interaction.isAnySelectMenu()
      ? interaction.values[0]
      : interaction.customId.split('*')[1];

    if (client.config.optionConfig[selectedOption]) {
      const { roleId, image, categoryID, embedText } = client.config.optionConfig[selectedOption];
      // Use tickets.categoryId from dashboard, fallback to legacy categoryID, then option categoryID
      const category = categoryID ? categoryID : (client.config.tickets?.categoryId || client.config.categoryID || client.config.category);
      const categoryChannel = interaction.guild.channels.cache.get(category);

      if (!categoryChannel || categoryChannel.type !== ChannelType.GuildCategory) {
        // Handle case where categoryID is not found or not a category
        // Consider logging an error or sending a message to the user
        return;
      }

      const existingTicket = await categoryChannel.children.cache.find(
        channel => channel.topic == interaction.user.id
      );

      if (existingTicket) {
        interaction.editReply({
          content: locale.select.alreadyCreated,
          ephemeral: true
        });
        return;
      }

      const ticketCount = await client.db.get('tickets') || 0;
      const ticketChannel = await interaction.guild.channels.create({
        name: '🎫・' + (ticketCount + 1),
        type: ChannelType.GuildText,
        topic: interaction.user.id,
        parent: categoryChannel.id,
        permissionOverwrites: [
          {
            id: interaction.guild.id,
            deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
          },
          {
            id: interaction.user.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
          },
          {
            id: roleId,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
          },
          {
            id: client.user.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
          }
        ]
      });

      await client.db.set('tickets', ticketCount + 1);
      await client.db.set(
        'ticket-' + interaction.guild.id + '-' + interaction.user.id,
        {
          id: ticketCount + 1,
          channelId: ticketChannel.id,
          selectedOption: selectedOption
        }
      );

      const user = interaction.user;
      const roleTag = roleId ? '<@&' + roleId + '>' : '';
      const optionConfig = client.config.optionConfig[selectedOption];

      // Mentions outside embed for notifications
      const mentionText = locale.select.helloUser
        .replace('[user]', user.toString())
        .replace('[role]', roleTag);

      const embedDescription = optionConfig?.embedText || 'Thank you for contacting support! A member of our team will assist you shortly.\n\n**Please describe your issue in detail below.**';
      
      // Use section name as title
      const embedTitle = `🎫 ${selectedOption} Ticket`;
      
      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle(embedTitle)
        .setDescription(embedDescription)
        .setImage(optionConfig?.image || '')
        .setFooter({ text: `Ticket #${ticketCount + 1}` })
        .setTimestamp();

      const ticketMessage = await ticketChannel.send({
        content: mentionText,
        embeds: [embed]
      });

      const claimButton = new ButtonBuilder()
        .setCustomId('claim')
        .setLabel(locale.select.claim)
        .setStyle(ButtonStyle.Success);

      const closeButton = new ButtonBuilder()
        .setCustomId('close')
        .setLabel(locale.select.close)
        .setStyle(ButtonStyle.Danger);

      const actionRow = new ActionRowBuilder().addComponents(claimButton, closeButton);

      await ticketMessage.edit({ components: [actionRow] });
      
      // Send confirmation message
      await interaction.editReply({
        content: locale.select.created.replace('[channel]', ticketChannel),
        ephemeral: true
      }).catch(() => {});
    }
  }
};
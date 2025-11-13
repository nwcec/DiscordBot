const { PermissionFlagsBits, CommandInteraction } = require('discord.js');
const Locale = require('../locale/en.json');
const { CustomClient } = require('../utils');

module.exports = {
  name: 'claim',
  async execute(client, interaction) {
    const locale = Locale;
    const ticketData = await client.db.get('ticket-' + interaction.guild.id + '-' + interaction.channel.topic);

    if (interaction.channel.topic == interaction.user.id) {
      await interaction.reply({
        content: locale.claim.userClaimError,
        ephemeral: true
      });
      return;
    }

    const selectedOption = ticketData.selectedOption;
    const { roleId } = client.config.optionConfig[selectedOption];

    if (interaction.member.roles.cache.has(roleId)) {
      await client.db.set('ticket-' + interaction.guild.id + '-' + interaction.channel.topic, {
        ...ticketData,
        claimed: interaction.user.id
      });

      await interaction.reply({
        content: locale.claim.claimedBy.replace('[user]', interaction.user.toString())
      });

      const staffRoleId = roleId;
      await interaction.channel.permissionOverwrites.set([
        { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: interaction.channel.topic, allow: [PermissionFlagsBits.ViewChannel] },
        { id: staffRoleId, deny: [PermissionFlagsBits.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel] }
      ]);
    } else {
      await interaction.reply({
        content: locale.claim.notStaff,
        ephemeral: true
      });
    }
  }
};
const Locale = require('../locale/en.json');
const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { CustomClient } = require('../utils');
const { isAdmin } = require('../config-helper');
const fs = require('fs');

module.exports = {
  name: 'addsection',
  data: new SlashCommandBuilder()
    .setName('addsection')
    .setDescription(Locale.addSection.Description)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(option => 
      option
        .setName('section')
        .setDescription(Locale.addSection.SectionNameDescription)
        .setRequired(true)
    )
    .addRoleOption(option => 
      option
        .setName('role')
        .setDescription(Locale.addSection.RoleDescription)
        .setRequired(true)
    )
    .addStringOption(option => 
      option
        .setName('text')
        .setDescription('The welcome message text for this section')
        .setRequired(true)
    )
    .addAttachmentOption(option => 
      option
        .setName('image')
        .setDescription(Locale.addSection.imageDescription)
        .setRequired(true)
    )
    .addStringOption(option => 
      option
        .setName('emoji')
        .setDescription(Locale.addSection.emoji)
    ),
  
  async execute(client, interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: '❌ You do not have permission to use this command! You need to be an admin.', ephemeral: true });
    }

    const locale = Locale;
    
    await interaction.deferReply({ ephemeral: true }).catch(() => {});
    
    const sectionName = interaction.options.get('section');
    const role = interaction.options.get('role');
    const text = interaction.options.get('text');
    const image = interaction.options.get('image');
    const emoji = interaction.options.get('emoji');
    
    if (emoji) {
      const emojiRegex = /^(?:<a?:\w+:\d+>|[\p{Emoji}\p{Emoji_Presentation}\p{Extended_Pictographic}]+)$/u;
      if (!emojiRegex.test(emoji.value.trim())) {
        interaction.editReply({
          content: locale.addSection.emojiError,
          ephemeral: true
        });
        return;
      }
    }
    
    if (client.config.optionConfig[sectionName.value]) {
      interaction.editReply({
        content: locale.addSection.error,
        ephemeral: true
      });
      return;
    }
    
    client.config.optionConfig[sectionName.value] = {
      roleId: role.role.id,
      image: image.attachment.url,
      embedText: text.value
    };
    
    client.config.ticketOptions.push(
      emoji
        ? { label: sectionName.value, value: sectionName.value, emoji: emoji.value.trim() }
        : { label: sectionName.value, value: sectionName.value }
    );
    
    fs.writeFileSync(
      'config.json',
      JSON.stringify(client.config, null, 2),
      () => {}
    );
    
    interaction.editReply({
      content: locale.addSection.success,
      ephemeral: true
    });
  }
};

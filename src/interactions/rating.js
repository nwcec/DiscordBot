
const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'rating',
  async execute(client, interaction) {
    const locale = require('../locale/en.json');
    
    const stars = interaction.customId.split('*')[1];
    
    // Show modal for feedback comment
    const modal = new ModalBuilder()
      .setCustomId(`rating_comment*${stars}`)
      .setTitle(`${stars} Star Rating`);
    
    const commentInput = new TextInputBuilder()
      .setCustomId('comment')
      .setLabel('Additional Comments (Optional)')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false)
      .setPlaceholder('Share your thoughts about the support you received...')
      .setMaxLength(1000);
    
    const actionRow = new ActionRowBuilder().addComponents(commentInput);
    modal.addComponents(actionRow);
    
    await interaction.showModal(modal);
  }
};


const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'rating_comment',
  async execute(client, interaction) {
    if (!interaction.isModalSubmit()) return;
    
    const stars = interaction.customId.split('*')[1];
    const comment = interaction.fields.getTextInputValue('comment') || 'No additional comments';
    
    await interaction.deferUpdate();
    
    const channel = interaction.channel;
    
    // Send rating to log channel (separate from ticket close log)
    const logChannelId = client.config.tickets?.logChannelId || client.config.log;
    const logChannel = logChannelId ? interaction.guild.channels.cache.get(logChannelId) : null;
    if (logChannel) {
      const starDisplay = '⭐'.repeat(parseInt(stars));
      
      const ratingEmbed = new EmbedBuilder()
        .setTitle('⭐ Ticket Rating Received')
        .setColor('#FFD700')
        .addFields(
          { name: 'Ticket', value: channel.name, inline: true },
          { name: 'Rated By', value: `${interaction.user}`, inline: true },
          { name: 'Rating', value: `${starDisplay} (${stars}/5)`, inline: false },
          { name: 'Feedback', value: comment, inline: false }
        )
        .setTimestamp();
      
      await logChannel.send({ embeds: [ratingEmbed] });
    }
    
    // Thank the user
    await channel.send({
      content: `✅ Thank you for your feedback! This ticket will be deleted shortly.`
    });
    
    // Delete channel after 3 seconds
    setTimeout(async () => {
      try {
        await channel.delete();
      } catch (error) {
        console.error('Error deleting channel:', error);
      }
    }, 3000);
  }
};

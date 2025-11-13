const { Client, Interaction } = require('discord.js');

module.exports = {
  name: 'interactionCreate',
  async execute(client, interaction) {
    if (interaction.isCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (command) {
        try {
          await command.execute(client, interaction);
        } catch (error) {
          console.error(`Error executing command ${interaction.commandName}:`, error);
          const reply = { content: 'حدث خطأ أثناء تنفيذ هذا الأمر!', ephemeral: true };
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp(reply);
          } else {
            await interaction.reply(reply);
          }
        }
      }
      return;
    }
    
    if (interaction.isModalSubmit() && interaction.customId === 'close_reason') {
      const handler = client.interactions.get('close_reason');
      if (handler) handler.execute(client, interaction);
      return;
    }
    
    if (interaction.isModalSubmit() && interaction.customId.startsWith('rating_comment')) {
      const handler = client.interactions.get('rating_comment');
      if (handler) handler.execute(client, interaction);
      return;
    }
    
    if (!interaction.isAnySelectMenu() && !interaction.isButton() && !interaction.isModalSubmit()) {
      return;
    }
    
    const handler = client.interactions.get(interaction.customId.split('*')[0]);
    if (handler) handler.execute(client, interaction);
  }
};

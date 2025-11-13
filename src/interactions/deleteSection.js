const fs = require('fs');

const Locale = require('../locale/en.json');

module.exports = {
  name: 'delete_section',
  async execute(client, interaction) {
    const locale = Locale;
    
    await interaction.deferReply({ ephemeral: true }).catch(() => {});
    
    const selectedSection = interaction.values[0];
    
    delete client.config.optionConfig[selectedSection];
    client.config.ticketOptions = client.config.ticketOptions.filter(
      option => option.value !== selectedSection
    );
    
    fs.writeFileSync('config.json', JSON.stringify(client.config, null, 2));
    
    interaction.editReply({
      content: locale.deleteSection.success,
      ephemeral: true
    });
  }
};

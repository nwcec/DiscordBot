
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { generateHtmlPage } = require('../utils');
const fs = require('fs').promises;
const path = require('path');

module.exports = {
  name: 'close_reason',
  async execute(client, interaction) {
    const locale = require('../locale/en.json');
    
    if (!interaction.isModalSubmit()) return;
    
    const reason = interaction.fields.getTextInputValue('reason') || 'No reason provided';
    
    await interaction.deferUpdate();
    
    const channel = interaction.channel;
    const ticketData = await client.db.get('ticket-' + interaction.guild.id + '-' + channel.topic);
    
    // Update ticket data with close reason
    await client.db.set('ticket-' + interaction.guild.id + '-' + channel.topic, {
      ...ticketData,
      closedBy: interaction.user.id,
      closeReason: reason
    });
    
    // Generate HTML transcript
    const htmlTranscript = await generateHtmlPage(channel);
    
    // Get username for the filename
    const ticketCreator = await interaction.guild.members.fetch(channel.topic);
    const username = ticketCreator.user.username.replace(/[^a-zA-Z0-9]/g, '_');
    const timestamp = Date.now();
    const filename = `ticket-${username}-${timestamp}.html`;
    
    // Save transcript to Tickets folder
    const ticketsDir = path.join(__dirname, '../../Tickets');
    const filePath = path.join(ticketsDir, filename);
    
    try {
      await fs.mkdir(ticketsDir, { recursive: true });
      await fs.writeFile(filePath, htmlTranscript, 'utf8');
      console.log(`✅ Saved ticket transcript: ${filename}`);
    } catch (error) {
      console.error('Error saving ticket transcript:', error);
    }
    
    // Get the domain for the transcript URL
    const domain = process.env.REPL_SLUG ? 
      `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` : 
      'http://localhost:5000';
    const transcriptUrl = `${domain}/transcripts/${filename}`;
    
    // Send close log to log channel
    const logChannelId = client.config.tickets?.logChannelId || client.config.log;
    const logChannel = logChannelId ? interaction.guild.channels.cache.get(logChannelId) : null;
    if (logChannel) {
      const logEmbed = new EmbedBuilder()
        .setTitle('🔒 Ticket Closed')
        .setColor('#FF0000')
        .addFields(
          { name: 'Ticket', value: channel.name, inline: true },
          { name: 'Opened By', value: `<@${channel.topic}>`, inline: true },
          { name: 'Claimed By', value: ticketData?.claimed ? `<@${ticketData.claimed}>` : 'Not claimed', inline: true },
          { name: 'Closed By', value: `${interaction.user}`, inline: true },
          { name: 'Opened At', value: new Date(channel.createdTimestamp).toLocaleString(), inline: true },
          { name: 'Closed At', value: new Date().toLocaleString(), inline: true },
          { name: 'Reason', value: reason, inline: false }
        )
        .setTimestamp();
      
      // Add View Transcript button with dashboard URL
      const viewButton = new ButtonBuilder()
        .setURL(transcriptUrl)
        .setLabel('View Transcript')
        .setStyle(ButtonStyle.Link);
      
      const buttonRow = new ActionRowBuilder().addComponents(viewButton);
      
      await logChannel.send({ 
        embeds: [logEmbed],
        components: [buttonRow]
      });
    }
    
    // Lock the channel - remove send message and attach files permissions
    await channel.permissionOverwrites.edit(interaction.guild.id, {
      SendMessages: false,
      AttachFiles: false
    });
    
    // Also lock it for the ticket creator
    await channel.permissionOverwrites.edit(channel.topic, {
      SendMessages: false,
      AttachFiles: false
    });
    
    // Show rating buttons
    const ratingEmbed = new EmbedBuilder()
      .setTitle('⭐ Rate Your Support Experience')
      .setDescription('Please rate your support experience from 1 to 5 stars.\n\nThis channel will be deleted in 5 minutes if no rating is provided.')
      .setColor('#FFD700')
      .setFooter({ text: 'Your feedback helps us improve!' });
    
    const ratingButtons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rating*1')
        .setLabel('⭐')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('rating*2')
        .setLabel('⭐⭐')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('rating*3')
        .setLabel('⭐⭐⭐')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('rating*4')
        .setLabel('⭐⭐⭐⭐')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('rating*5')
        .setLabel('⭐⭐⭐⭐⭐')
        .setStyle(ButtonStyle.Primary)
    );
    
    await channel.send({ 
      embeds: [ratingEmbed], 
      components: [ratingButtons] 
    });
    
    // Auto-delete after 5 minutes if no rating
    setTimeout(async () => {
      try {
        const existingChannel = interaction.guild.channels.cache.get(channel.id);
        if (existingChannel) {
          await existingChannel.delete();
        }
      } catch (error) {
        console.error('Error auto-deleting channel:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes
  }
};

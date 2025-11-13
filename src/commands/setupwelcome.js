
const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require("discord.js");
const { loadConfig, isAdmin } = require("../config-helper");
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'setupwelcome',
    data: new SlashCommandBuilder()
        .setName('setupwelcome')
        .setDescription('Configure the welcome system for new members')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel where welcome messages will be sent')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
        .addStringOption(option =>
            option.setName('mention_text')
                .setDescription('Text to mention the user (use ${member} for mention, ${memberCount} for count)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('embed_message')
                .setDescription('Message in the embed (use ${member}, ${username}, ${serverName}, ${memberCount})')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('embed_color')
                .setDescription('Embed color in hex format (e.g., #FFD700)')
                .setRequired(false))
        .addChannelOption(option =>
            option.setName('rules_channel')
                .setDescription('Rules channel to mention (use ${rulesChannel} in message)')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false))
        .addChannelOption(option =>
            option.setName('support_channel')
                .setDescription('Support channel to mention (use ${supportChannel} in message)')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false)),
    
    async execute(client, interaction) {
        if (!isAdmin(interaction.member)) {
            return interaction.reply({ content: '❌ You do not have permission to use this command! You need to be an admin.', ephemeral: true });
        }

        const channel = interaction.options.getChannel('channel');
        const mentionText = interaction.options.getString('mention_text');
        const embedMessage = interaction.options.getString('embed_message');
        const embedColor = interaction.options.getString('embed_color');
        const rulesChannel = interaction.options.getChannel('rules_channel');
        const supportChannel = interaction.options.getChannel('support_channel');

        const config = loadConfig() || {};
        
        if (!config.welcome) {
            config.welcome = {};
        }

        config.welcome.channelId = channel.id;
        
        if (mentionText) {
            config.welcome.mentionText = mentionText;
        }
        
        if (embedMessage) {
            config.welcome.message = embedMessage;
        }
        
        if (embedColor) {
            if (!/^#[0-9A-F]{6}$/i.test(embedColor)) {
                return interaction.reply({ 
                    content: '❌ Invalid color format! Please use hex format like #FFD700', 
                    ephemeral: true 
                });
            }
            config.welcome.embedColor = embedColor;
        }
        
        if (rulesChannel) {
            config.welcome.rulesChannelId = rulesChannel.id;
        }
        
        if (supportChannel) {
            config.welcome.supportChannelId = supportChannel.id;
        }

        // حفظ التعديلات في ملف bot-config.json
        const configPath = path.join(__dirname, '../../bot-config.json');
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');

        let responseMessage = `✅ Welcome system configured successfully!\n\n`;
        responseMessage += `📢 **Welcome Channel:** ${channel}\n`;
        
        if (mentionText) {
            responseMessage += `💬 **Mention Text:** ${mentionText}\n`;
        }
        
        if (embedMessage) {
            responseMessage += `📝 **Embed Message:** ${embedMessage}\n`;
        }
        
        if (embedColor) {
            responseMessage += `🎨 **Embed Color:** ${embedColor}\n`;
        }
        
        if (rulesChannel) {
            responseMessage += `📋 **Rules Channel:** ${rulesChannel}\n`;
        }
        
        if (supportChannel) {
            responseMessage += `🎫 **Support Channel:** ${supportChannel}\n`;
        }

        await interaction.reply({ content: responseMessage, ephemeral: true });
    }
};

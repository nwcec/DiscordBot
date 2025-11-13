
const { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits } = require('discord.js');
const Locale = require('../locale/en.json');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'close',
  async execute(client, interaction) {
    const locale = Locale;
    const ticketData = await client.db.get('ticket-' + interaction.guild.id + '-' + interaction.channel.topic);

    // منع صاحب التذكرة من إغلاقها
    if (interaction.channel.topic == interaction.user.id) {
      await interaction.reply({
        content: '❌ You cannot close your own ticket! Only staff members can close tickets.',
        ephemeral: true
      });
      return;
    }

    // التحقق من أن المستخدم هو من استلم التذكرة أو أدمن
    let isAuthorized = false;

    // 1. التحقق من أن المستخدم استلم التذكرة
    if (ticketData?.claimed && ticketData.claimed === interaction.user.id) {
      isAuthorized = true;
    }

    // 2. التحقق من أن المستخدم أدمن (من الداشبورد)
    if (!isAuthorized) {
      try {
        const configPath = path.join(__dirname, '../..', 'bot-config.json');
        const configData = fs.readFileSync(configPath, 'utf8');
        const botConfig = JSON.parse(configData);
        const adminRoleIds = botConfig.adminRoleIds || [];

        // التحقق من أن المستخدم لديه أحد أدوار الأدمن
        const hasAdminRole = adminRoleIds.some(roleId => 
          interaction.member.roles.cache.has(roleId)
        );

        if (hasAdminRole) {
          isAuthorized = true;
        }
      } catch (err) {
        console.log('Error loading bot-config.json for close permission check:', err.message);
      }
    }

    // 3. التحقق من صلاحية Administrator (احتياطي)
    if (!isAuthorized && interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      isAuthorized = true;
    }

    // إذا لم يكن مصرح له، رفض الطلب
    if (!isAuthorized) {
      await interaction.reply({
        content: '❌ You do not have permission to close this ticket! Only the staff member who claimed it or admins can close tickets.',
        ephemeral: true
      });
      return;
    }

    // إذا كان مصرح له، عرض نموذج سبب الإغلاق
    const modal = new ModalBuilder()
      .setCustomId('close_reason')
      .setTitle(locale.close.confirm);
    
    const reasonInput = new TextInputBuilder()
      .setCustomId('reason')
      .setLabel(locale.close.reason)
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false)
      .setPlaceholder(locale.close.reasonPlaceholder);
    
    const actionRow = new ActionRowBuilder().addComponents(reasonInput);
    modal.addComponents(actionRow);
    
    await interaction.showModal(modal);
  }
};

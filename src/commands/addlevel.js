const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { query } = require("../database");
const { isAdmin } = require("../config-helper");

module.exports = {
    name: 'addlevel',
    data: new SlashCommandBuilder()
        .setName('addlevel')
        .setDescription('Add levels to a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to add levels to')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Number of levels to add')
                .setRequired(true)
                .setMinValue(1))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(client, interaction) {
        if (!isAdmin(interaction.member)) {
            return interaction.reply({ content: 'You do not have permission to use this command! You need to be an admin.', ephemeral: true });
        }

        const user = interaction.options.getUser('user');
        const levelArgs = interaction.options.getInteger('amount');
        const member = interaction.guild.members.cache.get(user.id);

        if (!member) {
            return interaction.reply({ content: 'User not found in this server!', ephemeral: true });
        }

        try {
            const scoreResult = await query('SELECT * FROM levels WHERE "user" = $1 AND guild = $2', [user.id, interaction.guild.id]);
            let score = scoreResult.rows[0];
            
            if (!score) {
                score = {
                    id: `${user.id}-${interaction.guild.id}`,
                    user: user.id,
                    guild: interaction.guild.id,
                    xp: 0,
                    level: 0,
                    totalXP: 0
                };
            }

            const oldLevel = score.level;
            score.level += levelArgs;
            
            let totalXPToAdd = 0;
            for (let i = 0; i < levelArgs; i++) {
                const currentLevel = oldLevel + i;
                totalXPToAdd += currentLevel * 2 * 250 + 250;
            }
            score.totalXP = (score.totalXP || 0) + totalXPToAdd;

            await query(
                'INSERT INTO levels (id, "user", guild, xp, level, "totalXP") VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO UPDATE SET xp = $4, level = $5, "totalXP" = $6',
                [score.id, score.user, score.guild, score.xp, score.level, score.totalXP]
            );

            let embed = new EmbedBuilder()
                .setTitle('✅ Level Added Successfully!')
                .setDescription(`Added ${levelArgs} level(s) to ${user.toString()}!\n\n**Previous Level:** ${oldLevel}\n**New Level:** ${score.level}`)
                .setColor('#00FF00')
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in addlevel command:', error);
            return interaction.reply({ content: 'An error occurred while adding levels. Please try again.', ephemeral: true });
        }
    }
};

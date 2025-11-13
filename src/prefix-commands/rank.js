
const { EmbedBuilder, AttachmentBuilder } = require("discord.js");
const { query } = require("../database");
const { getCommandConfig, isAdmin } = require("../config-helper");
const canvacord = require("canvacord");
const { join } = require("path");
const Canvas = require("canvas");

module.exports = {
    name: 'rank',
    aliases: ['level', 'xp'],
    category: "Leveling",
    description: "View rank card with XP/level",
    cooldown: 3,
    async execute(message, args) {
        try {
            const { isCommandAllowedInChannel, isAdmin } = require("../config-helper");
            
            // Check if command is allowed in this channel
            const commandAllowed = isCommandAllowedInChannel('rank', message.channel.id);
            const userIsAdmin = isAdmin(message.member);
            
            // If not allowed in this channel and user is not admin, silently return
            if (!commandAllowed && !userIsAdmin) {
                return;
            }
            let userArray = message.content.split(" ");
            let userArgs = userArray.slice(1);
            let user = message.mentions.members.first() || 
                       message.guild.members.cache.get(userArgs[0]) || 
                       message.guild.members.cache.find(x => x.user.username.toLowerCase() === userArgs.slice(0).join(" ") || x.user.username === userArgs[0]) ||
                       message.member;

            const scoreResult = await query('SELECT * FROM levels WHERE "user" = $1 AND guild = $2', [user.id, message.guild.id]);
            let score = scoreResult.rows[0];

        if (!score) {
            score = {
                id: `${message.guild.id}-${user.id}`,
                user: user.id,
                guild: message.guild.id,
                xp: 0,
                level: 0,
                totalXP: 0
            };
            await query(
                'INSERT INTO levels (id, "user", guild, xp, level, "totalXP") VALUES ($1, $2, $3, $4, $5, $6)',
                [score.id, score.user, score.guild, score.xp, score.level, score.totalXP]
            );
        }

        const allLevelsResult = await query('SELECT * FROM levels WHERE guild = $1 ORDER BY "totalXP" DESC', [message.guild.id]);
        const allLevels = allLevelsResult.rows;
        let currentRank = allLevels.findIndex(lvl => lvl.user === user.id) + 1;

        const cardResult = await query('SELECT * FROM rankCardTable WHERE "user" = $1 AND guild = $2', [user.id, message.guild.id]);
        let cardSettings = cardResult.rows[0];

        if (!cardSettings) {
            cardSettings = {
                textcolor: "#beb1b1",
                barcolor: "#838383",
                backgroundcolor: "#36393f"
            };
        }

        const nextXP = score.level * 2 * 250 + 250;

        try {
            const wallpaperPath = join(__dirname, "..", "assets", "wallpaper.png");
            
            const displayName = user.user.username;
            const rank = new canvacord.Rank()
                .setAvatar(user.user.displayAvatarURL({ extension: 'png', size: 512 }))
                .setCurrentXP(score.xp)
                .setRequiredXP(nextXP)
                .setStatus(user.presence?.status || "offline")
                .setProgressBar("#FFD700", "COLOR")
                .setUsername(displayName)
                .setLevel(score.level)
                .setRank(currentRank)
                .setOverlay("#00000000")
                .setBackground("IMAGE", wallpaperPath);

            let buffer = await rank.build();
            
            // Add gold border around avatar
            const rankCard = await Canvas.loadImage(buffer);
            const canvas = Canvas.createCanvas(rankCard.width, rankCard.height);
            const ctx = canvas.getContext('2d');
            
            // Draw the rank card
            ctx.drawImage(rankCard, 0, 0);
            
            // Draw gold border around avatar - radius 114 to fit inside perfectly
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.arc(135, 145, 100, 0, Math.PI * 2);
            ctx.stroke();
            
            buffer = canvas.toBuffer('image/png');
            const attachment = new AttachmentBuilder(buffer, { name: 'rank.png' });

            await message.channel.send({ files: [attachment] });
        } catch (error) {
            console.error('Error generating rank card:', error);
            
            const displayName = user.user.username;
            let embed = new EmbedBuilder()
                .setTitle(`${displayName}'s Rank`)
                .setColor('#FFD700')
                .addFields(
                    { name: 'Level', value: `${score.level}`, inline: true },
                    { name: 'XP', value: `${score.xp} / ${nextXP}`, inline: true },
                    { name: 'Rank', value: `#${currentRank}`, inline: true }
                )
                .setThumbnail(user.user.displayAvatarURL());

            await message.channel.send({ embeds: [embed] });
        }
        } catch (error) {
            console.error('Error in rank command:', error);
            return message.reply("❌ There was an error generating your rank card. Please try again later.");
        }
    }
};

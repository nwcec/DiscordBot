
const { AttachmentBuilder } = require("discord.js");
const { query } = require("../database");
const { getCommandConfig, isAdmin } = require("../config-helper");
const Canvas = require("canvas");
const { join } = require("path");

module.exports = {
    name: 'leaderboard',
    aliases: ['lb', 'top'],
    category: "Leveling",
    description: "View the top users on the server",
    cooldown: 3,
    async execute(message, args) {
        try {
            const { isCommandAllowedInChannel, isAdmin } = require("../config-helper");
            
            // Check if command is allowed in this channel
            const commandAllowed = isCommandAllowedInChannel('leaderboard', message.channel.id);
            const userIsAdmin = isAdmin(message.member);
            
            // If not allowed in this channel and user is not admin, silently return
            if (!commandAllowed && !userIsAdmin) {
                return;
            }
            const top10Result = await query('SELECT * FROM levels WHERE guild = $1 ORDER BY "level" DESC, "totalXP" DESC LIMIT 10', [message.guild.id]);
            const top10 = top10Result.rows;

        if (top10.length < 1) {
            return message.reply("There are no users in the leaderboard yet!");
        }

        try {
            const width = 800;
            const height = 1100;
            const rowHeight = 100;
            const headerHeight = 80;

            const canvas = Canvas.createCanvas(width, height);
            const ctx = canvas.getContext('2d');

            // Load wallpaper background
            const wallpaperPath = join(__dirname, "..", "assets", "leaderboard.png");
            let background;
            try {
                background = await Canvas.loadImage(wallpaperPath);
                ctx.drawImage(background, 0, 0, width, height);
            } catch (err) {
                // Fallback to solid background if wallpaper not found
                ctx.fillStyle = '#2C2F33';
                ctx.fillRect(0, 0, width, height);
            }

            // Draw semi-transparent overlay
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(0, 0, width, height);

            // Draw header
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 30px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`${message.guild.name} - Top 10 Leaderboard`, width / 2, 50);

            // Draw each user
            for (let i = 0; i < top10.length; i++) {
                const data = top10[i];
                const y = headerHeight + (i * rowHeight);
                
                // Draw row background (alternating colors)
                ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.1)';
                ctx.fillRect(10, y + 5, width - 20, rowHeight - 10);

                // Draw rank number
                ctx.fillStyle = i < 3 ? '#FFD700' : '#FFFFFF';
                ctx.font = 'bold 32px sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText(`#${i + 1}`, 30, y + 60);

                // Load and draw avatar
                let avatar;
                try {
                    const user = await message.client.users.fetch(data.user);
                    avatar = await Canvas.loadImage(user.displayAvatarURL({ extension: 'png', size: 128 }));
                } catch (err) {
                    // Use default avatar if user fetch fails
                    avatar = await Canvas.loadImage('https://cdn.discordapp.com/embed/avatars/0.png');
                }

                // Draw avatar circle
                const avatarX = 150;
                const avatarY = y + 47;
                const avatarRadius = 35;

                ctx.save();
                ctx.beginPath();
                ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2);
                ctx.closePath();
                ctx.clip();
                ctx.drawImage(avatar, avatarX - avatarRadius, avatarY - avatarRadius, avatarRadius * 2, avatarRadius * 2);
                ctx.restore();

                // Draw gold border around avatar
                ctx.strokeStyle = '#FFD700';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2);
                ctx.stroke();

                // Draw username (use display name)
                let displayName;
                try {
                    const user = await message.client.users.fetch(data.user);
                    displayName = user.username;
                    } catch (err) {
                    displayName = `User ${data.user}`;
                }

                ctx.fillStyle = '#FFFFFF';
                ctx.font = 'bold 24px sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText(displayName.substring(0, 20), 210, y + 55);

                // Draw level
                ctx.fillStyle = '#FFD700';
                ctx.font = 'bold 28px sans-serif';
                ctx.textAlign = 'right';
                ctx.fillText(`Level ${data.level}`, width - 30, y + 55);
            }

            // Convert to buffer and send
            const buffer = canvas.toBuffer('image/png');
            const attachment = new AttachmentBuilder(buffer, { name: 'leaderboard.png' });

            await message.channel.send({ files: [attachment] });

        } catch (error) {
            console.error('Error generating leaderboard image:', error);
            return message.reply("❌ There was an error generating the leaderboard image. Please try again later.");
        }
        } catch (error) {
            console.error('Error in leaderboard command:', error);
            return message.reply("❌ There was an error processing your request. Please try again later.");
        }
    }
};
            

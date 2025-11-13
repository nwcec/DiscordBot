
const { createCanvas, loadImage, registerFont } = require('canvas');
const { AttachmentBuilder } = require('discord.js');
const GIFEncoder = require('gif-encoder');
const { join } = require('path');
const { readdirSync } = require('fs');

registerFont(join(__dirname, '../assets/fonts/Roboto-Medium.ttf'), { family: 'Roboto Medium' });

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 320;
const AVATAR_WIDTH = 150;
const AVATAR_BORDER_WIDTH = 5;

class WelcomeService {
  constructor() {
    this.backgroundPath = join(__dirname, '../assets/backgrounds/arccorp');
    this.isGenerating = false;
    this.queue = [];
    this.backgroundImages = [];
  }

  async generateWelcomeImage(member) {
    return new Promise((resolve, reject) => {
      this.queue.push({ member, resolve, reject });
      if (!this.isGenerating) {
        this.processQueue();
      }
    });
  }

  async processQueue() {
    if (this.queue.length === 0) {
      this.isGenerating = false;
      return;
    }

    this.isGenerating = true;
    const { member, resolve, reject } = this.queue.shift();

    try {
      const attachment = await this.createAnimatedWelcome(member);
      resolve(attachment);
    } catch (error) {
      reject(error);
    }

    this.processQueue();
  }

  async preloadBackgroundSequence() {
    if (this.backgroundImages.length === 0) {
      const allBackgroundFiles = readdirSync(this.backgroundPath)
        .filter(f => f.endsWith('.png'))
        .sort();
      
      for (const file of allBackgroundFiles) {
        const image = await loadImage(join(this.backgroundPath, file));
        this.backgroundImages.push(image);
      }
    }
  }

  drawBackgroundOverlay(ctx) {
    const grd = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    grd.addColorStop(0.0, 'rgba(255, 215, 0, 0.3)');
    grd.addColorStop(0.5, 'rgba(0, 0, 0, 0.0)');
    grd.addColorStop(1.0, 'rgba(192, 192, 192, 0.3)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  drawAvatarBorderOuter(ctx) {
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.9)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2,
      (AVATAR_WIDTH / 2) + (AVATAR_BORDER_WIDTH + 5),
      0,
      Math.PI * 2
    );
    ctx.closePath();
    ctx.stroke();
  }

  drawAvatarBorder(ctx) {
    ctx.fillStyle = 'rgba(192, 192, 192, 0.85)';
    ctx.beginPath();
    ctx.arc(
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2,
      (AVATAR_WIDTH / 2) + AVATAR_BORDER_WIDTH,
      0,
      Math.PI * 2
    );
    ctx.closePath();
    ctx.fill();
  }

  drawAvatarClippingMask(ctx) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2,
      AVATAR_WIDTH / 2,
      0,
      Math.PI * 2
    );
    ctx.closePath();
    ctx.clip();
  }

  drawAvatar(ctx, avatar) {
    const posX = (CANVAS_WIDTH / 2) - (AVATAR_WIDTH / 2);
    const posY = (CANVAS_HEIGHT / 2) - (AVATAR_WIDTH / 2);
    ctx.drawImage(avatar, posX, posY, AVATAR_WIDTH, AVATAR_WIDTH);
  }

  drawAvatarGlow(ctx) {
    const posX = (CANVAS_WIDTH / 2) - (AVATAR_WIDTH / 2);
    const posY = (CANVAS_HEIGHT / 2) - (AVATAR_WIDTH / 2);

    const grd = ctx.createRadialGradient(
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2,
      0,
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2,
      AVATAR_WIDTH / 2
    );

    grd.addColorStop(0.6, 'rgba(255, 215, 0, 0.0)');
    grd.addColorStop(1.0, 'rgba(255, 215, 0, 0.4)');

    ctx.fillStyle = grd;
    ctx.fillRect(posX, posY, AVATAR_WIDTH, AVATAR_WIDTH);
    ctx.restore();
  }

  applyText(ctx, text, initFontSize) {
    let fontSize = initFontSize;
    do {
      ctx.font = `${fontSize -= 10}px Roboto Medium`;
    } while (ctx.measureText(text).width > CANVAS_WIDTH - 50);
  }

  drawTextLine1(ctx, text) {
    // Remove any special Unicode characters that might cause rendering issues
    const cleanText = text.replace(/[\u0300-\u036f\u0489\u0591-\u05bd\u05bf\u05c1-\u05c2\u05c4-\u05c5\u05c7\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06dc\u06df-\u06e4\u06e7-\u06e8\u06ea-\u06ed\u0711\u0730-\u074a\u07a6-\u07b0\u07eb-\u07f3\u0816-\u0819\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0859-\u085b\u08e3-\u0903\u093a-\u093c\u093e-\u094f\u0951-\u0957\u0962-\u0963\u0981-\u0983\u09bc\u09be-\u09c4\u09c7-\u09c8\u09cb-\u09cd\u09d7\u09e2-\u09e3\u0a01-\u0a03\u0a3c\u0a3e-\u0a42\u0a47-\u0a48\u0a4b-\u0a4d\u0a51\u0a70-\u0a71\u0a75\u0a81-\u0a83\u0abc\u0abe-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ae2-\u0ae3\u0b01-\u0b03\u0b3c\u0b3e-\u0b44\u0b47-\u0b48\u0b4b-\u0b4d\u0b56-\u0b57\u0b62-\u0b63\u0b82\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd7\u0c00-\u0c03\u0c3e-\u0c44\u0c46-\u0c48\u0c4a-\u0c4d\u0c55-\u0c56\u0c62-\u0c63\u0c81-\u0c83\u0cbc\u0cbe-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5-\u0cd6\u0ce2-\u0ce3\u0d01-\u0d03\u0d3e-\u0d44\u0d46-\u0d48\u0d4a-\u0d4d\u0d57\u0d62-\u0d63\u0d82-\u0d83\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0df2-\u0df3\u0e31\u0e34-\u0e3a\u0e47-\u0e4e\u0eb1\u0eb4-\u0eb9\u0ebb-\u0ebc\u0ec8-\u0ecd\u0f18-\u0f19\u0f35\u0f37\u0f39\u0f3e-\u0f3f\u0f71-\u0f84\u0f86-\u0f87\u0f8d-\u0f97\u0f99-\u0fbc\u0fc6\u102b-\u103e\u1056-\u1059\u105e-\u1060\u1062-\u1064\u1067-\u106d\u1071-\u1074\u1082-\u108d\u108f\u109a-\u109d\u135d-\u135f\u1712-\u1714\u1732-\u1734\u1752-\u1753\u1772-\u1773\u17b4-\u17d3\u17dd\u180b-\u180d\u18a9\u1920-\u192b\u1930-\u193b\u1a17-\u1a1b\u1a55-\u1a5e\u1a60-\u1a7c\u1a7f\u1ab0-\u1abe\u1b00-\u1b04\u1b34-\u1b44\u1b6b-\u1b73\u1b80-\u1b82\u1ba1-\u1bad\u1be6-\u1bf3\u1c24-\u1c37\u1cd0-\u1cd2\u1cd4-\u1ce8\u1ced\u1cf2-\u1cf4\u1cf8-\u1cf9\u1dc0-\u1df5\u1dfc-\u1dff\u20d0-\u20f0\u2cef-\u2cf1\u2d7f\u2de0-\u2dff\u302a-\u302f\u3099-\u309a\ua66f-\ua672\ua674-\ua67d\ua69e-\ua69f\ua6f0-\ua6f1\ua802\ua806\ua80b\ua823-\ua827\ua880-\ua881\ua8b4-\ua8c4\ua8e0-\ua8f1\ua926-\ua92d\ua947-\ua953\ua980-\ua983\ua9b3-\ua9c0\ua9e5\uaa29-\uaa36\uaa43\uaa4c-\uaa4d\uaa7b-\uaa7d\uaab0\uaab2-\uaab4\uaab7-\uaab8\uaabe-\uaabf\uaac1\uaaeb-\uaaef\uaaf5-\uaaf6\uabe3-\uabea\uabec-\uabed\ufb1e\ufe00-\ufe0f\ufe20-\ufe2f]/g, '');
    
    this.applyText(ctx, cleanText, 40);
    const gradient = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, 0);
    gradient.addColorStop(0, '#FFD700');
    gradient.addColorStop(1, '#C0C0C0');
    ctx.fillStyle = gradient;
    const posX = (CANVAS_WIDTH / 2) - (ctx.measureText(cleanText).width / 2);
    ctx.fillText(cleanText, posX, 35);
  }

  drawTextLine2(ctx, text) {
    this.applyText(ctx, text, 35);
    const gradient = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, 0);
    gradient.addColorStop(0, '#C0C0C0');
    gradient.addColorStop(1, '#C0C0C0');
    ctx.fillStyle = gradient;
    const posX = (CANVAS_WIDTH / 2) - (ctx.measureText(text).width / 2);
    ctx.fillText(text, posX, CANVAS_HEIGHT - 17);
  }

  async createAnimatedWelcome(member) {
    try {
      const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
      const ctx = canvas.getContext('2d', { alpha: true });
      const encoder = new GIFEncoder(CANVAS_WIDTH, CANVAS_HEIGHT);

      encoder.setRepeat(0);
      encoder.setDelay(42);
      encoder.setQuality(15);
      encoder.writeHeader();

      const buffers = [];
      const attachmentPromise = new Promise((resolve, reject) => {
        encoder.on('data', (buffer) => buffers.push(buffer));
        encoder.on('end', () => {
          console.log('stream complete!');
          resolve(new AttachmentBuilder(Buffer.concat(buffers), { name: 'welcome.gif' }));
        });
        encoder.on('error', (err) => {
          console.error('GIF encoder error:', err);
          reject(err);
        });
      });

      await this.preloadBackgroundSequence();
      const avatar = await loadImage(member.user.displayAvatarURL({ extension: 'png', size: 128 }));

      console.log('capturing frames...');
      for (let i = 0; i < this.backgroundImages.length; i++) {
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        
        // Draw background
        ctx.drawImage(this.backgroundImages[i], 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        
        // Draw gradient overlay
        this.drawBackgroundOverlay(ctx);
        
        // Draw text lines
        this.drawTextLine1(ctx, `${member.displayName}`);
       // this.drawTextLine2(ctx, `Welcome To The Server!`);
        
        // Draw avatar with borders and glow
        this.drawAvatarBorderOuter(ctx);
        this.drawAvatarBorder(ctx);
        this.drawAvatarClippingMask(ctx);
        this.drawAvatar(ctx, avatar);
        this.drawAvatarGlow(ctx);

        const imageData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        encoder.addFrame(imageData.data);
      }

      encoder.finish();
      
      return await attachmentPromise;
    } catch (error) {
      console.error('Error creating animated welcome:', error);
      throw error;
    }
  }

  createWelcomeContent(member, attachment, config = null) {
    const { EmbedBuilder } = require('discord.js');
    
    let mentionText = `Welcome to DT Organization! <@${member.id}> 👋`;
    let embedMessage = `Please check the rules here: <#1427686496961560711>\nFor assistance, open: <#1428078957726535772>\nNumber: ${member.guild.memberCount}`;
    let color = '#FFD700';
    
    if (config && config.welcome) {
      if (config.welcome.mentionText) {
        mentionText = config.welcome.mentionText
          .replace(/\$\{member\}/g, `<@${member.id}>`)
          .replace(/\$\{memberCount\}/g, member.guild.memberCount)
          .replace(/\$\{username\}/g, member.user.username)
          .replace(/\$\{serverName\}/g, member.guild.name);
      }
      if (config.welcome.message) {
        embedMessage = config.welcome.message
          .replace(/\$\{member\}/g, `<@${member.id}>`)
          .replace(/\$\{memberCount\}/g, member.guild.memberCount)
          .replace(/\$\{username\}/g, member.user.username)
          .replace(/\$\{serverName\}/g, member.guild.name)
          .replace(/\$\{rulesChannel\}/g, config.welcome.rulesChannelId ? `<#${config.welcome.rulesChannelId}>` : '')
          .replace(/\$\{supportChannel\}/g, config.welcome.supportChannelId ? `<#${config.welcome.supportChannelId}>` : '');
      }
      if (config.welcome.embedColor) {
        color = config.welcome.embedColor;
      }
    }
    
    const embed = new EmbedBuilder()
      .setColor(color)
      .setImage('attachment://welcome.gif')
      .setDescription(embedMessage);
    
    return {
      content: mentionText,
      embed: embed
    };
  }
}

module.exports = WelcomeService;

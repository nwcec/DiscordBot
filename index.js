require('dotenv').config();
const { Client, GatewayIntentBits, AttachmentBuilder } = require('discord.js');
const fetch = require('node-fetch');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const CHAT_CHANNEL = process.env.CHAT_BOT_CHANNEL;
let chatActiveUsers = new Set();

const TEXT_API = "https://text.pollinations.ai";
const IMAGE_PROMPT_API = "https://text.pollinations.ai/prompt";

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
  try {
    if (message.author.bot) return;
    if (message.channel.id !== CHAT_CHANNEL) return;

    const content = message.content.trim();

    // أوامر التحكم
    if (content === '!chat') {
      if (chatActiveUsers.has(message.author.id)) {
        message.reply("أنت بالفعل في محادثة. أرسل لي رسالة أو صورة.");
      } else {
        chatActiveUsers.add(message.author.id);
        message.reply("تم بدء المحادثة معك. ارسل رسالة نصية أو صورة.");
      }
      return;
    }

    if (content === '!end') {
      if (chatActiveUsers.has(message.author.id)) {
        chatActiveUsers.delete(message.author.id);
        message.reply("تم إنهاء المحادثة. شكراً لك!");
      } else {
        message.reply("لم تبدأ محادثة بعد، ارسل !chat للبدء.");
      }
      return;
    }

    if (!chatActiveUsers.has(message.author.id)) return;

    await message.channel.sendTyping();

    // دعم أمر توليد صورة من وصف نصي !image وصف هنا
    if (content.startsWith('!image ')) {
      const prompt = content.slice(7).trim();
      if (!prompt) {
        message.reply("يرجى كتابة وصف الصورة بعد الأمر.");
        return;
      }
      const imageUrl = `${IMAGE_PROMPT_API}/${encodeURIComponent(prompt)}`;
      message.reply(`ها هي صورتك:\n${imageUrl}`);
      return;
    }

    // دعم رفع صورة وتعديلها مع رسالة نصية في نفس الرسالة
    if (message.attachments.size > 0) {
      // فقط أول صورة
      const attachment = message.attachments.first();
      if (attachment.contentType && attachment.contentType.startsWith('image/')) {
        // نرسل رابط الصورة المرفوعة إلى API التعديل (حسب الرابط اللي أعطيتني)
        const imageUrl = attachment.url;

        // API التعديل مع رفع الصورة (حسب الرابط https://text.pollinations.ai/{image})
        // هنا من الصعب رفع الصورة مباشرة عبر GET لذلك نستخدم الرابط كموجه
        // نفترض أن البوت يرسل رسالة مع رابط التعديل بناءً على رابط الصورة المرفوعة
        const editUrl = `${TEXT_API}/${encodeURIComponent(imageUrl)}`;

        // نأخذ نص الرسالة بدون الصورة (في حال فيها نص مع الصورة)
        const text = content.replace(/<.*>/g, '').trim() || "بدون وصف";

        message.reply(`تم استلام الصورة، لتحريرها استخدم هذا الرابط:\n${editUrl}\nمع الوصف: ${text}`);
        return;
      }
    }

    // رسائل نصية عادية (دردشة)
    const encodedText = encodeURIComponent(content);
    const url = `${TEXT_API}/${encodedText}`;

    const response = await fetch(url);
    if (!response.ok) {
      message.reply("عذرًا، حدث خطأ في جلب الرد من API.");
      return;
    }

    const reply = await response.text();

    if (reply.length > 2000) {
      const buffer = Buffer.from(reply, 'utf8');
      const txtFile = new AttachmentBuilder(buffer, { name: `${message.author.tag}_response.txt` });

      message.reply({ files: [txtFile] }).catch(() => {
        message.channel.send({ content: `${message.author}`, files: [txtFile] });
      });
    } else {
      message.reply(reply).catch(() => {
        message.channel.send(`${message.author} ${reply}`);
      });
    }

  } catch (error) {
    console.error(error);
    message.reply("حدث خطأ، حاول مرة أخرى لاحقًا.");
  }
});

client.login(process.env.TOKEN);

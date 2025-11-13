const fs = require('fs');
const path = require('path');

// مسار ملف bot-config.json في جذر المشروع
const CONFIG_FILE = path.join(__dirname, '..', 'bot-config.json');

let cachedConfig = null;
let lastModified = 0;

// 🔹 تحميل الملف وتحديث الكاش إذا تغير
function loadConfig() {
    try {
        const stats = fs.statSync(CONFIG_FILE);
        if (stats.mtimeMs > lastModified || !cachedConfig) {
            const data = fs.readFileSync(CONFIG_FILE, 'utf8');
            cachedConfig = JSON.parse(data);
            lastModified = stats.mtimeMs;
            console.log('[CONFIG] bot-config.json تم تحميله / تحديثه');
        }
        return cachedConfig;
    } catch (error) {
        console.error('[CONFIG] خطأ في تحميل bot-config.json:', error.message);
        return null;
    }
}

// 🔹 جلب إعدادات أمر محدد
function getCommandConfig(commandName) {
    const config = loadConfig();
    if (!config || !config.commands || !config.commands[commandName]) {
        return null;
    }
    return config.commands[commandName];
}

// 🔹 جلب admin role IDs من الملف
function getAdminRoleIds() {
    const config = loadConfig();
    if (!config || !config.adminRoleIds || !Array.isArray(config.adminRoleIds)) {
        return [];
    }
    return config.adminRoleIds;
}


// 🔹 جلب admin IDs (user IDs) من الملف - للتوافق مع الأوامر القديمة
function getAdminIds() {
    const config = loadConfig();
    if (!config || !config.adminIds || !Array.isArray(config.adminIds)) {
        return [];
    }
    return config.adminIds;
}

// 🔹 جلب Server ID من الملف
function getServerId() {
    const config = loadConfig();
    if (!config) return null;
    return config.serverId || null;
}

// 🔹 جلب رسالة معينة من ملف الإعداد مع استبدال المتغيرات داخلها
function getMessage(commandName, messageKey, variables = {}) {
    const cmdConfig = getCommandConfig(commandName);
    if (!cmdConfig || !cmdConfig.messages || !cmdConfig.messages[messageKey]) {
        return null;
    }

    let message = cmdConfig.messages[messageKey];

    for (const [key, value] of Object.entries(variables)) {
        message = message.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value);
        message = message.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }

    return message;
}

// 🔹 التحقق مما إذا كان الأمر مسموحًا في قناة معينة
function isCommandAllowedInChannel(commandName, channelId) {
    const cmdConfig = getCommandConfig(commandName);
    if (!cmdConfig || !cmdConfig.allowedChannels || cmdConfig.allowedChannels.length === 0) {
        return true;
    }
    return cmdConfig.allowedChannels.includes(channelId);
}

// 🔹 Check if user is admin (by role IDs only)
function isAdmin(member) {
    // التحقق من وجود member والصلاحيات الأساسية
    if (!member || !member.roles || !member.roles.cache) {
        return false;
    }

    const config = loadConfig();
    if (!config) return false;

    // Check admin role IDs
    if (config.adminRoleIds && Array.isArray(config.adminRoleIds)) {
        const roleIds = config.adminRoleIds.filter(id => id && id.trim());
        if (roleIds.some(id => member.roles.cache.has(id.trim()))) {
            return true;
        }
    }

    return false;
}

// 🔹 التحقق من صلاحية العضو بناءً على أدواره
function hasPermission(member, commandName) {
    return isAdmin(member);
}

// 🔹 التصدير
module.exports = {
    loadConfig,
    getCommandConfig,
    getAdminRoleIds,
    getAdminIds,
    getServerId,
    getMessage,
    isCommandAllowedInChannel,
    hasPermission,
    isAdmin
};

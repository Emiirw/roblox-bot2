
require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const express = require("express");
const noblox = require("noblox.js");

const app = express();
const PORT = process.env.PORT || 3000;


const rankMap = {
    
    "OR-1": 1,
    "OR-2": 2,
    "OR-3": 3,
    "OR-4": 4,
    "OR-5": 5,
    "OR-6": 6,
    "OR-7": 7,
    "OR-8": 8,
    "OR-9": 9,

    
    "OF-1": 10,
    "OF-2": 11,
    "OF-3": 12,
    "OF-4": 13,
    "OF-5": 14,
    "OF-6": 15,
    "OF-7": 16,
    "OF-8": 17,
    "OF-9": 18,
};

app.get("/", (req, res) => {
    res.status(200).send("Bot aktif 🔥");
});

app.listen(PORT, () => {
    console.log(`Web server ${PORT} portunda çalışıyor`);
});

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

client.once("ready", async () => {
    console.log(`${client.user.tag} aktif!`);
    try {
        await noblox.setCookie(process.env.ROBLOX_COOKIE);
        console.log("Roblox hesabına giriş yapıldı!");
    } catch (err) {
        console.error("Roblox Cookie hatası:", err);
    }
});

client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith("!rdegis")) return;
    if (!message.member.permissions.has("Administrator")) return;

    const args = message.content.split(" ");
    const username = args[1];
    const rankInput = args[2]?.toUpperCase(); 

    if (!username || !rankInput) {
        return message.reply("❌ **Kullanım:** `!rdegis kullanıcıadı OF-2` (veya OR-1 vb.)");
    }

    
    const targetRankId = rankMap[rankInput];

    if (!targetRankId) {
        return message.reply(`❌ **Geçersiz Rütbe!** Lütfen geçerli bir rütbe girin (Örn: OR-1, OF-5).`);
    }

    try {
        const userId = await noblox.getIdFromUsername(username);
        
        // Rütbeyi değiştir
        await noblox.setRank(parseInt(process.env.GROUP_ID), userId, targetRankId);

        message.reply(`✅ **${username}** adlı kullanıcının rütbesi başarıyla **${rankInput}** (ID: ${targetRankId}) olarak değiştirildi.`);
    } catch (err) {
        console.error(err);
        message.reply("⚠️ Bir hata oluştu! Kullanıcı adını kontrol edin eğer yine olmuyorsa bot yetkisinde sorun vardır.");
    }
});

client.login(process.env.DISCORD_TOKEN);

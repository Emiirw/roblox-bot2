
require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const express = require("express");
const noblox = require("noblox.js");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.status(200).send("Bot aktif 🔥");
});

app.listen(PORT);

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

client.once("ready", async () => {
  console.log("Discord bot aktif!");

  await noblox.setCookie(process.env.ROBLOX_COOKIE);
  console.log("Roblox giriş yapıldı!");
});

client.on("messageCreate", async (message) => {
  if (!message.content.startsWith("!rdegis")) return;
  if (!message.member.permissions.has("Administrator")) return;

  const args = message.content.split(" ");
  const username = args[1];
  const rankId = parseInt(args[2]);

  if (!username || !rankId) {
    return message.reply("Kullanım: !rdegis kullaniciadi rankID");
  }

  try {
    const userId = await noblox.getIdFromUsername(username);
    await noblox.setRank(process.env.GROUP_ID, userId, rankId);

    message.reply(`${username} başarıyla terfi edildi.`);
  } catch (err) {
    console.log(err);
    message.reply("Hata oluştu.");
  }
});

client.login(process.env.DISCORD_TOKEN);

const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("Bot aktif");
});

app.listen(3000, () => {
  console.log("Web server çalışıyor");
});

d1cb4811f4e113308176b304a322e5f66fc47045

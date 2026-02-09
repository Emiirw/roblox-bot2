require("dotenv").config();
const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, 
    TextInputStyle, StringSelectMenuBuilder 
} = require("discord.js");
const express = require("express");
const noblox = require("noblox.js");
const fs = require("fs");

// --- WEB SERVER (Senin yapın) ---
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.status(200).send("Bot aktif 🔥");
});

app.listen(PORT, () => {
  console.log("Web server ve Bot aktif!");
});

// --- VERİTABANI VE AYARLAR ---
let sicilVerisi = {};
if (fs.existsSync("./siciller.json")) {
    sicilVerisi = JSON.parse(fs.readFileSync("./siciller.json", "utf8"));
}
function sicilKaydet() {
    fs.writeFileSync("./siciller.json", JSON.stringify(sicilVerisi, null, 2));
}

const rankMap = {
    "OR-1": 1, "OR-2": 2, "OR-3": 3, "OR-4": 4, "OR-5": 5, "OR-6": 6, "OR-7": 7, "OR-8": 8, "OR-9": 9,
    "OF-1": 10, "OF-2": 11, "OF-3": 12, "OF-4": 13, "OF-5": 14, "OF-6": 15, "OF-7": 16, "OF-8": 17, "OF-9": 18,
    "Büyük Konsey": 19, "Ankara Heyeti": 20, "Yönetim Kurulu": 21, "Başkumandan": 22, "Askeri Kurultay": 23, "Üst Yönetim Kurulu": 24
};

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// --- BOT HAZIR OLDUĞUNDA ---
client.once("ready", async () => {
  console.log("Discord bot aktif!");
  await noblox.setCookie(process.env.ROBLOX_COOKIE);
  console.log("Roblox giriş yapıldı!");

  // Slash komutlarını tanımla
  const commands = [
    {
        name: 'sorgu',
        description: 'Personel analizi ve sicil dökümü yapar',
        options: [{ name: 'kullanici', type: 3, description: 'Roblox adı veya Etiket', required: true }]
    },
    {
        name: 'sicil_duzenle',
        description: 'Personel için sicil paneli açar',
        options: [{ name: 'kullanici', type: 3, description: 'Roblox adı', required: true }]
    }
  ];
  await client.application.commands.set(commands);
});

// --- SLASH KOMUTLARI VE ETKİLEŞİMLER ---
client.on("interactionCreate", async (interaction) => {
    
    // 1. /sorgu Komutu (Gruplar, Hesap Yaşı, Sicil)
    if (interaction.isChatInputCommand() && interaction.commandName === 'sorgu') {
        await interaction.editReply()
        const targetRaw = interaction.options.getString('kullanici');
        let rbxName = targetRaw.replace(/[<@!>]/g, '');

        try {
            if (targetRaw.includes('<@')) {
                const member = await interaction.guild.members.fetch(rbxName);
                rbxName = member.nickname || member.user.username;
            } else {
                rbxName = targetRaw;
            }

            const userId = await noblox.getIdFromUsername(rbxName);
            const playerInfo = await noblox.getPlayerInfo(userId);
            const groups = await noblox.getGroups(userId);
            const sicil = sicilVerisi[userId] || [];

            const embed = new EmbedBuilder()
                .setTitle(`👤 Personel: ${rbxName}`)
                .setThumbnail(`https://www.roblox.com/headshot-thumbnail/image?userId=${userId}&width=420&height=420&format=png`)
                .addFields(
                    { name: 'Hesap ID', value: `${userId}`, inline: true },
                    { name: 'Hesap Yaşı', value: `${Math.floor((Date.now() - new Date(playerInfo.joinDate)) / (1000*60*60*24))} Gün`, inline: true },
                    { name: 'Risk Durumu', value: (Date.now() - new Date(playerInfo.joinDate)) < 2592000000 ? "🔴 RİSKLİ" : "🟢 GÜVENLİ", inline: true },
                    { name: '📜 Sicil Kayıtları', value: sicil.map((s, i) => `**${i+1}.** [${s.tarih}] ${s.tip}: ${s.sebep}`).join('\n') || 'Temiz' },
                    { name: '🏢 Bulunduğu Gruplar', value: groups.slice(0, 8).map(g => `• ${g.Name} (${g.Role})`).join('\n') || 'Grup yok' }
                )
                .setColor("DarkGrey")
                .setFooter({ text: "Veriler Roblox API ve Bot Veritabanından alınmıştır." });

            await interaction.reply({ embeds: [embed] });
        } catch (e) {
            interaction.reply({ content: "❌ Kullanıcı bulunamadı!", ephemeral: true });
        }
    }

    // 2. /sicil_duzenle Paneli
    if (interaction.isChatInputCommand() && interaction.commandName === 'sicil_duzenle') {
        const user = interaction.options.getString('kullanici');
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`ekle_${user}`).setLabel('Kayıt Ekle').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`sil_${user}`).setLabel('Kayıt Sil').setStyle(ButtonStyle.Danger)
        );
        await interaction.reply({ content: `**${user}** personeli için sicil yönetimi:`, components: [row] });
    }

    // 3. Buton İşlemleri (Modal Açma)
    if (interaction.isButton()) {
        const [action, targetName] = interaction.customId.split('_');

        if (action === 'ekle') {
            const modal = new ModalBuilder().setCustomId(`modal_${targetName}`).setTitle(`Sicil Girişi: ${targetName}`);
            const tip = new TextInputBuilder().setCustomId('tip').setLabel("UYARI mı CEZA mı?").setStyle(TextInputStyle.Short).setRequired(true);
            const sebep = new TextInputBuilder().setCustomId('sebep').setLabel("Neden ve Ceza Detayı").setStyle(TextInputStyle.Paragraph).setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(tip), new ActionRowBuilder().addComponents(sebep));
            await interaction.showModal(modal);
        }

        if (action === 'sil') {
            try {
                const userId = await noblox.getIdFromUsername(targetName);
                const userSicil = sicilVerisi[userId] || [];
                if (userSicil.length === 0) return interaction.reply({ content: "Silinecek kayıt yok.", ephemeral: true });

                const select = new StringSelectMenuBuilder()
                    .setCustomId(`silmenu_${userId}`)
                    .setPlaceholder('Silmek istediğiniz kaydı seçin')
                    .addOptions(userSicil.map((s, i) => ({ label: `${i+1}. ${s.tip}`, description: s.sebep.substring(0, 50), value: `${i}` })));

                await interaction.reply({ content: "Silinecek kaydı seçin:", components: [new ActionRowBuilder().addComponents(select)], ephemeral: true });
            } catch(e) { interaction.reply("Hata!"); }
        }
    }

    // 4. Modal Verisini Kaydetme
    if (interaction.isModalSubmit()) {
        const targetName = interaction.customId.split('_')[1];
        const tip = interaction.fields.getTextInputValue('tip').toUpperCase();
        const sebep = interaction.fields.getTextInputValue('sebep');

        try {
            const userId = await noblox.getIdFromUsername(targetName);
            if (!sicilVerisi[userId]) sicilVerisi[userId] = [];
            sicilVerisi[userId].push({ tip, sebep, yetkili: interaction.user.tag, tarih: new Date().toLocaleDateString('tr-TR') });
            sicilKaydet();
            await interaction.reply({ content: `✅ **${targetName}** sicili başarıyla güncellendi.` });
        } catch(e) { await interaction.reply("Hata: Roblox ID bulunamadı."); }
    }

    // 5. Seçim Menüsünden Silme
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('silmenu_')) {
        const userId = interaction.customId.split('_')[1];
        const index = parseInt(interaction.values[0]);
        sicilVerisi[userId].splice(index, 1);
        sicilKaydet();
        await interaction.reply({ content: "🗑️ Kayıt silindi." });
    }
});

// --- ESKİ USUL MESAJ KOMUTU (Senin !rdegis yapın) ---
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith("!rdegis")) return;
  if (!message.member.permissions.has("Administrator")) return;

  const args = message.content.split(" ");
  const mention = message.mentions.members.first();
  
  // Etiket varsa etiketlenenin adını, yoksa manuel girilen adı al
  let username = mention ? (mention.nickname || mention.user.username) : args[1];
  // Etiket varsa rütbe 3. elemandır (!rdegis @etiket OF-1), yoksa 2. elemandır
  let rankInput = (mention ? args[2] : args[2])?.toUpperCase();

  if (!username || !rankMap[rankInput]) {
    return message.reply("❌ **Hatalı Kullanım!**\nÖrnek: `!rdegis @Kullanıcı OF-2` veya `!rdegis RobloxIsmi OR-1` ");
  }

  try {
    const userId = await noblox.getIdFromUsername(username);
    const targetRankId = rankMap[rankInput];

    await noblox.setRank(parseInt(process.env.GROUP_ID), userId, targetRankId);
    message.reply(`✅ **${username}** personeli başarıyla **${rankInput}** yapıldı.`);
  } catch (err) {
    console.log(err);
    message.reply("❌ Bir hata oluştu. Kullanıcı adını veya rütbe kodunu kontrol et.");
  }
});

client.login(process.env.DISCORD_TOKEN);

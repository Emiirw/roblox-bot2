require("dotenv").config();
const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, 
    TextInputStyle, StringSelectMenuBuilder 
} = require("discord.js");
const express = require("express");
const noblox = require("noblox.js");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
app.get("/", (req, res) => res.status(200).send("Bot aktif 🔥"));
app.listen(PORT);

let sicilVerisi = {};
if (fs.existsSync("./siciller.json")) {
    sicilVerisi = JSON.parse(fs.readFileSync("./siciller.json", "utf8"));
}
function sicilKaydet() {
    fs.writeFileSync("./siciller.json", JSON.stringify(sicilVerisi, null, 2));
}

// Rütbe Map (İsim: Roblox_Rank_ID)
const rankMap = {
    "OR-1 Er": 1, "OR-2 Onbaşı": 2, "OR-3 Çavuş": 3, "OR-4 Uzman Çavuş": 4, "OR-5 Asb. Çavuş": 5, "OR-6 Asb. Üstçavuş": 6, "OR-7 Asb. Kıdemli Üstçavuş": 7, "OR-8 Asb. Başçavuş": 8, "OR-9 Asb. Kıdemli Başçavuş": 9,
    "OF-1 Teğmen": 10, "OF-2 Yüzbaşı": 11, "OF-3 Binbaşı": 12, "OF-4 Yarbay": 13, "OF-5 Albay": 14, "OF-6 Tuğgeneral": 15, "OF-7 Tümgeneral": 16, "OF-8 Korgeneral": 17, "OF-9 Orgeneral": 18,
    "Büyük Konsey": 19, "Ankara Heyeti": 20, "Yönetim Kurulu": 21, "Başkumandan": 22, "Askeri Kurultay": 23, "Üst Yönetim Kurulu": 24
};

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

client.once("ready", async () => {
  console.log("Discord bot aktif!");
  try {
      await noblox.setCookie(process.env.ROBLOX_COOKIE);
      console.log("Roblox girişi başarılı!");
  } catch (e) {
      console.error("COOKIE HATASI: Lütfen .env dosyasını kontrol et!");
  }

  const commands = [
    { name: 'sorgu', description: 'Personel analizi yapar', options: [{ name: 'kullanici', type: 3, description: 'Roblox adı veya Etiket', required: true }] },
    { name: 'rdegis', description: 'Rütbe değiştirir', options: [{ name: 'kullanici', type: 3, description: 'Ad/Etiket', required: true }, { name: 'rutbe', type: 3, description: 'Rütbe seçin', required: true, autocomplete: true }] },
    { name: 'terfi', description: 'Üst rütbeye atar', options: [{ name: 'kullanici', type: 3, description: 'Ad/Etiket', required: true }] },
    { name: 'tenzil', description: 'Alt rütbeye düşürür', options: [{ name: 'kullanici', type: 3, description: 'Ad/Etiket', required: true }] },
    { name: 'sicil_duzenle', description: 'Sicil paneli', options: [{ name: 'kullanici', type: 3, description: 'Roblox adı', required: true }] }
  ];
  await client.application.commands.set(commands);
});

client.on("interactionCreate", async (interaction) => {
    // 1. OTO TAMAMLAMA
    if (interaction.isAutocomplete()) {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        const choices = Object.keys(rankMap);
        const filtered = choices.filter(choice => choice.toLowerCase().includes(focusedValue)).slice(0, 25);
        return await interaction.respond(filtered.map(choice => ({ name: choice, value: choice })));
    }

    // 2. BUTON / MODAL / MENU
    if (!interaction.isChatInputCommand()) {
        if (interaction.isButton()) {
            const [action, targetName] = interaction.customId.split('_');
            if (action === 'ekle') {
                const modal = new ModalBuilder().setCustomId(`modal_${targetName}`).setTitle(`Sicil: ${targetName}`);
                const tip = new TextInputBuilder().setCustomId('tip').setLabel("Tip").setStyle(TextInputStyle.Short).setRequired(true);
                const sebep = new TextInputBuilder().setCustomId('sebep').setLabel("Detay").setStyle(TextInputStyle.Paragraph).setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(tip), new ActionRowBuilder().addComponents(sebep));
                return await interaction.showModal(modal);
            }
            if (action === 'sil') {
                const userId = await noblox.getIdFromUsername(targetName).catch(() => null);
                if (!userId || !sicilVerisi[userId]) return interaction.reply({ content: "Kayıt yok.", ephemeral: true });
                const menu = new StringSelectMenuBuilder().setCustomId(`silmenu_${userId}`).setPlaceholder('Seç');
                sicilVerisi[userId].forEach((s, i) => menu.addOptions({ label: `${i+1}. ${s.tip}`, value: `${i}` }));
                return await interaction.reply({ components: [new ActionRowBuilder().addComponents(menu)], ephemeral: true });
            }
        }
        if (interaction.isModalSubmit()) {
            const target = interaction.customId.split('_')[1];
            const userId = await noblox.getIdFromUsername(target);
            if (!sicilVerisi[userId]) sicilVerisi[userId] = [];
            sicilVerisi[userId].push({ tip: interaction.fields.getTextInputValue('tip'), sebep: interaction.fields.getTextInputValue('sebep'), tarih: new Date().toLocaleDateString('tr-TR') });
            sicilKaydet();
            return await interaction.reply({ content: `✅ İşlendi.`, ephemeral: true });
        }
        if (interaction.isStringSelectMenu() && interaction.customId.startsWith('silmenu_')) {
            const userId = interaction.customId.split('_')[1];
            sicilVerisi[userId].splice(parseInt(interaction.values[0]), 1);
            sicilKaydet();
            return await interaction.reply({ content: "🗑️ Silindi.", ephemeral: true });
        }
        return;
    }

    // 3. SLASH KOMUTLARI (ANA GÖVDE)
    const { commandName, options } = interaction;
    await interaction.deferReply(); // "Düşünüyor..." başlatıldı.

    const targetRaw = options.getString('kullanici');
    let rbxName = targetRaw.replace(/[<@!>]/g, '');
    if (targetRaw.includes('<@')) {
        const member = await interaction.guild.members.fetch(rbxName).catch(() => null);
        rbxName = member ? (member.nickname || member.user.username) : rbxName;
    }

    try {
        const userId = await noblox.getIdFromUsername(rbxName).catch(() => null);
        if (!userId) return await interaction.editReply(`❌ **${rbxName}** Roblox'ta bulunamadı.`);

        const GROUP_ID = parseInt(process.env.GROUP_ID);

       // --- SORGU KOMUTU ---
        if (commandName === 'sorgu') {
            const [playerInfo, groups, rankName] = await Promise.all([
                noblox.getPlayerInfo(userId).catch(() => ({ joinDate: new Date() })),
                noblox.getGroups(userId).catch(() => []),
                noblox.getRankNameInGroup(GROUP_ID, userId).catch(() => "Grupta Değil")
            ]);

            const sicil = sicilVerisi[userId] || [];
            
            // Grupları metin haline getiriyoruz
            const grupListesi = groups.length > 0 
                ? groups.slice(0, 5).map(g => `• **${g.Name}** (${g.Role})`).join('\n') 
                : "Grup bulunamadı veya gizli.";

            const embed = new EmbedBuilder()
                .setTitle(`👤 Personel Dosyası: ${rbxName}`)
                .setColor("Blue")
                .setThumbnail(`https://www.roblox.com/headshot-thumbnail/image?userId=${userId}&width=420&height=420&format=png`)
                .addFields(
                    { name: '🆔 Roblox ID', value: `\`${userId}\``, inline: true },
                    { name: '📅 Hesap Yaşı', value: `${Math.floor((Date.now() - new Date(playerInfo.joinDate)) / (1000*60*60*24))} Gün`, inline: true },
                    { name: '🎖️ Mevcut Rütbe', value: `**${rankName}**`, inline: false },
                    { name: '📜 Sicil Kaydı', value: sicil.map((s, i) => `**${i+1}.** ${s.tip}: ${s.sebep}`).join('\n') || 'Temiz', inline: false },
                    { name: '🏢 Üye Olduğu Gruplar (İlk 5)', value: grupListesi, inline: false }
                )
                .setFooter({ text: 'Sorgulama Başarılı', iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp();
            
            return await interaction.editReply({ embeds: [embed] });
        }
        // --- RÜTBE KOMUTLARI (Terfi, Tenzil, Rdegis) ---
        const currentRankName = await noblox.getRankNameInGroup(GROUP_ID, userId);
        const rankNames = Object.keys(rankMap);
        const currentIndex = rankNames.indexOf(currentRankName);

        if (commandName === 'terfi') {
            if (currentIndex === -1) return await interaction.editReply("❌ Kullanıcı grupta değil veya rütbesi listede tanımlı değil.");
            if (currentIndex >= rankNames.length - 1) return await interaction.editReply("❌ Bu personel zaten en üst rütbede!");
            
            const nextRank = rankNames[currentIndex + 1];
            await noblox.setRank(GROUP_ID, userId, rankMap[nextRank]);
            return await interaction.editReply(`🎖️ **${rbxName}** terfi ettirildi! \n**Yeni Rütbe:** ${nextRank}`);
        }

        if (commandName === 'tenzil') {
            if (currentIndex === -1) return await interaction.editReply("❌ Kullanıcı grupta değil veya rütbesi listede tanımlı değil.");
            if (currentIndex <= 0) return await interaction.editReply("❌ Bu personel zaten en alt rütbede!");
            
            const prevRank = rankNames[currentIndex - 1];
            await noblox.setRank(GROUP_ID, userId, rankMap[prevRank]);
            return await interaction.editReply(`📉 **${rbxName}** rütbesi düşürüldü! \n**Yeni Rütbe:** ${prevRank}`);
        }

        if (commandName === 'rdegis') {
            const newRank = options.getString('rutbe');
            await noblox.setRank(GROUP_ID, userId, rankMap[newRank]);
            return await interaction.editReply(`✅ **${rbxName}** personeli **${newRank}** yapıldı.`);
        }

    } catch (e) {
        console.error("KRİTİK HATA:", e);
        return await interaction.editReply("❌ Bir hata oluştu. Roblox Cookie veya Grup Yetkisi geçersiz olabilir.");
    }
});

client.login(process.env.DISCORD_TOKEN);

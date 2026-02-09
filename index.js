require("dotenv").config();
const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, 
    TextInputStyle, StringSelectMenuBuilder 
} = require("discord.js");
const noblox = require("noblox.js");
const fs = require("fs");

// RAM dostu ama fonksiyonları bozmayan ayarlar
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ]
});

let sicilVerisi = {};
if (fs.existsSync("./siciller.json")) {
    try {
        sicilVerisi = JSON.parse(fs.readFileSync("./siciller.json", "utf8"));
    } catch (e) { sicilVerisi = {}; }
}

function sicilKaydet() {
    fs.writeFileSync("./siciller.json", JSON.stringify(sicilVerisi, null, 2));
}

const rankMap = {
    "OR-1 Er": 1, "OR-2 Onbaşı": 2, "OR-3 Çavuş": 3, "OR-4 Uzman Çavuş": 4, "OR-5 Asb. Çavuş": 5, "OR-6 Asb. Üstçavuş": 6, "OR-7 Asb. Kıdemli Üstçavuş": 7, "OR-8 Asb. Başçavuş": 8, "OR-9 Asb. Kıdemli Başçavuş": 9,
    "OF-1 Teğmen": 10, "OF-2 Yüzbaşı": 11, "OF-3 Binbaşı": 12, "OF-4 Yarbay": 13, "OF-5 Albay": 14, "OF-6 Tuğgeneral": 15, "OF-7 Tümgeneral": 16, "OF-8 Korgeneral": 17, "OF-9 Orgeneral": 18,
    "Büyük Konsey": 19, "Ankara Heyeti": 20, "Yönetim Kurulu": 21, "Başkumandan": 22, "Askeri Kurultay": 23, "Üst Yönetim Kurulu": 24
};

// Yeni sürümlerde 'ready' yerine 'clientReady' tavsiye edilir
client.once("ready", async (c) => {
  console.log(`✅ ${c.user.tag} Aktif! RAM kullanımı optimize edildi.`);
  await noblox.setCookie(process.env.ROBLOX_COOKIE).catch(() => console.log("⚠️ Cookie Hatası!"));
  
  const commands = [
    { name: 'sicil', description: 'ID, yaş ve kayıtları gösterir', options: [{ name: 'kullanici', type: 3, description: 'Ad/Etiket', required: true }] },
    { name: 'rdegis', description: 'Manuel rütbe değişikliği', options: [{ name: 'kullanici', type: 3, description: 'Ad/Etiket', required: true }, { name: 'rutbe', type: 3, description: 'Rütbe', required: true, autocomplete: true }] },
    { name: 'terfi', description: 'Bir üst rütbe', options: [{ name: 'kullanici', type: 3, description: 'Ad/Etiket', required: true }] },
    { name: 'tenzil', description: 'Bir alt rütbe', options: [{ name: 'kullanici', type: 3, description: 'Ad/Etiket', required: true }] },
    { name: 'sicil_duzenle', description: 'Kayıt ekleme/silme paneli', options: [{ name: 'kullanici', type: 3, description: 'Roblox adı', required: true }] }
  ];
  await client.application.commands.set(commands);
});

client.on("interactionCreate", async (interaction) => {
    // Oto Tamamlama (RAM harcamaz)
    if (interaction.isAutocomplete()) {
        const focused = interaction.options.getFocused().toLowerCase();
        const filtered = Object.keys(rankMap).filter(r => r.toLowerCase().includes(focused)).slice(0, 25);
        return interaction.respond(filtered.map(r => ({ name: r, value: r })));
    }

    // Buton Etkileşimleri
    if (interaction.isButton()) {
        const [action, target] = interaction.customId.split('_');
        if (action === 'ekle') {
            const modal = new ModalBuilder().setCustomId(`modal_${target}`).setTitle(`Sicil Ekle: ${target}`);
            const tip = new TextInputBuilder().setCustomId('tip').setLabel("UYARI / CEZA").setStyle(TextInputStyle.Short).setRequired(true);
            const sebep = new TextInputBuilder().setCustomId('sebep').setLabel("Detaylı Sebep").setStyle(TextInputStyle.Paragraph).setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(tip), new ActionRowBuilder().addComponents(sebep));
            return interaction.showModal(modal);
        }
        if (action === 'sil') {
            const userId = await noblox.getIdFromUsername(target).catch(() => null);
            if (!userId || !sicilVerisi[userId] || sicilVerisi[userId].length === 0) return interaction.reply({ content: "Kayıt bulunamadı.", ephemeral: true });
            const menu = new StringSelectMenuBuilder().setCustomId(`silmenu_${userId}`).setPlaceholder('Silinecek kaydı seçin');
            sicilVerisi[userId].forEach((s, i) => menu.addOptions({ label: `${i+1}. ${s.tip}`, description: s.tarih, value: `${i}` }));
            return interaction.reply({ components: [new ActionRowBuilder().addComponents(menu)], ephemeral: true });
        }
    }

    // Modal Form Gönderimi
    if (interaction.isModalSubmit()) {
        const target = interaction.customId.split('_')[1];
        const userId = await noblox.getIdFromUsername(target).catch(() => null);
        if (!userId) return interaction.reply({ content: "Hata: Kullanıcı bulunamadı.", ephemeral: true });
        if (!sicilVerisi[userId]) sicilVerisi[userId] = [];
        sicilVerisi[userId].push({ tip: interaction.fields.getTextInputValue('tip'), sebep: interaction.fields.getTextInputValue('sebep'), tarih: new Date().toLocaleDateString('tr-TR') });
        sicilKaydet();
        return interaction.reply({ content: `✅ **${target}** için sicil kaydı eklendi.`, ephemeral: true });
    }

    // Menüden Kayıt Silme
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('silmenu_')) {
        const userId = interaction.customId.split('_')[1];
        sicilVerisi[userId].splice(parseInt(interaction.values[0]), 1);
        sicilKaydet();
        return interaction.reply({ content: "🗑️ Kayıt başarıyla silindi.", ephemeral: true });
    }

    if (!interaction.isChatInputCommand()) return;
    await interaction.deferReply();

    const targetRaw = interaction.options.getString('kullanici');
    let rbxName = targetRaw.replace(/[<@!>]/g, '');
    if (targetRaw.includes('<@')) {
        const member = await interaction.guild.members.fetch(rbxName).catch(() => null);
        rbxName = member ? (member.nickname || member.user.username) : rbxName;
    }

    try {
        const userId = await noblox.getIdFromUsername(rbxName).catch(() => null);
        if (!userId) return interaction.editReply(`❌ **${rbxName}** bulunamadı.`);
        const GID = parseInt(process.env.GROUP_ID);

        if (interaction.commandName === 'sicil') {
            const pInfo = await noblox.getPlayerInfo(userId).catch(() => ({ joinDate: new Date() }));
            const s = sicilVerisi[userId] || [];
            const embed = new EmbedBuilder()
                .setTitle(`📜 Personel: ${rbxName}`)
                .setColor("DarkRed")
                .setThumbnail(`https://www.roblox.com/headshot-thumbnail/image?userId=${userId}&width=420&height=420&format=png`)
                .addFields(
                    { name: '🆔 ID', value: `\`${userId}\``, inline: true },
                    { name: '📅 Yaş', value: `${Math.floor((Date.now() - new Date(pInfo.joinDate)) / 86400000)} Gün`, inline: true },
                    { name: '⚠️ Kayıtlar', value: s.map((x, i) => `**${i+1}.** [${x.tarih}] ${x.tip}: ${x.sebep}`).join('\n') || 'Temiz' }
                );
            return interaction.editReply({ embeds: [embed] });
        }

        if (interaction.commandName === 'sicil_duzenle') {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`ekle_${rbxName}`).setLabel('Kayıt Ekle').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`sil_${rbxName}`).setLabel('Kayıt Sil').setStyle(ButtonStyle.Secondary)
            );
            return interaction.editReply({ content: `🔍 **${rbxName}** için yönetim paneli:`, components: [row] });
        }

        // Rütbe Mantığı
        const currentRank = await noblox.getRankNameInGroup(GID, userId);
        const rNames = Object.keys(rankMap);
        const idx = rNames.indexOf(currentRank);

        if (interaction.commandName === 'terfi') {
            if (idx === -1 || idx >= rNames.length - 1) return interaction.editReply("❌ Bu rütbe için terfi yapılamaz.");
            await noblox.setRank(GID, userId, rankMap[rNames[idx + 1]]);
            return interaction.editReply(`🎖️ **${rbxName}** terfi etti: **${rNames[idx + 1]}**`);
        }

        if (interaction.commandName === 'tenzil') {
            if (idx <= 0) return interaction.editReply("❌ Daha fazla düşürülemez.");
            await noblox.setRank(GID, userId, rankMap[rNames[idx - 1]]);
            return interaction.editReply(`📉 **${rbxName}** rütbesi düştü: **${rNames[idx - 1]}**`);
        }

        if (interaction.commandName === 'rdegis') {
            const nr = interaction.options.getString('rutbe');
            await noblox.setRank(GID, userId, rankMap[nr]);
            return interaction.editReply(`✅ **${rbxName}** rütbesi **${nr}** olarak güncellendi.`);
        }
    } catch (e) {
        return interaction.editReply("❌ Bir hata oluştu. Roblox yetkilerini kontrol et.");
    }
});

client.login(process.env.DISCORD_TOKEN);

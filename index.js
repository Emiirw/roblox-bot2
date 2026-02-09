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

// Rütbe Listesi (Sıralama Önemli: En düşükten en yükseğe)
const rankMap = {
    "OR-1": 1, "OR-2": 2, "OR-3": 3, "OR-4": 4, "OR-5": 5, "OR-6": 6, "OR-7": 7, "OR-8": 8, "OR-9": 9,
    "OF-1": 10, "OF-2": 11, "OF-3": 12, "OF-4": 13, "OF-5": 14, "OF-6": 15, "OF-7": 16, "OF-8": 17, "OF-9": 18,
    "Büyük Konsey": 19, "Ankara Heyeti": 20, "Yönetim Kurulu": 21, "Başkumandan": 22, "Askeri Kurultay": 23, "Üst Yönetim Kurulu": 24
};

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

client.once("ready", async () => {
  console.log("Discord bot aktif!");
  await noblox.setCookie(process.env.ROBLOX_COOKIE).catch(e => console.log("Cookie Hatası"));

  const commands = [
    {
        name: 'sorgu',
        description: 'Personel analizi ve sicil dökümü yapar',
        options: [{ name: 'kullanici', type: 3, description: 'Roblox adı veya Etiket', required: true }]
    },
    {
        name: 'rdegis',
        description: 'Personelin rütbesini değiştirir',
        options: [
            { name: 'kullanici', type: 3, description: 'Roblox adı veya Etiket', required: true },
            { name: 'rutbe', type: 3, description: 'Yeni rütbeyi seçin', required: true, autocomplete: true }
        ]
    },
    {
        name: 'terfi',
        description: 'Personeli bir üst rütbeye yükseltir',
        options: [{ name: 'kullanici', type: 3, description: 'Roblox adı veya Etiket', required: true }]
    },
    {
        name: 'tenzil',
        description: 'Personeli bir alt rütbeye düşürür',
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

client.on("interactionCreate", async (interaction) => {
    
// OTO TAMAMLAMA (Rütbe Listesi)
    if (interaction.isAutocomplete() && interaction.commandName === 'rdegis') {
        const focusedValue = interaction.options.getFocused() || "";
        const choices = Object.keys(rankMap);
        
        // Kullanıcı bir şey yazmasa bile ilk 25 rütbeyi gösterir
        const filtered = choices.filter(choice => 
            choice.toLowerCase().includes(focusedValue.toLowerCase())
        ).slice(0, 25);

        // Hata almamak için mutlaka bir dizi döndürmeli
        await interaction.respond(
            filtered.map(choice => ({ name: choice, value: choice }))
        ).catch(e => console.log("Autocomplete Hatası:", e));
    }

    if (!interaction.isChatInputCommand()) {
        // BUTON VE MODAL İŞLEMLERİ (Önceki kodlarınla aynı kalsın)
        if (interaction.isButton()) {
            const [action, targetName] = interaction.customId.split('_');
            if (action === 'ekle') {
                const modal = new ModalBuilder().setCustomId(`modal_${targetName}`).setTitle(`Sicil: ${targetName}`);
                const tip = new TextInputBuilder().setCustomId('tip').setLabel("UYARI mı CEZA mı?").setStyle(TextInputStyle.Short).setRequired(true);
                const sebep = new TextInputBuilder().setCustomId('sebep').setLabel("Detaylar").setStyle(TextInputStyle.Paragraph).setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(tip), new ActionRowBuilder().addComponents(sebep));
                await interaction.showModal(modal);
            }
            if (action === 'sil') {
                const userId = await noblox.getIdFromUsername(targetName).catch(() => null);
                const list = sicilVerisi[userId] || [];
                if (list.length === 0) return interaction.reply({ content: "Silinecek kayıt yok.", ephemeral: true });
                const menu = new StringSelectMenuBuilder().setCustomId(`silmenu_${userId}`).setPlaceholder('Kayıt seçin');
                list.forEach((s, i) => menu.addOptions({ label: `${i+1}. ${s.tip}`, description: s.tarih, value: `${i}` }));
                await interaction.reply({ content: "Kayıt seç:", components: [new ActionRowBuilder().addComponents(menu)], ephemeral: true });
            }
        }
        if (interaction.isModalSubmit()) {
            const target = interaction.customId.split('_')[1];
            const userId = await noblox.getIdFromUsername(target);
            if (!sicilVerisi[userId]) sicilVerisi[userId] = [];
            sicilVerisi[userId].push({ tip: interaction.fields.getTextInputValue('tip'), sebep: interaction.fields.getTextInputValue('sebep'), tarih: new Date().toLocaleDateString('tr-TR') });
            sicilKaydet();
            await interaction.reply({ content: `✅ Sicil işlendi.`, ephemeral: true });
        }
        if (interaction.isStringSelectMenu() && interaction.customId.startsWith('silmenu_')) {
            const userId = interaction.customId.split('_')[1];
            sicilVerisi[userId].splice(parseInt(interaction.values[0]), 1);
            sicilKaydet();
            await interaction.reply({ content: "🗑️ Silindi.", ephemeral: true });
        }
        return;
    }

    const { commandName, options } = interaction;
    await interaction.deferReply();

    const targetRaw = options.getString('kullanici');
    let rbxName = targetRaw.replace(/[<@!>]/g, '');
    if (targetRaw.includes('<@')) {
        const member = await interaction.guild.members.fetch(rbxName).catch(() => null);
        rbxName = member ? (member.nickname || member.user.username) : rbxName;
    }

    try {
        const userId = await noblox.getIdFromUsername(rbxName);
        const currentRankName = await noblox.getRankNameInGroup(parseInt(process.env.GROUP_ID), userId);
        const rankNames = Object.keys(rankMap);
        const currentIndex = rankNames.indexOf(currentRankName);

        // --- TERFİ KOMUTU ---
        if (commandName === 'terfi') {
            if (currentIndex === -1 || currentIndex === rankNames.length - 1) 
                return interaction.editReply("❌ Bu personel zaten en üst rütbede veya grup rütbesi listede yok.");
            
            const nextRank = rankNames[currentIndex + 1];
            await noblox.setRank(parseInt(process.env.GROUP_ID), userId, rankMap[nextRank]);
            await interaction.editReply(`🎖️ **${rbxName}** terfi ettirildi! \n**Eski Rütbe:** ${currentRankName} \n**Yeni Rütbe:** ${nextRank}`);
        }

        // --- TENZİL KOMUTU ---
        if (commandName === 'tenzil') {
            if (currentIndex <= 0) 
                return interaction.editReply("❌ Bu personel zaten en alt rütbede veya grup rütbesi listede yok.");
            
            const prevRank = rankNames[currentIndex - 1];
            await noblox.setRank(parseInt(process.env.GROUP_ID), userId, rankMap[prevRank]);
            await interaction.editReply(`📉 **${rbxName}** rütbesi düşürüldü! \n**Eski Rütbe:** ${currentRankName} \n**Yeni Rütbe:** ${prevRank}`);
        }

        // --- RDEGIS KOMUTU ---
        if (commandName === 'rdegis') {
            const newRank = options.getString('rutbe');
            await noblox.setRank(parseInt(process.env.GROUP_ID), userId, rankMap[newRank]);
            await interaction.editReply(`✅ **${rbxName}** rütbesi **${newRank}** olarak güncellendi.`);
        }

  // HIZLANDIRILMIŞ VE KİLİTLENMEYEN SORGU
    if (commandName === 'sorgu') {
        try {
            // 1. Kullanıcıyı bulurken hata payını sıfırlayalım
            const userId = await noblox.getIdFromUsername(rbxName).catch(() => null);
            if (!userId) return await interaction.editReply(`❌ **${rbxName}** bulunamadı.`);

            // 2. Verileri PARALEL çekelim (Hız kazandırır)
            // Biri biterken diğerini beklemez, ikisini aynı anda ister.
            const [playerInfo, groups] = await Promise.all([
                noblox.getPlayerInfo(userId).catch(() => null),
                noblox.getGroups(userId).catch(() => [])
            ]).catch(() => [null, []]);

            if(!playerInfo) return await interaction.editReply("❌ Roblox verileri çekilemedi.");

            const sicil = sicilVerisi[userId] || [];
            
            const embed = new EmbedBuilder()
                .setTitle(`👤 ${rbxName} Analizi`)
                .setThumbnail(`https://www.roblox.com/headshot-thumbnail/image?userId=${userId}&width=420&height=420&format=png`)
                .addFields(
                    { name: 'Hesap ID', value: `${userId}`, inline: true },
                    { name: 'Hesap Yaşı', value: `${Math.floor((Date.now() - new Date(playerInfo.joinDate)) / (1000*60*60*24))} Gün`, inline: true },
                    { name: 'Sicil', value: sicil.length > 0 ? `⚠️ ${sicil.length} Kayıt` : "✅ Temiz", inline: true },
                    { name: '🏢 Gruplar (İlk 5)', value: groups.slice(0, 5).map(g => `• ${g.Name}`).join('\n') || 'Grup yok' }
                )
                .setColor("Blue");

            // MUTLAKA editReply kullanmalıyız
            await interaction.editReply({ embeds: [embed] });

  } catch (e) {
            console.error("Sorgu Hatası:", e);
            if (interaction.deferred) {
                await interaction.editReply("❌ Bir şeyler ters gitti, konsolu kontrol et.");
            }
        }
    }
});

client.login(process.env.DISCORD_TOKEN);

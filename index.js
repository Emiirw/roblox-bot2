require("dotenv").config();
const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, 
    TextInputStyle, StringSelectMenuBuilder 
} = require("discord.js");
const noblox = require("noblox.js");
const fs = require("fs");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
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

client.once("ready", async () => {
  console.log("Bot tenzil komutu kaldırılmış şekilde aktif!");
  await noblox.setCookie(process.env.ROBLOX_COOKIE).catch(() => console.log("Cookie Hatası!"));
  
  const commands = [
    { name: 'sicil', description: 'ID, yaş ve kayıtları gösterir', options: [{ name: 'kullanici', type: 3, description: 'Ad/Etiket', required: true }] },
    { name: 'rdegis', description: 'Rütbe değiştirir', options: [{ name: 'kullanici', type: 3, description: 'Ad/Etiket', required: true }, { name: 'rutbe', type: 3, description: 'Rütbe', required: true, autocomplete: true }] },
    { name: 'terfi', description: 'Üst rütbeye yükseltir', options: [{ name: 'kullanici', type: 3, description: 'Ad/Etiket', required: true }] },
    { name: 'sicil_duzenle', description: 'Sicil paneli açar', options: [{ name: 'kullanici', type: 3, description: 'Roblox adı', required: true }] },
    { name: 'reset', description: 'Botu yeniden başlatır' }
  ];
  await client.application.commands.set(commands);
});

client.on("interactionCreate", async (interaction) => {
    // Oto Tamamlama
    if (interaction.isAutocomplete() && interaction.commandName === 'rdegis') {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        const choices = Object.keys(rankMap);
        const filtered = choices.filter(choice => choice.toLowerCase().includes(focusedValue)).slice(0, 25);
        return await interaction.respond(filtered.map(choice => ({ name: choice, value: choice })));
    }

    // Buton ve Modal İşlemleri
    if (!interaction.isChatInputCommand()) {
        if (interaction.isButton()) {
            const [action, targetName] = interaction.customId.split('_');
            if (action === 'ekle') {
                const modal = new ModalBuilder().setCustomId(`modal_${targetName}`).setTitle(`Sicil: ${targetName}`);
                const tip = new TextInputBuilder().setCustomId('tip').setLabel("UYARI mi CEZA mi?").setStyle(TextInputStyle.Short).setRequired(true);
                const sebep = new TextInputBuilder().setCustomId('sebep').setLabel("Detaylar").setStyle(TextInputStyle.Paragraph).setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(tip), new ActionRowBuilder().addComponents(sebep));
                return await interaction.showModal(modal);
            }
            if (action === 'sil') {
                const userId = await noblox.getIdFromUsername(targetName).catch(() => null);
                if (!userId || !sicilVerisi[userId] || sicilVerisi[userId].length === 0) return interaction.reply({ content: "Kayıt bulunamadı.", ephemeral: true });
                const menu = new StringSelectMenuBuilder().setCustomId(`silmenu_${userId}`).setPlaceholder('Kayıt seçin');
                sicilVerisi[userId].forEach((s, i) => menu.addOptions({ label: `${i+1}. ${s.tip}`, description: s.tarih, value: `${i}` }));
                return await interaction.reply({ components: [new ActionRowBuilder().addComponents(menu)], ephemeral: true });
            }
        }
        if (interaction.isModalSubmit()) {
            const target = interaction.customId.split('_')[1];
            const userId = await noblox.getIdFromUsername(target).catch(() => null);
            if (!userId) return;
            if (!sicilVerisi[userId]) sicilVerisi[userId] = [];
            sicilVerisi[userId].push({ tip: interaction.fields.getTextInputValue('tip'), sebep: interaction.fields.getTextInputValue('sebep'), tarih: new Date().toLocaleDateString('tr-TR') });
            sicilKaydet();
            return await interaction.reply({ content: `✅ Sicil başarıyla işlendi.`, ephemeral: true });
        }
        if (interaction.isStringSelectMenu() && interaction.customId.startsWith('silmenu_')) {
            const userId = interaction.customId.split('_')[1];
            sicilVerisi[userId].splice(parseInt(interaction.values[0]), 1);
            sicilKaydet();
            return await interaction.reply({ content: "🗑️ Kayıt silindi.", ephemeral: true });
        }
        return;
    }

    const { commandName, options } = interaction;
    await interaction.deferReply();

    // Reset Komutu (Senin koddaki haliyle bıraktım)
    if (commandName === 'reset') {
        if (!interaction.member.permissions.has("Administrator")) return interaction.editReply("Yetkin yok kanka.");
        await interaction.editReply("🔄 Yeniden başlatılıyor...");
        setTimeout(() => process.exit(), 1000);
        return;
    }

    // Kullanıcı Adı Çevirme
    const targetRaw = options.getString('kullanici');
    let rbxName = targetRaw.replace(/[<@!>]/g, '');
    if (targetRaw.includes('<@')) {
        const member = await interaction.guild.members.fetch(rbxName).catch(() => null);
        rbxName = member ? (member.nickname || member.user.username) : rbxName;
    }

    try {
        const userId = await noblox.getIdFromUsername(rbxName).catch(() => null);
        if (!userId) return await interaction.editReply(`❌ **${rbxName}** bulunamadı.`);
        const GROUP_ID = parseInt(process.env.GROUP_ID);

        // --- SİCİL KOMUTU ---
        if (commandName === 'sicil') {
            const playerInfo = await noblox.getPlayerInfo(userId).catch(() => ({ joinDate

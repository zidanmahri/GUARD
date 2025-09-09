// index.js (Versi Final Gabungan - Pastikan ini disalin seluruhnya)

import express from "express";
import fetch from "node-fetch";
import { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } from "discord.js";
import 'dotenv/config';

// === 1. KONFIGURASI ===
const TOKEN = process.env.DISCORD_TOKEN;
const PORT = process.env.PORT || 8080;
const API_URL = process.env.API_URL;
const UNIVERSE_ID = process.env.UNIVERSE_ID;
const API_KEY = process.env.ROBLOX_API_KEY;

if (!TOKEN || !API_URL || !UNIVERSE_ID || !API_KEY) {
    console.error("❌ Variabel lingkungan wajib (DISCORD_TOKEN, API_URL, UNIVERSE_ID, ROBLOX_API_KEY) belum diatur!");
    process.exit(1);
}

// === FUNGSI HELPER UNTUK MENGAMBIL DATA ==

async function getRobloxUserInfo(username) {
    const userSearchRes = await fetch(`https://api.roblox.com/users/get-by-username?username=${username}`);
    const userSearchData = await userSearchRes.json();
    if (!userSearchData.Id) throw new Error('User Roblox tidak ditemukan.');
    
    const userId = userSearchData.Id;

    const [detailsRes, friendsRes, followersRes, followingsRes] = await Promise.all([
        fetch(`https://users.roblox.com/v1/users/${userId}`),
        fetch(`https://friends.roblox.com/v1/users/${userId}/friends/count`),
        fetch(`https://friends.roblox.com/v1/users/${userId}/followers/count`),
        fetch(`https://friends.roblox.com/v1/users/${userId}/followings/count`)
    ]);

    const detailsData = await detailsRes.json();
    const friendsData = await friendsRes.json();
    const followersData = await followersRes.json();
    const followingsData = await followingsRes.json();
    
    return {
        id: detailsData.id, name: detailsData.name, displayName: detailsData.displayName,
        description: detailsData.description || "No description.", isBanned: detailsData.isBanned,
        created: detailsData.created, url: `https://www.roblox.com/users/${userId}/profile`,
        friendsCount: friendsData.count, followersCount: followersData.count, followingsCount: followingsData.count
    };
}

async function getBanlistFromRoblox() {
    const DATASTORE_NAME = "BanList";
    const url = `https://apis.roblox.com/datastores/v1/universes/${UNIVERSE_ID}/datastores/${DATASTORE_NAME}/entries`;
    const response = await fetch(url, { headers: { 'x-api-key': API_KEY } });
    if (!response.ok) { 
        const errorBody = await response.text(); 
        throw new Error(`Gagal mengambil data dari Roblox Open Cloud: ${response.statusText} | ${errorBody}`); 
    }
    const data = await response.json();
    return data.entries;
}


// === 2. SETUP DISCORD BOT ===
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.once('clientReady', () => console.log(`✅ Bot Discord online sebagai ${client.user.tag}`));


// === 3. COMMAND HANDLER ===
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName } = interaction;

    if (commandName === 'ping') { 
        await interaction.reply({ content: "Pong!", ephemeral: true }); 
    }

    if (commandName === "userinfo") {
        const username = interaction.options.getString('username');
        await interaction.deferReply({ ephemeral: true }); 
        
        try {
            const data = await getRobloxUserInfo(username);
            
            const creationDate = new Date(data.created);
            const accountAge = new Date().getFullYear() - creationDate.getFullYear();
            const formattedDate = creationDate.toLocaleDateString('id-ID', {
                day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });

            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setAuthor({ name: `${interaction.client.user.username} /userinfo` })
                .addFields(
                    { name: 'Display Name', value: `\`${data.displayName}\``, inline: true },
                    { name: 'Username', value: `\`@${data.name}\``, inline: true },
                    { name: 'ID', value: `\`${data.id}\``, inline: true },
                    { name: 'Friends', value: `\`${data.friendsCount.toLocaleString('id-ID')}\``, inline: true },
                    { name: 'Followers', value: `\`${data.followersCount.toLocaleString('id-ID')}\``, inline: true },
                    { name: 'Following', value: `\`${data.followingsCount.toLocaleString('id-ID')}\``, inline: true },
                    { name: 'Description', value: `\`\`\`${data.description}\`\`\`` },
                    { name: 'Account Created', value: `${formattedDate} (${accountAge} years ago)` },
                )
                .setTimestamp();

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder().setLabel('View Notes').setStyle(ButtonStyle.Secondary).setCustomId('view_notes_button').setDisabled(true),
                    new ButtonBuilder().setLabel('View Profile on Roblox').setStyle(ButtonStyle.Link).setURL(data.url)
                );

            await interaction.editReply({ embeds: [embed], components: [row] });

        } catch (error) {
            await interaction.editReply({ content: `❌ Gagal mendapatkan info: ${error.message}` });
        }
    }
    
    if (commandName === 'banlist') {
        await interaction.deferReply();
        try {
            const data = await getBanlistFromRoblox();
            if (!data || data.length === 0) return await interaction.editReply("✅ Tidak ada user yang di-ban.");
            const bannedUserIDs = data.map(entry => entry.key.split('_')[1] || entry.key).join('\n- ');
            const embed = new EmbedBuilder()
                .setColor('#FF0000').setTitle('🚫 Daftar Ban Game')
                .setDescription(`Berikut adalah daftar User ID yang saat ini di-ban:\n- ${bannedUserIDs}`)
                .setTimestamp().setFooter({ text: `Total: ${data.length} user` });
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            await interaction.editReply(`❌ Gagal mengambil banlist: ${error.message}`);
        }
    }

    if (commandName === "ban") {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return await interaction.reply({ content: "❌ Anda tidak memiliki izin untuk menggunakan perintah ini.", ephemeral: true });
        }

        const username = interaction.options.getString('username');
        const reason = interaction.options.getString('reason') || "Tidak ada alasan.";
        await interaction.deferReply();

        try {
            const response = await fetch(`${API_URL}/ban-player`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: username,
                    reason: reason,
                    bannedBy: interaction.user.tag
                })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            await interaction.editReply(`✅ Berhasil mem-ban pemain **${username}** dengan alasan: *${reason}*.`);
        } catch (error) {
            await interaction.editReply(`❌ Gagal mem-ban pemain: ${error.message}`);
        }
    }
});


// === 4. EXPRESS SERVER & API ===
const app = express();
app.use(express.json()); 

app.get("/", (req, res) => res.send(`🤖 Bot & API Service berjalan.`));

app.get('/userinfo/:username', async (req, res) => {
    try { const data = await getRobloxUserInfo(req.params.username); res.status(200).json(data); } catch (error) { res.status(404).json({ error: error.message }); }
});

app.get('/banlist', async (req, res) => {
    try { const data = await getBanlistFromRoblox(); res.status(200).json(data); } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/ban-player', async (req, res) => {
    const { username, reason, bannedBy } = req.body;
    if (!username) { return res.status(400).json({ error: "Username pemain diperlukan." }); }

    try {
        const userInfo = await getRobloxUserInfo(username);
        const userId = userInfo.id;
        const key = String(userId);

        const dataToSave = {
            reason: reason || "Tidak ada alasan.",
            bannedBy: bannedBy || "Sistem",
            timestamp: Math.floor(Date.now() / 1000)
        };
        
        const DATASTORE_NAME = "BanList";
        const url = `https://apis.roblox.com/datastores/v1/universes/${UNIVERSE_ID}/datastores/${DATASTORE_NAME}/entries/entry?datastoreEntryKey=${key}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify(dataToSave)
        });
        
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Roblox API Error: ${response.statusText} | ${errorBody}`);
        }

        res.status(200).json({ success: true, message: `Pemain ${username} (ID: ${userId}) berhasil di-ban.` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// === 5. JALANKAN SEMUANYA ===
client.login(TOKEN);
app.listen(PORT, () => {
    console.log(`🌐 Server Express berjalan di port ${PORT}`);
});

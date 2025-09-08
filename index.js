// index.js (Versi Final & Efisien)

import express from "express";
import fetch from "node-fetch";
import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import 'dotenv/config';

// === 1. KONFIGURASI ===
const TOKEN = process.env.DISCORD_TOKEN;
const PORT = process.env.PORT || 8080;
const UNIVERSE_ID = process.env.UNIVERSE_ID;
const API_KEY = process.env.ROBLOX_API_KEY;

if (!TOKEN || !UNIVERSE_ID || !API_KEY) {
    console.error("❌ Variabel lingkungan wajib (DISCORD_TOKEN, UNIVERSE_ID, ROBLOX_API_KEY) belum diatur!");
    process.exit(1);
}

// === FUNGSI HELPER UNTUK MENGAMBIL DATA (INTI PERBAIKAN) ===

async function getRobloxUserInfo(username) {
    // Langkah 1: Dapatkan ID dari username
    const userSearchRes = await fetch(`https://api.roblox.com/users/get-by-username?username=${username}`);
    const userSearchData = await userSearchRes.json();
    if (!userSearchData.Id) {
        throw new Error('User Roblox tidak ditemukan.');
    }
    // Langkah 2: Dapatkan detail dari ID
    const userDetailRes = await fetch(`https://users.roblox.com/v1/users/${userSearchData.Id}`);
    const userDetailData = await userDetailRes.json();
    // Langkah 3: Kembalikan data yang sudah rapi
    return {
        id: userDetailData.id, name: userDetailData.name, displayName: userDetailData.displayName,
        description: userDetailData.description, isBanned: userDetailData.isBanned,
        created: userDetailData.created, url: `https://www.roblox.com/users/${userDetailData.id}/profile`
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
const client = new Client({
    intents: [ /* ... Intents Anda ... */ GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent ],
});
client.once('clientReady', () => console.log(`✅ Bot Discord online sebagai ${client.user.tag}`));


// === 3. COMMAND HANDLER ===
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName } = interaction;

    if (commandName === "ping") {
        await interaction.reply({ content: "🏓 Pong!", ephemeral: true });
    }

    if (commandName === "userinfo") {
        const username = interaction.options.getString('username');
        await interaction.deferReply();
        try {
            // Panggil fungsi lokal, BUKAN fetch
            const data = await getRobloxUserInfo(username);

            const embed = new EmbedBuilder()
                .setColor(data.isBanned ? '#FF0000' : '#0099FF').setTitle(data.displayName).setURL(data.url)
                .setAuthor({ name: `@${data.name}` }).setDescription(data.description || 'Tidak ada deskripsi.')
                .addFields(
                    { name: 'User ID', value: data.id.toString(), inline: true },
                    { name: 'Status Akun', value: data.isBanned ? 'Banned' : 'Aktif', inline: true },
                    { name: 'Tanggal Dibuat', value: new Date(data.created).toLocaleDateString('id-ID'), inline: true }
                ).setTimestamp().setFooter({ text: 'Informasi User Roblox' });
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            await interaction.editReply(`❌ Gagal mendapatkan info: ${error.message}`);
        }
    }

    if (commandName === "banlist") {
        await interaction.deferReply();
        try {
            // Panggil fungsi lokal, BUKAN fetch
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
});

// === 4. EXPRESS SERVER & API ===
const app = express();
app.get("/", (req, res) => res.send(`🤖 Bot & API Service berjalan.`));

// Endpoint API sekarang hanya memanggil fungsi helper
app.get('/userinfo/:username', async (req, res) => {
    try {
        const data = await getRobloxUserInfo(req.params.username);
        res.status(200).json(data);
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
});
app.get('/banlist', async (req, res) => {
    try {
        const data = await getBanlistFromRoblox();
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// === 5. JALANKAN SEMUANYA ===
client.login(TOKEN);
app.listen(PORT, () => {
    console.log(`🌐 Server Express berjalan di port ${PORT}`);
});

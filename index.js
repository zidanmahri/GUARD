// index.js (Versi Final)

import express from "express";
import fetch from "node-fetch";
import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
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

// === 2. SETUP DISCORD BOT ===
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
});

// Menggunakan 'clientReady' sesuai anjuran warning untuk praktik terbaik
client.once('clientReady', () => {
    console.log(`✅ Bot Discord telah online dan siap sebagai ${client.user.tag}`);
});

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
            const response = await fetch(`${API_URL}/userinfo/${username}`);
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

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
            await interaction.editReply(`❌ Gagal mendapatkan info untuk **${username}**: ${error.message || 'User tidak ditemukan.'}`);
        }
    }

    if (commandName === "banlist") {
        await interaction.deferReply();
        try {
            const response = await fetch(`${API_URL}/banlist`);
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            if (!data || data.length === 0) return await interaction.editReply("✅ Tidak ada user yang di-ban.");

            const bannedUserIDs = data.map(entry => entry.key.split('_')[1] || entry.key).join('\n- ');
            const embed = new EmbedBuilder()
                .setColor('#FF0000').setTitle('🚫 Daftar Ban Game')
                .setDescription(`Berikut adalah daftar User ID yang saat ini di-ban:\n- ${bannedUserIDs}`)
                .setTimestamp().setFooter({ text: `Total: ${data.length} user` });
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            await interaction.editReply(`❌ Gagal mengambil banlist: ${error.message || 'Terjadi kesalahan pada API.'}`);
        }
    }
});

// === 4. EXPRESS SERVER & API ===
const app = express();
app.get("/", (req, res) => res.send(`🤖 Bot & API Service berjalan.`));

app.get('/userinfo/:username', async (req, res) => { /* ... (Endpoint tidak berubah) ... */ });
app.get('/banlist', async (req, res) => { /* ... (Endpoint tidak berubah) ... */ });

// (Salin ulang endpoint dari kode sebelumnya karena tidak ada perubahan)
app.get('/userinfo/:username', async (req, res) => {
    const { username } = req.params;
    try {
        const userSearchRes = await fetch(`https://api.roblox.com/users/get-by-username?username=${username}`);
        const userSearchData = await userSearchRes.json();
        if (!userSearchData.Id) return res.status(404).json({ error: 'User tidak ditemukan' });
        const userDetailRes = await fetch(`https://users.roblox.com/v1/users/${userSearchData.Id}`);
        const userDetailData = await userDetailRes.json();
        res.status(200).json({
            id: userDetailData.id, name: userDetailData.name, displayName: userDetailData.displayName,
            description: userDetailData.description, isBanned: userDetailData.isBanned,
            created: userDetailData.created, url: `https://www.roblox.com/users/${userDetailData.id}/profile`
        });
    } catch (error) { res.status(500).json({ error: 'Server gagal mengambil data dari Roblox.' }); }
});
app.get('/banlist', async (req, res) => {
    const DATASTORE_NAME = "BanList";
    const url = `https://apis.roblox.com/datastores/v1/universes/${UNIVERSE_ID}/datastores/${DATASTORE_NAME}/entries`;
    try {
        const response = await fetch(url, { headers: { 'x-api-key': API_KEY } });
        if (!response.ok) {
            const errorBody = await response.text();
            return res.status(response.status).json({ error: `Gagal mengambil data dari Roblox: ${response.statusText}`, details: errorBody });
        }
        const data = await response.json();
        res.status(200).json(data.entries);
    } catch (error) { res.status(500).json({ error: 'Server gagal berkomunikasi dengan Roblox Open Cloud.' }); }
});


// === 5. JALANKAN SEMUANYA ===
client.login(TOKEN);
app.listen(PORT, () => {
    console.log(`🌐 Server Express berjalan di port ${PORT}`);
});

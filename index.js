// index.js

import express from "express";
import fetch from "node-fetch";
import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import 'dotenv/config';

// === 1. KONFIGURASI & PEMERIKSAAN VARIABEL LINGKUNGAN ===
const TOKEN = process.env.DISCORD_TOKEN;
const PORT = process.env.PORT || 8080;
const API_URL = process.env.API_URL;
const UNIVERSE_ID = process.env.UNIVERSE_ID;
const API_KEY = process.env.ROBLOX_API_KEY;

if (!TOKEN || !API_URL || !UNIVERSE_ID || !API_KEY) {
    console.error("❌ Salah satu atau lebih variabel lingkungan wajib belum diatur!");
    console.error("Pastikan DISCORD_TOKEN, API_URL, UNIVERSE_ID, dan ROBLOX_API_KEY sudah ada.");
    process.exit(1); // Menghentikan aplikasi jika konfigurasi kurang
}

// === 2. SETUP DISCORD BOT ===
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
});

client.once("ready", () => {
    console.log(`🤖 Bot Discord telah online sebagai ${client.user.tag}`);
});

// === 3. COMMAND HANDLER UNTUK INTERAKSI SLASH ===
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName } = interaction;

    // --- Perintah /ping ---
    if (commandName === "ping") {
        await interaction.reply({ content: "🏓 Pong!", ephemeral: true });
    }

    // --- Perintah /userinfo ---
    if (commandName === "userinfo") {
        const username = interaction.options.getString('username');
        await interaction.deferReply();

        try {
            const response = await fetch(`${API_URL}/userinfo/${username}`);
            const data = await response.json();

            if (!response.ok) {
                return await interaction.editReply(`❌ Gagal mendapatkan info untuk **${username}**: ${data.error || 'User tidak ditemukan.'}`);
            }

            const embed = new EmbedBuilder()
                .setColor(data.isBanned ? '#FF0000' : '#0099FF')
                .setTitle(data.displayName)
                .setURL(data.url)
                .setAuthor({ name: `@${data.name}` })
                .setDescription(data.description || 'Tidak ada deskripsi.')
                .addFields(
                    { name: 'User ID', value: data.id.toString(), inline: true },
                    { name: 'Status Akun', value: data.isBanned ? 'Banned' : 'Aktif', inline: true },
                    { name: 'Tanggal Dibuat', value: new Date(data.created).toLocaleDateString('id-ID'), inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'Informasi User Roblox' });

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error("Error di perintah /userinfo:", error);
            await interaction.editReply(`❌ Terjadi kesalahan saat menghubungi API internal.`);
        }
    }

    // --- Perintah /banlist ---
    if (commandName === "banlist") {
        await interaction.deferReply();
        try {
            const response = await fetch(`${API_URL}/banlist`);
            const data = await response.json();

            if (!response.ok) {
                return await interaction.editReply(`❌ Gagal mengambil banlist: ${data.error || 'Terjadi kesalahan pada API.'}`);
            }

            if (!data || data.length === 0) {
                return await interaction.editReply("✅ Tidak ada user yang di-ban di dalam game ini.");
            }

            // Roblox API mengembalikan key dalam format "UserId_..." jadi kita perlu membersihkannya.
            const bannedUserIDs = data.map(entry => entry.key.split('_')[1] || entry.key).join('\n- ');
            
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('🚫 Daftar Ban Game')
                .setDescription(`Berikut adalah daftar User ID yang saat ini di-ban:\n- ${bannedUserIDs}`)
                .setTimestamp()
                .setFooter({ text: `Total: ${data.length} user` });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error("Error di perintah /banlist:", error);
            await interaction.editReply(`❌ Terjadi kesalahan saat menghubungi API internal.`);
        }
    }
});


// === 4. SETUP EXPRESS SERVER & API ENDPOINTS ===
const app = express();

// --- Endpoint utama untuk health check ---
app.get("/", (req, res) => {
    res.send(`🤖 Bot Discord & API Service berjalan lancar.`);
});

// --- Endpoint API untuk mendapatkan info user Roblox ---
app.get('/userinfo/:username', async (req, res) => {
    const { username } = req.params;
    try {
        // Langkah 1: Dapatkan ID dari username
        const userSearchRes = await fetch(`https://api.roblox.com/users/get-by-username?username=${username}`);
        const userSearchData = await userSearchRes.json();
        
        if (!userSearchData.Id) return res.status(404).json({ error: 'User tidak ditemukan' });
        
        // Langkah 2: Dapatkan detail dari ID
        const userDetailRes = await fetch(`https://users.roblox.com/v1/users/${userSearchData.Id}`);
        const userDetailData = await userDetailRes.json();
        
        // Langkah 3: Kirim data yang sudah rapi
        res.status(200).json({
            id: userDetailData.id,
            name: userDetailData.name,
            displayName: userDetailData.displayName,
            description: userDetailData.description,
            isBanned: userDetailData.isBanned,
            created: userDetailData.created,
            url: `https://www.roblox.com/users/${userDetailData.id}/profile`
        });
    } catch (error) {
        console.error(`API Error on /userinfo/${username}:`, error);
        res.status(500).json({ error: 'Server gagal mengambil data dari Roblox.' });
    }
});

// --- Endpoint API untuk mendapatkan banlist dari DataStore ---
app.get('/banlist', async (req, res) => {
    const DATASTORE_NAME = "BanList"; // Pastikan nama ini sama dengan di script Roblox Anda
    const url = `https://apis.roblox.com/datastores/v1/universes/${UNIVERSE_ID}/datastores/${DATASTORE_NAME}/entries`;

    try {
        const response = await fetch(url, {
            headers: { 'x-api-key': API_KEY }
        });

        if (!response.ok) {
            const error

// index.js
import express from "express";
import fetch from "node-fetch";
import { Client, GatewayIntentBits } from "discord.js";
import 'dotenv/config';

// === KONFIGURASI UTAMA ===
const TOKEN = process.env.DISCORD_TOKEN;
const PORT = process.env.PORT || 8080;
const API_URL = process.env.API_URL; // Pastikan ini diatur di Railway Variables

if (!TOKEN || !API_URL) {
    console.error("❌ Variabel lingkungan DISCORD_TOKEN dan API_URL wajib diisi!");
    process.exit(1); // Hentikan proses jika variabel penting tidak ada
}


// === DISCORD BOT SETUP ===
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent // Tambahkan jika perlu membaca konten pesan
    ],
});

client.once("ready", () => {
    console.log(`🤖 Bot logged in as ${client.user.tag}`);
});

// === COMMAND HANDLER ===
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    if (commandName === "ping") {
        await interaction.reply({ content: "🏓 Pong!", ephemeral: true });
    }

    if (commandName === "banlist") {
        try {
            await interaction.deferReply(); // Memberi tahu Discord bot sedang "berpikir"

            const response = await fetch(`${API_URL}/banlist`);
            if (!response.ok) throw new Error(`API error: ${response.statusText}`);
            
            const data = await response.json();

            if (!data || data.length === 0) {
                await interaction.editReply("⚡ Tidak ada user yang ditemukan di dalam daftar ban.");
            } else {
                const userList = data.map((user) => `- ${user}`).join("\n");
                await interaction.editReply(`🚫 **Daftar User yang Di-ban:**\n${userList}`);
            }
        } catch (error) {
            console.error("Error fetching banlist:", error);
            await interaction.editReply("❌ Gagal mengambil data banlist dari API. Silakan coba lagi nanti.");
        }
    }

    if (commandName === "userinfo") {
        // Logika untuk userinfo bisa ditambahkan di sini
        const username = interaction.options.getString('username');
        await interaction.reply(`🔎 Mencari informasi untuk user: **${username}**... (Fitur ini sedang dalam pengembangan)`);
    }
});

// Login bot ke Discord
client.login(TOKEN);


// === EXPRESS SERVER (Agar tidak di-stop oleh Railway) ===
const app = express();

app.get("/", (req, res) => {
    res.send(`🤖 Bot Discord ${client.user ? client.user.tag : '(starting)'} sedang berjalan.`);
});

app.listen(PORT, () => {
    console.log(`🌐 Server berjalan di port ${PORT}`);
});

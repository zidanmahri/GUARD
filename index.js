// index.js (Versi Debug)

import express from "express";
import fetch from "node-fetch";
import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import 'dotenv/config';

console.log("[DEBUG] Memulai script index.js...");

// === 1. KONFIGURASI & PEMERIKSAAN VARIABEL LINGKUNGAN ===
const TOKEN = process.env.DISCORD_TOKEN;
const PORT = process.env.PORT || 8080;
const API_URL = process.env.API_URL;
const UNIVERSE_ID = process.env.UNIVERSE_ID;
const API_KEY = process.env.ROBLOX_API_KEY;

if (!TOKEN || !API_URL || !UNIVERSE_ID || !API_KEY) {
    console.error("❌ Salah satu atau lebih variabel lingkungan wajib belum diatur!");
    console.error("Pastikan DISCORD_TOKEN, API_URL, UNIVERSE_ID, dan ROBLOX_API_KEY sudah ada.");
    process.exit(1);
}
console.log("[DEBUG] ✅ Variabel lingkungan berhasil dimuat.");


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
    // ... (Kode handler perintah tidak diubah, jadi kita biarkan seperti adanya)
    if (!interaction.isChatInputCommand()) return;
    const { commandName } = interaction;
    if (commandName === "ping") { await interaction.reply({ content: "🏓 Pong!", ephemeral: true }); }
    // ... (Handler /userinfo dan /banlist lainnya ada di sini)
});
console.log("[DEBUG] ✅ Event handler Discord sudah diatur.");


// === 4. SETUP EXPRESS SERVER & API ENDPOINTS ===
const app = express();
app.get("/", (req, res) => { res.send(`🤖 Bot Discord & API Service berjalan lancar.`); });
// ... (Endpoint /userinfo dan /banlist lainnya ada di sini)
console.log("[DEBUG] ✅ Server Express dan endpoint sudah diatur.");


// === 5. JALANKAN SEMUANYA DENGAN PENANGANAN ERROR ===
try {
    console.log("[DEBUG] Mencoba menjalankan server Express...");
    app.listen(PORT, () => {
        console.log(`🌐 Server Express berhasil berjalan di port ${PORT}`);
    });

    console.log("[DEBUG] Mencoba login ke Discord...");
    // Tambahkan .catch() untuk menangkap error spesifik saat login
    client.login(TOKEN).catch(err => {
        console.error("❌ GAGAL LOGIN KE DISCORD:", err.message);
        process.exit(1); // Matikan proses jika login gagal
    });

} catch (error) {
    console.error("❌ TERJADI ERROR FATAL SAAT STARTUP:", error);
    process.exit(1);
}

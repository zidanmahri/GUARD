// deploy-commands.js
import { REST, Routes, SlashCommandBuilder } from "discord.js";
import 'dotenv/config'; // Pastikan dotenv diinstal: npm i dotenv

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

// Daftar semua perintah slash bot Anda di sini
const commands = [
    new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Cek latensi bot dan memastikan bot online."),
    new SlashCommandBuilder()
        .setName("banlist")
        .setDescription("Menampilkan daftar semua user Roblox yang di-ban."),
    new SlashCommandBuilder()
        .setName("userinfo")
        .setDescription("Mencari informasi spesifik tentang user Roblox.")
        .addStringOption(option =>
            option.setName("username")
                .setDescription("Username Roblox yang ingin dicari.")
                .setRequired(true)),
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        console.log(`🚀 Memulai mendaftarkan ${commands.length} perintah aplikasi (/).`);

        // Gunakan Routes.applicationCommands(CLIENT_ID) untuk mendaftarkan perintah secara global
        const data = await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands },
        );

        console.log(`✅ Berhasil mendaftarkan ${data.length} perintah aplikasi.`);
    } catch (error) {
        console.error("❌ Gagal mendaftarkan perintah:", error);
    }
})();

// index.js (Versi dengan fungsi /ban)

import express from "express";
import fetch from "node-fetch";
import { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField } from "discord.js";
import 'dotenv/config';

// === 1. KONFIGURASI ===
const TOKEN = process.env.DISCORD_TOKEN;
const PORT = process.env.PORT || 8080;
const UNIVERSE_ID = process.env.UNIVERSE_ID;
const API_KEY = process.env.ROBLOX_API_KEY;
// ... (Pastikan variabel lain sudah ada)

// === FUNGSI HELPER (Tidak berubah) ===
async function getRobloxUserInfo(username) { /* ... (fungsi dari sebelumnya) ... */ }
async function getBanlistFromRoblox() { /* ... (fungsi dari sebelumnya) ... */ }

// (Salin fungsi getRobloxUserInfo dan getBanlistFromRoblox dari kode sebelumnya ke sini)
async function getRobloxUserInfo(username) {
    const userSearchRes = await fetch(`https://api.roblox.com/users/get-by-username?username=${username}`);
    const userSearchData = await userSearchRes.json();
    if (!userSearchData.Id) throw new Error('User Roblox tidak ditemukan.');
    const userDetailRes = await fetch(`https://users.roblox.com/v1/users/${userSearchData.Id}`);
    const userDetailData = await userDetailRes.json();
    return { id: userDetailData.id, name: userDetailData.name, displayName: userDetailData.displayName, description: userDetailData.description, isBanned: userDetailData.isBanned, created: userDetailData.created, url: `https://www.roblox.com/users/${userDetailData.id}/profile` };
}
async function getBanlistFromRoblox() {
    const DATASTORE_NAME = "BanList";
    const url = `https://apis.roblox.com/datastores/v1/universes/${UNIVERSE_ID}/datastores/${DATASTORE_NAME}/entries`;
    const response = await fetch(url, { headers: { 'x-api-key': API_KEY } });
    if (!response.ok) { const errorBody = await response.text(); throw new Error(`Gagal mengambil data dari Roblox Open Cloud: ${response.statusText} | ${errorBody}`); }
    const data = await response.json();
    return data.entries;
}


// === 2. SETUP DISCORD BOT ===
const client = new Client({ intents: [GatewayIntentBits.Guilds] }); // Cukup Guilds jika hanya pakai slash command
client.once('clientReady', () => console.log(`✅ Bot Discord online sebagai ${client.user.tag}`));


// === 3. COMMAND HANDLER ===
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName } = interaction;

    // ... (Handler untuk /ping, /userinfo, /banlist tidak berubah)
    if (commandName === 'banlist') { /* ... (kode banlist dari sebelumnya) ... */ }
    if (commandName === 'userinfo') { /* ... (kode userinfo dari sebelumnya) ... */ }
    if (commandName === 'ping') { await interaction.reply({ content: "Pong!", ephemeral: true }); }

    // ===== LOGIKA BARU UNTUK /ban =====
    if (commandName === "ban") {
        // PENTING: Cek izin! Hanya admin yang boleh menggunakan perintah ini.
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return await interaction.reply({ content: "❌ Anda tidak memiliki izin untuk menggunakan perintah ini.", ephemeral: true });
        }

        const username = interaction.options.getString('username');
        const reason = interaction.options.getString('reason') || "Tidak ada alasan.";
        
        await interaction.deferReply();

        try {
            // Bot memanggil API-nya sendiri untuk melakukan ban
            const response = await fetch(`${process.env.API_URL}/ban-player`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: username,
                    reason: reason,
                    bannedBy: interaction.user.tag // Kirim siapa yang melakukan ban
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
app.use(express.json()); // Middleware untuk membaca body JSON dari request

app.get("/", (req, res) => res.send(`🤖 Bot & API Service berjalan.`));

// ... (Endpoint /userinfo dan /banlist tidak berubah)
app.get('/userinfo/:username', async (req, res) => { try { const data = await getRobloxUserInfo(req.params.username); res.status(200).json(data); } catch (error) { res.status(404).json({ error: error.message }); } });
app.get('/banlist', async (req, res) => { try { const data = await getBanlistFromRoblox(); res.status(200).json(data); } catch (error) { res.status(500).json({ error: error.message }); } });


// ===== ENDPOINT BARU UNTUK MEM-BAN =====
app.post('/ban-player', async (req, res) => {
    const { username, reason, bannedBy } = req.body;

    if (!username) {
        return res.status(400).json({ error: "Username pemain diperlukan." });
    }

    try {
        // Dapatkan dulu UserId dari username
        const userInfo = await getRobloxUserInfo(username);
        const userId = userInfo.id;
        const key = tostring(userId); // Kunci DataStore adalah UserId

        const dataToSave = {
            reason: reason || "Tidak ada alasan.",
            bannedBy: bannedBy || "Sistem",
            timestamp: Math.floor(Date.now() / 1000)
        };
        
        const DATASTORE_NAME = "BanList";
        const url = `https://apis.roblox.com/datastores/v1/universes/${UNIVERSE_ID}/datastores/${DATASTORE_NAME}/entries/entry`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'x-api-key': API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dataToSave),
            params: {
                'datastoreEntryKey': key
            }
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

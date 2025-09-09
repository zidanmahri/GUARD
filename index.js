// index.js (Versi Final dengan Tampilan /userinfo Baru)

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
    console.error("❌ Variabel lingkungan wajib belum diatur!");
    process.exit(1);
}

// === FUNGSI HELPER YANG DIPERBARUI ===

async function getRobloxUserInfo(username) {
    // Langkah 1: Dapatkan ID dari username
    const userSearchRes = await fetch(`https://api.roblox.com/users/get-by-username?username=${username}`);
    const userSearchData = await userSearchRes.json();
    if (!userSearchData.Id) throw new Error('User Roblox tidak ditemukan.');
    
    const userId = userSearchData.Id;

    // Langkah 2: Panggil semua API yang dibutuhkan secara bersamaan untuk efisiensi
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
    
    // Langkah 3: Gabungkan semua data menjadi satu objek
    return {
        id: detailsData.id,
        name: detailsData.name,
        displayName: detailsData.displayName,
        description: detailsData.description || "No description.",
        isBanned: detailsData.isBanned,
        created: detailsData.created,
        url: `https://www.roblox.com/users/${userId}/profile`,
        friendsCount: friendsData.count,
        followersCount: followersData.count,
        followingsCount: followingsData.count
    };
}

async function getBanlistFromRoblox() { /* ... (fungsi dari sebelumnya, tidak berubah) ... */ }
// (Salin fungsi getBanlistFromRoblox dari kode sebelumnya ke sini)
async function getBanlistFromRoblox() {
    const DATASTORE_NAME = "BanList";
    const url = `https://apis.roblox.com/datastores/v1/universes/${UNIVERSE_ID}/datastores/${DATASTORE_NAME}/entries`;
    const response = await fetch(url, { headers: { 'x-api-key': API_KEY } });
    if (!response.ok) { const errorBody = await response.text(); throw new Error(`Gagal mengambil data dari Roblox Open Cloud: ${response.statusText} | ${errorBody}`); }
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

    if (commandName === 'ping') { /* ... (tidak berubah) ... */ }
    if (commandName === 'banlist') { /* ... (tidak berubah) ... */ }
    if (commandName === "ban") { /* ... (tidak berubah) ... */ }

    // ===== LOGIKA /userinfo YANG DIPERBARUI TOTAL =====
    if (commandName === "userinfo") {
        const username = interaction.options.getString('username');
        // Defer reply secara ephemeral agar hanya user yang bisa lihat
        await interaction.deferReply({ ephemeral: true }); 
        
        try {
            const data = await getRobloxUserInfo(username);
            
            // Format tanggal agar lebih mudah dibaca dan hitung umur akun
            const creationDate = new Date(data.created);
            const accountAge = new Date().getFullYear() - creationDate.getFullYear();
            const formattedDate = creationDate.toLocaleDateString('id-ID', {
                day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });

            const embed = new EmbedBuilder()
                .setColor(0x5865F2) // Warna biru Discord
                .setAuthor({ name: `${interaction.client.user.username} /userinfo` })
                .addFields(
                    // Baris 1
                    { name: 'Display Name', value: `\`${data.displayName}\``, inline: true },
                    { name: 'Username', value: `\`@${data.name}\``, inline: true },
                    { name: 'ID', value: `\`${data.id}\``, inline: true },
                    // Baris 2
                    { name: 'Friends', value: `\`${data.friendsCount.toLocaleString('id-ID')}\``, inline: true },
                    { name: 'Followers', value: `\`${data.followersCount.toLocaleString('id-ID')}\``, inline: true },
                    { name: 'Following', value: `\`${data.followingsCount.toLocaleString('id-ID')}\``, inline: true },
                    // Baris 3
                    { name: 'Description', value: `\`\`\`${data.description}\`\`\`` },
                    // Baris 4
                    { name: 'Account Created', value: `${formattedDate} (${accountAge} years ago)` },
                )
                .setTimestamp();

            // Membuat tombol
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('View Notes')
                        .setStyle(ButtonStyle.Secondary)
                        .setCustomId('view_notes_button') // Kita beri ID tapi tidak akan kita fungsikan
                        .setDisabled(true), // Kita nonaktifkan karena fiturnya belum ada
                    new ButtonBuilder()
                        .setLabel('View Profile on Roblox')
                        .setStyle(ButtonStyle.Link)
                        .setURL(data.url)
                );

            await interaction.editReply({ embeds: [embed], components: [row] });

        } catch (error) {
            await interaction.editReply({ content: `❌ Gagal mendapatkan info: ${error.message}` });
        }
    }
});


// === 4. EXPRESS SERVER & API ===
// (Tidak ada perubahan di bagian ini, salin dari kode sebelumnya)
const app = express();
app.use(express.json()); 
app.get("/", (req, res) => res.send(`🤖 Bot & API Service berjalan.`));
app.get('/userinfo/:username', async (req, res) => { try { const data = await getRobloxUserInfo(req.params.username); res.status(200).json(data); } catch (error) { res.status(404).json({ error: error.message }); } });
app.get('/banlist', async (req, res) => { try { const data = await getBanlistFromRoblox(); res.status(200).json(data); } catch (error) { res.status(500).json({ error: error.message }); } });
app.post('/ban-player', async (req, res) => { /* ... (endpoint dari sebelumnya) ... */ });


// === 5. JALANKAN SEMUANYA ===
client.login(TOKEN);
app.listen(PORT, () => {
    console.log(`🌐 Server Express berjalan di port ${PORT}`);
});

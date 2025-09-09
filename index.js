import "dotenv/config";
import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } from "discord.js";
import express from "express";
import fetch from "node-fetch";

// ========== SETUP DISCORD CLIENT ==========
const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// ========== EXPRESS API (opsional untuk monitoring) ==========
const app = express();
const PORT = process.env.PORT || 3000;

let banList = []; // penyimpanan ban list lokal

app.get("/", (req, res) => {
    res.send("RBXGuard API Aktif 🚀");
});

app.get("/banlist", (req, res) => {
    res.json(banList);
});

app.listen(PORT, () => {
    console.log(`✅ API berjalan di port ${PORT}`);
});

// ========== FUNGSI ROBLOX API ==========
async function getRobloxUserInfo(username) {
    // 1. Cari userId berdasarkan username
    const userSearchRes = await fetch("https://users.roblox.com/v1/usernames/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernames: [username] })
    });

    const userSearchData = await userSearchRes.json();
    if (!userSearchData.data || userSearchData.data.length === 0) {
        throw new Error(`User Roblox "${username}" tidak ditemukan.`);
    }

    const userId = userSearchData.data[0].id;

    // 2. Ambil detail akun + statistik
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

// ========== SLASH COMMANDS ==========
const commands = [
    new SlashCommandBuilder()
        .setName("ban")
        .setDescription("Ban user Roblox")
        .addStringOption(opt => opt.setName("username").setDescription("Roblox username").setRequired(true)),

    new SlashCommandBuilder()
        .setName("unban")
        .setDescription("Unban user Roblox")
        .addStringOption(opt => opt.setName("username").setDescription("Roblox username").setRequired(true)),

    new SlashCommandBuilder()
        .setName("banlist")
        .setDescription("Lihat daftar banlist"),

    new SlashCommandBuilder()
        .setName("cekprofil")
        .setDescription("Cek profil user Roblox")
        .addStringOption(opt => opt.setName("username").setDescription("Roblox username").setRequired(true))
].map(cmd => cmd.toJSON());

// Register commands ke Discord
const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log("⏳ Registering slash commands...");
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
        console.log("✅ Slash commands berhasil di-register!");
    } catch (err) {
        console.error("❌ Error register commands:", err);
    }
})();

// ========== HANDLE COMMANDS ==========
client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    try {
        if (commandName === "ban") {
            const username = interaction.options.getString("username");
            const userInfo = await getRobloxUserInfo(username);

            if (!banList.find(u => u.id === userInfo.id)) {
                banList.push(userInfo);
            }

            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(`🚫 Banned ${userInfo.name}`)
                        .setDescription(`[Profile Link](${userInfo.url})`)
                        .addFields(
                            { name: "Display Name", value: userInfo.displayName, inline: true },
                            { name: "Friends", value: userInfo.friendsCount.toString(), inline: true },
                            { name: "Followers", value: userInfo.followersCount.toString(), inline: true }
                        )
                        .setColor("Red")
                ]
            });
        }

        if (commandName === "unban") {
            const username = interaction.options.getString("username");
            const userInfo = await getRobloxUserInfo(username);

            banList = banList.filter(u => u.id !== userInfo.id);

            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(`✅ Unbanned ${userInfo.name}`)
                        .setDescription(`[Profile Link](${userInfo.url})`)
                        .setColor("Green")
                ]
            });
        }

        if (commandName === "banlist") {
            if (banList.length === 0) {
                await interaction.reply("📭 Banlist kosong.");
                return;
            }

            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("📌 Daftar Banlist")
                        .setDescription(banList.map(u => `- [${u.name}](${u.url})`).join("\n"))
                        .setColor("Orange")
                ]
            });
        }

        if (commandName === "cekprofil") {
            const username = interaction.options.getString("username");
            const userInfo = await getRobloxUserInfo(username);

            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(`👤 Profil ${userInfo.name}`)
                        .setDescription(`[Profile Link](${userInfo.url})`)
                        .addFields(
                            { name: "Display Name", value: userInfo.displayName, inline: true },
                            { name: "Friends", value: userInfo.friendsCount.toString(), inline: true },
                            { name: "Followers", value: userInfo.followersCount.toString(), inline: true },
                            { name: "Following", value: userInfo.followingsCount.toString(), inline: true },
                            { name: "Banned?", value: userInfo.isBanned ? "❌ Yes" : "✅ No", inline: true },
                            { name: "Created", value: userInfo.created }
                        )
                        .setColor("Blue")
                ]
            });
        }
    } catch (err) {
        console.error("❌ Command error:", err);
        await interaction.reply({ content: "⚠️ Terjadi kesalahan, coba lagi nanti.", ephemeral: true });
    }
});

// ========== LOGIN BOT ==========
client.once("clientReady", c => {
    console.log(`🤖 Logged in sebagai ${c.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);

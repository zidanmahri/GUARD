// index.js (Versi Final Gabungan - Perbaikan Duplikasi)

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

// === FUNGSI HELPER UNTUK MENGAMBIL DATA ===

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

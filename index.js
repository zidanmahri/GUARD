// index.js (versi komplit)

// === IMPORT MODULES ===
import express from "express";
import fetch from "node-fetch";
import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  PermissionsBitField,
  REST,
  Routes
} from "discord.js";
import "dotenv/config";

// === KONFIGURASI ENV ===
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID; // opsional
const PORT = process.env.PORT || 8080;
const UNIVERSE_ID = process.env.UNIVERSE_ID;
const API_KEY = process.env.ROBLOX_API_KEY;

if (!TOKEN || !CLIENT_ID || !UNIVERSE_ID || !API_KEY) {
  console.error("❌ ENV kurang lengkap!");
  process.exit(1);
}

// === HELPER ROBLOX API ===
async function getRobloxUserInfo(username) {
  const search = await fetch(
    `https://api.roblox.com/users/get-by-username?username=${username}`
  );
  const data = await search.json();
  if (!data.Id) throw new Error("User tidak ditemukan!");

  const details = await fetch(`https://users.roblox.com/v1/users/${data.Id}`);
  const detailsData = await details.json();

  return {
    id: detailsData.id,
    name: detailsData.name,
    displayName: detailsData.displayName,
    description: detailsData.description || "No description.",
    created: detailsData.created,
    url: `ht

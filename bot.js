import { Client, GatewayIntentBits } from "discord.js";
import fetch from "node-fetch";
import express from "express";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const TOKEN = process.env.DISCORD_TOKEN;
const API_URL = "https://guard-production-8d97.up.railway.app"; // ganti sesuai API kamu

client.once("ready", () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.content === "!ping") {
    return message.reply("🏓 Pong!");
  }
});

// login bot
client.login(TOKEN);

// ✅ Tambah express biar Railway gak stop
const app = express();
const PORT = process.env.PORT || 8080;

app.get("/", (req, res) => {
  res.send("🤖 Discord bot is running!");
});

app.listen(PORT, () => {
  console.log(`🌐 Bot service running on port ${PORT}`);
});

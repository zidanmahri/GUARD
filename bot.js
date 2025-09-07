import { Client, GatewayIntentBits } from "discord.js";
import fetch from "node-fetch";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const TOKEN = process.env.DISCORD_TOKEN; 
const API_URL = process.env.API_URL || "https://guard-production-8d97.up.railway.app";

client.once("ready", () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.content === "!banlist") {
    try {
      const res = await fetch(`${API_URL}/banlist`);
      const data = await res.json();

      if (data.length === 0) return message.reply("✅ Banlist kosong.");

      let list = data.map(u => `- **${u.username}** (Reason: ${u.reason})`).join("\n");
      message.reply(`🚫 Banlist:\n${list}`);
    } catch (err) {
      console.error(err);
      message.reply("⚠️ Gagal ambil data dari API.");
    }
  }

  if (message.content.startsWith("!ban ")) {
    const username = message.content.split(" ")[1];
    try {
      await fetch(`${API_URL}/ban`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, reason: "Banned via Discord bot" })
      });
      message.reply(`🚫 User **${username}** berhasil di-ban.`);
    } catch (err) {
      console.error(err);
      message.reply("⚠️ Gagal ban user.");
    }
  }

  if (message.content.startsWith("!unban ")) {
    const username = message.content.split(" ")[1];
    try {
      await fetch(`${API_URL}/unban`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username })
      });
      message.reply(`✅ User **${username}** berhasil di-unban.`);
    } catch (err) {
      console.error(err);
      message.reply("⚠️ Gagal unban user.");
    }
  }
});

client.login(TOKEN);

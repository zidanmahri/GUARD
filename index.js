import { Client, GatewayIntentBits } from "discord.js";
import fetch from "node-fetch";
import "dotenv/config";

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// 🔹 Prefix command
client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;

  if (msg.content === "!ping") {
    msg.reply("🏓 Pong!");
  }

  if (msg.content.startsWith("!banlist")) {
    try {
      const res = await fetch(`${process.env.API_BASE}/banlist`);
      const data = await res.json();

      if (!data || data.length === 0) {
        msg.reply("📋 Banlist kosong.");
      } else {
        const list = data.map((u, i) => `${i + 1}. ${u.username} - ${u.reason}`).join("\n");
        msg.reply(`📋 Banlist:\n${list}`);
      }
    } catch (err) {
      msg.reply("⚠️ Gagal ambil data dari API.");
    }
  }
});

// 🔹 Slash command
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "ping") {
    await interaction.reply("🏓 Pong!");
  }

  if (interaction.commandName === "banlist") {
    try {
      const res = await fetch(`${process.env.API_BASE}/banlist`);
      const data = await res.json();

      if (!data || data.length === 0) {
        await interaction.reply("📋 Banlist kosong.");
      } else {
        const list = data.map((u, i) => `${i + 1}. ${u.username} - ${u.reason}`).join("\n");
        await interaction.reply(`📋 Banlist:\n${list}`);
      }
    } catch (err) {
      await interaction.reply("⚠️ Gagal ambil data dari API.");
    }
  }

  if (interaction.commandName === "userinfo") {
    const username = interaction.options.getString("username");
    try {
      const res = await fetch(`${process.env.API_BASE}/userinfo?username=${username}`);
      const data = await res.json();

      if (!data) {
        await interaction.reply(`❌ User **${username}** tidak ditemukan.`);
      } else {
        await interaction.reply(`👤 Info User:\n- Username: ${data.username}\n- ID: ${data.id}\n- Status: ${data.status}`);
      }
    } catch (err) {
      await interaction.reply("⚠️ Gagal ambil data user.");
    }
  }
});

client.login(process.env.DISCORD_TOKEN);

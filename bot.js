import { Client, GatewayIntentBits } from "discord.js";
import axios from "axios";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
client.login(DISCORD_TOKEN);
const API_URL = process.env.API_URL || "https://guard-production-8d97.up.railway.app"; // nanti ganti Railway URL

client.on("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const args = message.content.split(" ");
  const command = args.shift().toLowerCase();

  if (command === "!ban") {
    const username = args[0];
    const reason = args.slice(1).join(" ") || "No reason";
    if (!username) return message.reply("⚠️ Format: `!ban <username> <reason>`");

    await axios.post(`${API_URL}/ban`, { username, reason });
    message.reply(`🚫 User **${username}** berhasil di-ban. Alasan: ${reason}`);
  }

  if (command === "!unban") {
    const username = args[0];
    if (!username) return message.reply("⚠️ Format: `!unban <username>`");

    await axios.post(`${API_URL}/unban`, { username });
    message.reply(`✅ User **${username}** sudah di-unban.`);
  }

  if (command === "!banlist") {
    const res = await axios.get(`${API_URL}/banlist`);
    const list = res.data.map(u => `- ${u.username} (${u.reason})`).join("\n") || "Banlist kosong ✅";
    message.reply(`📜 **Banlist:**\n${list}`);
  }
});

client.login(DISCORD_TOKEN);

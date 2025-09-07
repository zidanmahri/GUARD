import express from "express";
import fetch from "node-fetch";
import { Client, GatewayIntentBits, REST, Routes } from "discord.js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

// === DISCORD BOT SETUP ===
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// Command handler
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "ping") {
    await interaction.reply("🏓 Pong!");
  }

  if (interaction.commandName === "banlist") {
    try {
      const res = await fetch(`${process.env.API_BASE}/banlist`);
      const data = await res.json();

      if (data.length === 0) {
        await interaction.reply("⚡ Tidak ada user yang diban.");
      } else {
        await interaction.reply(
          "🚫 Daftar banned:\n" + data.map((u) => `- ${u}`).join("\n")
        );
      }
    } catch (err) {
      console.error(err);
      await interaction.reply("❌ Gagal mengambil banlist dari API.");
    }
  }
});

// === REGISTER SLASH COMMANDS ===
const commands = [
  { name: "ping", description: "Cek apakah bot online" },
  { name: "banlist", description: "Lihat daftar ban" },
];

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log("⏳ Refreshing application (/) commands...");

    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      { body: commands }
    );

    console.log("✅ Successfully registered commands.");
  } catch (error) {
    console.error(error);
  }
})();

client.login(process.env.DISCORD_TOKEN);

// === EXPRESS SERVER ===
app.get("/", (req, res) => {
  res.send("Bot & API Running 🚀");
});

app.listen(process.env.PORT || 3000, () => {
  console.log("🌐 Server running on port " + (process.env.PORT || 3000));
});

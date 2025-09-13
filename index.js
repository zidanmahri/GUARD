const fs = require("fs");
const path = require("path");
const { Client, GatewayIntentBits, Collection, REST, Routes } = require("discord.js");
const express = require('express');
const app = express();
const BANS_FILE = path.join(__dirname, 'bans.json');

function loadBans() {
  try {
    return JSON.parse(fs.readFileSync(BANS_FILE, 'utf8')) || [];
  } catch (e) {
    return [];
  }
}
require("dotenv").config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

// === Load command files dari root (bukan folder) ===
const commandFiles = fs.readdirSync(__dirname).filter(file => file.endsWith(".js") && file !== "index.js");

const commands = [];
for (const file of commandFiles) {
  const command = require(path.join(__dirname, file));
  if ("data" in command && "execute" in command) {
    client.commands.set(command.data.name, command);
    commands.push(command.data.toJSON());
  } else {
    console.log(`⚠️ Command di ${file} tidak punya "data" atau "execute"`);
  }
}

// === Register commands ===
const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log("⏳ Registering slash commands...");
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log("✅ Slash commands berhasil di-register!");
  } catch (err) {
    console.error(err);
  }
})();

// === Handle interaction ===
client.on("interactionCreate", async interaction => {
  if (!interaction.isCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(err);
    await interaction.reply({ content: "❌ Error saat menjalankan command!", ephemeral: true });
  }
});

// === Bot Ready ===
client.once("ready", () => {
  console.log(`✅ Bot login sebagai ${client.user.tag}`);
});

// === Login ===
client.login(process.env.DISCORD_TOKEN);

// === Simple HTTP server untuk game Roblox mengambil bans ===
app.get('/bans', (req, res) => {
  res.json(loadBans());
});

// root for healthchecks
app.get('/', (req, res) => {
  res.send('GUARD bot is running');
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`HTTP server berjalan di http://localhost:${port}`));

const fs = require("fs");
const path = require("path");
const { Client, GatewayIntentBits, Collection, REST, Routes } = require("discord.js");
const express = require('express');
const app = express();
app.use(express.json());
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

// Backwards-compatible API endpoints for external services to create/remove bans
app.post('/api/bans', (req, res) => {
  const token = process.env.BAN_TOKEN || process.env.ROBLOX_API_KEY;
  const auth = req.get('authorization') || '';
  if (token && auth !== `Bearer ${token}`) return res.status(401).json({ error: 'Unauthorized' });

  const body = req.body;
  if (!body || (!body.userId && !body.username)) return res.status(400).json({ error: 'Missing userId or username' });

  const bans = loadBans();
  // determine next id (incremental)
  const maxId = bans.reduce((m, b) => Math.max(m, Number(b.id || 0)), 0);
  const entry = {
    id: (maxId + 1),
    userId: body.userId || body.id || null,
    username: body.username || null,
    reason: body.reason || 'No reason provided',
    bannedBy: body.bannedBy || 'system',
    timestamp: body.timestamp || new Date().toISOString()
  };
  // avoid duplicates by userId or username
  if (entry.userId && bans.find(b => b.userId == entry.userId)) return res.status(200).json({ ok: true, note: 'already banned' });
  if (entry.username && bans.find(b => b.username && b.username.toLowerCase() === (entry.username||'').toLowerCase())) return res.status(200).json({ ok: true, note: 'already banned' });

  bans.push(entry);
  fs.writeFileSync(BANS_FILE, JSON.stringify(bans, null, 2));
  return res.status(201).json({ ok: true, entry });
});

app.post('/api/bans/unban', (req, res) => {
  const token = process.env.BAN_TOKEN || process.env.ROBLOX_API_KEY;
  const auth = req.get('authorization') || '';
  if (token && auth !== `Bearer ${token}`) return res.status(401).json({ error: 'Unauthorized' });

  const body = req.body;
  if (!body || !body.input) return res.status(400).json({ error: 'Missing input' });

  const bans = loadBans();
  const before = bans.length;
  const filtered = bans.filter(b => {
    if (!b) return false;
    if (b.username && b.username.toLowerCase() === (body.input||'').toLowerCase()) return false;
    if (b.userId && b.userId.toString() === (''+body.input)) return false;
    return true;
  });
  fs.writeFileSync(BANS_FILE, JSON.stringify(filtered, null, 2));
  return res.json({ ok: true, removed: before - filtered.length });
});

// Return bans after a given id (for incremental polling from game servers)
app.get('/api/bans/after', (req, res) => {
  const since = Number(req.query.since || 0);
  const bans = loadBans();
  const filtered = bans.filter(b => Number(b.id || 0) > since);
  return res.json(filtered);
});

// root for healthchecks
app.get('/', (req, res) => {
  res.send('GUARD bot is running');
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`HTTP server berjalan di http://localhost:${port}`));

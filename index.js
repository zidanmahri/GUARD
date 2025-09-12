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
    url: `https://www.roblox.com/users/${data.Id}/profile`
  };
}

async function getBanlistFromRoblox() {
  const DATASTORE_NAME = "BanList";
  const url = `https://apis.roblox.com/datastores/v1/universes/${UNIVERSE_ID}/datastores/${DATASTORE_NAME}/entries`;
  const response = await fetch(url, { headers: { "x-api-key": API_KEY } });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gagal ambil banlist: ${err}`);
  }
  return (await response.json()).entries;
}

async function banUserOnRoblox(userId, reason, bannedBy) {
  const DATASTORE_NAME = "BanList";
  const url = `https://apis.roblox.com/datastores/v1/universes/${UNIVERSE_ID}/datastores/${DATASTORE_NAME}/entries/entry?datastoreEntryKey=${userId}`;
  const dataToSave = {
    reason,
    bannedBy,
    timestamp: Math.floor(Date.now() / 1000)
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "x-api-key": API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(dataToSave)
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
  return true;
}

async function unbanUserOnRoblox(userId) {
  const DATASTORE_NAME = "BanList";
  const url = `https://apis.roblox.com/datastores/v1/universes/${UNIVERSE_ID}/datastores/${DATASTORE_NAME}/entries/entry?datastoreEntryKey=${userId}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: { "x-api-key": API_KEY }
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
  return true;
}

// === DISCORD BOT SETUP ===
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// daftar command
const commands = [
  {
    name: "ping",
    description: "Cek respon bot"
  },
  {
    name: "userinfo",
    description: "Cek info user Roblox",
    options: [
      {
        name: "username",
        type: 3,
        description: "Username Roblox",
        required: true
      }
    ]
  },
  {
    name: "ban",
    description: "Ban pemain Roblox",
    options: [
      { name: "username", type: 3, description: "Username Roblox", required: true },
      { name: "reason", type: 3, description: "Alasan ban", required: false }
    ]
  },
  {
    name: "unban",
    description: "Unban pemain Roblox",
    options: [{ name: "username", type: 3, description: "Username Roblox", required: true }]
  },
  {
    name: "banlist",
    description: "Lihat daftar ban"
  }
];

// register slash commands
const rest = new REST({ version: "10" }).setToken(TOKEN);
(async () => {
  try {
    console.log("⏳ Registering slash commands...");
    if (GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
        body: commands
      });
    } else {
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    }
    console.log("✅ Slash commands berhasil di-register!");
  } catch (err) {
    console.error("❌ Error register command:", err);
  }
})();

client.once("ready", () => {
  console.log(`🤖 Bot login sebagai ${client.user.tag}`);
});

// handler command
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const { commandName } = interaction;

  if (commandName === "ping") {
    return interaction.reply({ content: "🏓 Pong!", ephemeral: true });
  }

  if (commandName === "userinfo") {
    const username = interaction.options.getString("username");
    await interaction.deferReply();
    try {
      const info = await getRobloxUserInfo(username);
      const embed = new EmbedBuilder()
        .setColor("Blue")
        .setTitle(`${info.displayName} (@${info.name})`)
        .setDescription(info.description)
        .addFields(
          { name: "UserID", value: `${info.id}` },
          { name: "Profile", value: `[Klik Disini](${info.url})` },
          { name: "Created", value: info.created }
        )
        .setTimestamp();
      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await interaction.editReply(`❌ ${err.message}`);
    }
  }

  if (commandName === "ban") {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return interaction.reply({
        content: "❌ Tidak ada izin ban!",
        ephemeral: true
      });
    }
    const username = interaction.options.getString("username");
    const reason = interaction.options.getString("reason") || "Tidak ada alasan";
    await interaction.deferReply();
    try {
      const info = await getRobloxUserInfo(username);
      await banUserOnRoblox(info.id, reason, interaction.user.tag);
      await interaction.editReply(`✅ ${username} berhasil di-ban (ID: ${info.id})`);
    } catch (err) {
      await interaction.editReply(`❌ ${err.message}`);
    }
  }

  if (commandName === "unban") {
    const username = interaction.options.getString("username");
    await interaction.deferReply();
    try {
      const info = await getRobloxUserInfo(username);
      await unbanUserOnRoblox(info.id);
      await interaction.editReply(`✅ ${username} berhasil di-unban`);
    } catch (err) {
      await interaction.editReply(`❌ ${err.message}`);
    }
  }

  if (commandName === "banlist") {
    await interaction.deferReply();
    try {
      const list = await getBanlistFromRoblox();
      if (!list || list.length === 0) {
        return interaction.editReply("✅ Tidak ada user yang di-ban.");
      }
      const users = list.map((e) => `- ${e.key}`).join("\n");
      const embed = new EmbedBuilder()
        .setColor("Red")
        .setTitle("🚫 Daftar Ban")
        .setDescription(users)
        .setFooter({ text: `Total ${list.length} user` });
      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await interaction.editReply(`❌ ${err.message}`);
    }
  }
});

// === EXPRESS API (untuk Roblox) ===
const app = express();
app.use(express.json());

app.get("/", (req, res) => res.send("✅ API bot jalan."));

app.get("/banlist", async (req, res) => {
  try {
    const list = await getBanlistFromRoblox();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/ban", async (req, res) => {
  const { userId, reason, bannedBy } = req.body;
  if (!userId) return res.status(400).json({ error: "UserId wajib" });
  try {
    await banUserOnRoblox(userId, reason || "Tidak ada alasan", bannedBy || "System");
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/unban", async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "UserId wajib" });
  try {
    await unbanUserOnRoblox(userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`✅ API berjalan di port ${PORT}`));

// === LOGIN DISCORD BOT ===
client.login(TOKEN);

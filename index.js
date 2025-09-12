const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require("discord.js");
const fs = require("fs");
const fetch = require("node-fetch");
require("dotenv").config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// database sementara
let db = { bannedUsers: [] };
if (fs.existsSync("database.json")) {
  db = JSON.parse(fs.readFileSync("database.json"));
}

// daftar commands
const commands = [
  new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban user Roblox")
    .addStringOption(opt =>
      opt.setName("username").setDescription("Username Roblox").setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Unban user Roblox")
    .addStringOption(opt =>
      opt.setName("username").setDescription("Username Roblox").setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("banlist")
    .setDescription("Lihat semua user yang diban"),
  new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Cek profil user Roblox")
    .addStringOption(opt =>
      opt.setName("username").setDescription("Username Roblox").setRequired(true)
    )
].map(cmd => cmd.toJSON());

// register slash commands
const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log("⏳ Registering slash commands...");
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log("✅ Slash commands berhasil di-register!");
  } catch (err) {
    console.error(err);
  }
})();

client.on("interactionCreate", async interaction => {
  if (!interaction.isCommand()) return;
  const { commandName } = interaction;

  if (commandName === "ban") {
    const username = interaction.options.getString("username");
    if (db.bannedUsers.includes(username)) {
      return interaction.reply(`⚠️ ${username} sudah diban.`);
    }
    db.bannedUsers.push(username);
    fs.writeFileSync("database.json", JSON.stringify(db, null, 2));
    return interaction.reply(`✅ ${username} berhasil di-ban.`);
  }

  if (commandName === "unban") {
    const username = interaction.options.getString("username");
    if (!db.bannedUsers.includes(username)) {
      return interaction.reply(`⚠️ ${username} tidak ada di banlist.`);
    }
    db.bannedUsers = db.bannedUsers.filter(u => u !== username);
    fs.writeFileSync("database.json", JSON.stringify(db, null, 2));
    return interaction.reply(`✅ ${username} berhasil di-unban.`);
  }

  if (commandName === "banlist") {
    if (db.bannedUsers.length === 0) {
      return interaction.reply("🚫 Tidak ada user yang diban.");
    }
    return interaction.reply(`📜 **Banlist:**\n${db.bannedUsers.join(", ")}`);
  }

  if (commandName === "userinfo") {
    const username = interaction.options.getString("username");
    try {
      const res = await fetch(`https://users.roblox.com/v1/usernames/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernames: [username] })
      });
      const data = await res.json();

      if (!data.data || data.data.length === 0) {
        return interaction.reply("❌ User tidak ditemukan.");
      }

      const user = data.data[0];
      return interaction.reply(`👤 **${user.name}** (ID: ${user.id})`);
    } catch (err) {
      console.error(err);
      return interaction.reply("❌ Gagal mengambil data dari Roblox API.");
    }
  }
});

client.once("ready", () => {
  console.log(`✅ Bot login sebagai ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);

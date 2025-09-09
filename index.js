import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } from "discord.js";
import express from "express";
import dotenv from "dotenv";

dotenv.config();

// ==== DISCORD CLIENT ====
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

// Fake Database (simulasi)
const banList = new Map(); // key: userId, value: reason

// ==== SLASH COMMANDS ====
const commands = [
  new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban user dari sistem.")
    .addStringOption(option =>
      option.setName("userid").setDescription("ID User Roblox/Discord").setRequired(true)
    )
    .addStringOption(option =>
      option.setName("reason").setDescription("Alasan ban").setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Unban user dari sistem.")
    .addStringOption(option =>
      option.setName("userid").setDescription("ID User Roblox/Discord").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("banlist")
    .setDescription("Melihat daftar user yang di-ban."),

  new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Cek profil user.")
    .addUserOption(option =>
      option.setName("target").setDescription("User Discord yang ingin dicek").setRequired(true)
    ),
].map(cmd => cmd.toJSON());

// ==== REGISTER COMMANDS ====
const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

async function registerCommands() {
  try {
    console.log("⏳ Registering slash commands...");
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
    console.log("✅ Slash commands berhasil di-register!");
  } catch (error) {
    console.error(error);
  }
}

// ==== EVENT HANDLER ====
client.on("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  // /ban
  if (commandName === "ban") {
    const userId = interaction.options.getString("userid");
    const reason = interaction.options.getString("reason") || "Tidak ada alasan";

    banList.set(userId, reason);
    await interaction.reply(`🚫 User **${userId}** berhasil di-ban. Alasan: ${reason}`);
  }

  // /unban
  if (commandName === "unban") {
    const userId = interaction.options.getString("userid");

    if (banList.has(userId)) {
      banList.delete(userId);
      await interaction.reply(`✅ User **${userId}** berhasil di-unban.`);
    } else {
      await interaction.reply(`⚠️ User **${userId}** tidak ada di banlist.`);
    }
  }

  // /banlist
  if (commandName === "banlist") {
    if (banList.size === 0) {
      await interaction.reply("📂 Banlist kosong.");
    } else {
      let list = "";
      banList.forEach((reason, userId) => {
        list += `- **${userId}**: ${reason}\n`;
      });
      await interaction.reply(`📂 **Daftar Ban:**\n${list}`);
    }
  }

  // /userinfo
  if (commandName === "userinfo") {
    const target = interaction.options.getUser("target");

    const embed = new EmbedBuilder()
      .setTitle(`👤 User Info: ${target.tag}`)
      .setThumbnail(target.displayAvatarURL())
      .addFields(
        { name: "ID", value: target.id, inline: true },
        { name: "Bot?", value: target.bot ? "✅ Yes" : "❌ No", inline: true }
      )
      .setColor("Blue")
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
});

// ==== EXPRESS SERVER ====
const app = express();
const PORT = process.env.PORT || 8080;

app.get("/", (req, res) => {
  res.send("✅ RBXGuard Bot berjalan!");
});

app.listen(PORT, () => {
  console.log(`✅ API berjalan di port ${PORT}`);
});

// ==== START BOT ====
registerCommands();
client.login(process.env.TOKEN);

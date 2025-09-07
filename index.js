import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from "discord.js";
import "dotenv/config";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildBans],
});

// ========== REGISTER COMMAND ==========
const commands = [
  new SlashCommandBuilder()
    .setName("banlist")
    .setDescription("Lihat semua user yang terban"),
  new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban user dari server")
    .addUserOption(option =>
      option.setName("target").setDescription("User yang mau di-ban").setRequired(true)
    )
    .addStringOption(option =>
      option.setName("reason").setDescription("Alasan ban").setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Unban user dari server")
    .addStringOption(option =>
      option.setName("userid").setDescription("ID user yang mau di-unban").setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("profile")
    .setDescription("Lihat profil user")
    .addUserOption(option =>
      option.setName("target").setDescription("User yang mau dicek").setRequired(true)
    ),
].map(command => command.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log("🚀 Registering slash commands...");
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log("✅ Slash commands registered!");
  } catch (error) {
    console.error(error);
  }
})();

// ========== HANDLE COMMAND ==========
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  if (commandName === "banlist") {
    const bans = await interaction.guild.bans.fetch();
    if (bans.size === 0) {
      await interaction.reply("📭 Tidak ada user yang terban.");
    } else {
      const list = bans.map(b => `${b.user.tag} (${b.user.id})`).join("\n");
      await interaction.reply(`📜 **Banlist:**\n${list}`);
    }
  }

  if (commandName === "ban") {
    const target = interaction.options.getUser("target");
    const reason = interaction.options.getString("reason") || "Tidak ada alasan";

    try {
      await interaction.guild.members.ban(target, { reason });
      await interaction.reply(`🔨 ${target.tag} berhasil di-ban. Alasan: ${reason}`);
    } catch (err) {
      await interaction.reply("❌ Gagal ban user, pastikan saya punya permission.");
    }
  }

  if (commandName === "unban") {
    const userId = interaction.options.getString("userid");

    try {
      await interaction.guild.members.unban(userId);
      await interaction.reply(`✅ User dengan ID ${userId} berhasil di-unban.`);
    } catch (err) {
      await interaction.reply("❌ Gagal unban user, cek lagi ID-nya.");
    }
  }

  if (commandName === "profile") {
    const target = interaction.options.getUser("target");

    const embed = {
      color: 0x0099ff,
      title: `${target.tag}`,
      thumbnail: { url: target.displayAvatarURL() },
      fields: [
        { name: "ID", value: target.id, inline: true },
        { name: "Bot?", value: target.bot ? "Ya" : "Tidak", inline: true },
        { name: "Created At", value: target.createdAt.toDateString(), inline: false },
      ],
    };

    await interaction.reply({ embeds: [embed] });
  }
});

// ========== BOT READY ==========
client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.login(process.env.TOKEN);

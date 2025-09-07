import { REST, Routes, SlashCommandBuilder } from "discord.js";
import "dotenv/config";

const commands = [
  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Cek ping bot"),
  new SlashCommandBuilder()
    .setName("banlist")
    .setDescription("Menampilkan daftar user Roblox yang di-ban"),
  new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Cek info user Roblox")
    .addStringOption(option =>
      option.setName("username")
        .setDescription("Username Roblox")
        .setRequired(true)),
].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log("🚀 Registering slash commands...");
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID), // global
      { body: commands },
    );
    console.log("✅ Slash commands registered!");
  } catch (err) {
    console.error(err);
  }
})();

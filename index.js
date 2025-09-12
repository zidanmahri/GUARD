const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fs = require("fs");
const fetch = require("node-fetch");
require("dotenv").config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

let db = { bannedUsers: [] };
if (fs.existsSync("database.json")) {
  db = JSON.parse(fs.readFileSync("database.json"));
}

const commands = [
  new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Cek profil user Roblox")
    .addStringOption(opt =>
      opt.setName("username").setDescription("Username Roblox").setRequired(true)
    )
].map(cmd => cmd.toJSON());

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

  if (commandName === "userinfo") {
    const username = interaction.options.getString("username");
    try {
      // ambil data user Roblox
      const res = await fetch("https://users.roblox.com/v1/usernames/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernames: [username] })
      });
      const data = await res.json();
      if (!data.data || data.data.length === 0) {
        return interaction.reply("❌ User tidak ditemukan.");
      }

      const user = data.data[0];
      const userId = user.id;

      // ambil detail user
      const infoRes = await fetch(`https://users.roblox.com/v1/users/${userId}`);
      const info = await infoRes.json();

      // ambil avatar
      const avatarRes = await fetch(
        `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`
      );
      const avatarData = await avatarRes.json();
      const avatarUrl = avatarData.data[0]?.imageUrl || null;

      // ambil social counts (friends, followers, following)
      const friendsRes = await fetch(`https://friends.roblox.com/v1/users/${userId}/friends/count`);
      const followersRes = await fetch(`https://friends.roblox.com/v1/users/${userId}/followers/count`);
      const followingRes = await fetch(`https://friends.roblox.com/v1/users/${userId}/followings/count`);

      const friends = (await friendsRes.json()).count || 0;
      const followers = (await followersRes.json()).count || 0;
      const following = (await followingRes.json()).count || 0;

      // buat embed
      const embed = new EmbedBuilder()
        .setColor(0x2f3136)
        .setTitle(`👤 ${info.displayName} / ${info.name}`)
        .setURL(`https://www.roblox.com/users/${userId}/profile`)
        .setThumbnail(avatarUrl)
        .addFields(
          { name: "Username", value: info.name, inline: true },
          { name: "ID", value: `${userId}`, inline: true },
          { name: "Friends", value: `${friends}`, inline: true },
          { name: "Followers", value: `${followers}`, inline: true },
          { name: "Following", value: `${following}`, inline: true },
          { name: "Description", value: info.description || "No description.", inline: false },
          { name: "Account Created", value: new Date(info.created).toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" }) }
        )
        .setFooter({ text: "Powered by RoGuard" })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
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

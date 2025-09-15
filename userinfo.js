const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fetch = require("node-fetch");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Cek profil user Roblox")
    .addStringOption(opt =>
      opt.setName("username").setDescription("Username Roblox").setRequired(true)
    ),
  async execute(interaction) {
    const username = interaction.options.getString("username");

    try {
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

      const infoRes = await fetch(`https://users.roblox.com/v1/users/${userId}`);
      const info = await infoRes.json();

      const avatarRes = await fetch(
        `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`
      );
      const avatarData = await avatarRes.json();
      const avatarUrl = avatarData.data[0]?.imageUrl || null;

      const friends = (await (await fetch(`https://friends.roblox.com/v1/users/${userId}/friends/count`)).json()).count || 0;
      const followers = (await (await fetch(`https://friends.roblox.com/v1/users/${userId}/followers/count`)).json()).count || 0;
      const following = (await (await fetch(`https://friends.roblox.com/v1/users/${userId}/followings/count`)).json()).count || 0;

      // Check if this user is banned in our backend
      const rawEndpoint = process.env.BAN_ENDPOINT || process.env.API_BASE || process.env.API_URL;
      let backendBans = [];
      try {
        if (rawEndpoint) {
          // try normalized /bans first
          let ep = rawEndpoint;
          if (!rawEndpoint.endsWith('/bans')) ep = rawEndpoint.replace(/\/+$/,'') + '/bans';
          const headers = { 'Content-Type': 'application/json' };
          const token = process.env.BAN_TOKEN || process.env.ROBLOX_API_KEY;
          if (token) headers['Authorization'] = `Bearer ${token}`;
          const bres = await fetch(ep, { headers });
          if (bres.ok) backendBans = await bres.json();
        }
      } catch (e) {
        console.error('Failed to fetch backend bans for userinfo:', e);
      }

      const isBanned = Array.isArray(backendBans) && backendBans.some(b => String(b.userId) === String(userId) || (b.username && String(b.username).toLowerCase() === String(username).toLowerCase()));

      const embed = new EmbedBuilder()
        .setColor(0xcc0000)
        .setTitle(`STECU ${info.displayName} / ${info.name}`)
        .setURL(`https://www.roblox.com/users/${userId}/profile`)
        .setThumbnail(avatarUrl)
        .addFields(
          // show banned status first if banned
          ...(isBanned ? [{ name: 'Status', value: '**BANNED**', inline: true }] : []),
          { name: "Username", value: info.name, inline: true },
          { name: "ID", value: `${userId}`, inline: true },
          { name: "Friends", value: `${friends}`, inline: true },
          { name: "Followers", value: `${followers}`, inline: true },
          { name: "Following", value: `${following}`, inline: true },
          { name: "Description", value: info.description || "No description.", inline: false },
          { name: "Account Created", value: new Date(info.created).toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" }) }
        )
        .setFooter({ text: "Powered by DNXX" })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return interaction.reply("❌ Gagal mengambil data dari Roblox API.");
    }
  }
};

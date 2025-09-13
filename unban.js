const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const BANS_FILE = path.join(__dirname, 'bans.json');

function loadBans() {
  try {
    return JSON.parse(fs.readFileSync(BANS_FILE, 'utf8')) || [];
  } catch (e) {
    return [];
  }
}

function saveBans(bans) {
  fs.writeFileSync(BANS_FILE, JSON.stringify(bans, null, 2));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Hapus ban user dari daftar ban')
    .addStringOption(opt => opt.setName('username').setDescription('Roblox username atau ID').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  async execute(interaction) {
    const input = interaction.options.getString('username');
    await interaction.deferReply({ ephemeral: true });

    // If BAN_ENDPOINT / API_BASE / API_URL is configured, attempt to POST unban to backend
    const endpoint = process.env.BAN_ENDPOINT || process.env.API_BASE || process.env.API_URL;
    const token = process.env.BAN_TOKEN || process.env.ROBLOX_API_KEY;
    if (endpoint) {
      try {
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(endpoint + '/unban', {
          method: 'POST',
          headers,
          body: JSON.stringify({ input, requestedBy: interaction.user.tag })
        });
        if (!res.ok) throw new Error(`Response ${res.status}`);
        return interaction.editReply({ content: 'Permintaan unban dikirim ke backend game.' });
      } catch (err) {
        console.error('Gagal kirim unban ke BAN_ENDPOINT:', err);
        // fallback to local file
      }
    }

    const bans = loadBans();
    const before = bans.length;
    const filtered = bans.filter(b => b.username.toLowerCase() !== input.toLowerCase() && b.userId.toString() !== input);
    if (filtered.length === before) {
      return interaction.editReply({ content: 'Tidak ada ban yang cocok dengan input tersebut.' });
    }

    saveBans(filtered);
    return interaction.editReply({ content: 'User berhasil di-unban dari daftar.' });
  }
};

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const BANS_FILE = path.join(__dirname, 'bans.json');

function loadBansLocal() {
  try { return JSON.parse(fs.readFileSync(BANS_FILE, 'utf8')) || []; } catch (e) { return []; }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('banlist')
    .setDescription('Tampilkan daftar ban saat ini (dari backend atau lokal)')
    .addIntegerOption(opt => opt.setName('limit').setDescription('Jumlah item maksimum').setRequired(false)),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const limit = interaction.options.getInteger('limit') || 10;

    const rawEndpoint = process.env.BAN_ENDPOINT || process.env.API_BASE || process.env.API_URL;
    let endpoint = rawEndpoint;
    if (rawEndpoint) {
      if (!rawEndpoint.endsWith('/api/bans') && !rawEndpoint.endsWith('/bans')) {
        endpoint = rawEndpoint.replace(/\/+$/,'') + '/api/bans';
      }
    }
    const token = process.env.BAN_TOKEN || process.env.ROBLOX_API_KEY;

    try {
      let bans = [];
      if (endpoint) {
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(endpoint, { headers });
        let body = null;
        try { body = await res.json(); } catch(e) { body = null; }
        console.log('BANLIST GET', endpoint, 'status', res.status, 'body', body);
        if (res.ok && Array.isArray(body)) bans = body;
      }

      if (!bans || bans.length === 0) bans = loadBansLocal();

      if (!bans || bans.length === 0) return interaction.editReply({ content: 'Tidak ada ban.' });

      const sliced = bans.slice(0, Math.min(limit, 25));
      const embed = new EmbedBuilder().setTitle('Ban List').setColor(0xcc0000).setTimestamp();
      for (const b of sliced) {
        embed.addFields({ name: `${b.username} (${b.userId})`, value: `${b.reason} — by ${b.bannedBy} (${new Date(b.timestamp).toLocaleString()})`, inline: false });
      }

      if (bans.length > sliced.length) embed.setFooter({ text: `Showing ${sliced.length} of ${bans.length} bans` });

      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return interaction.editReply({ content: 'Gagal mengambil daftar ban.' });
    }
  }
};

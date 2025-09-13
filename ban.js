const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
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
    .setName('ban')
    .setDescription('Ban user dari Roblox (tambahkan ke daftar ban)')
    .addStringOption(opt => opt.setName('username').setDescription('Roblox username').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Alasan ban').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  async execute(interaction) {
    const username = interaction.options.getString('username');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    await interaction.deferReply({ ephemeral: true });

    try {
      // Resolve username -> id via Roblox API
      const res = await fetch('https://users.roblox.com/v1/usernames/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernames: [username] })
      });
      const data = await res.json();
      if (!data.data || data.data.length === 0) return interaction.editReply({ content: 'User Roblox tidak ditemukan.' });
      const user = data.data[0];
      const userId = user.id;

      const bans = loadBans();
      if (bans.find(b => b.userId === userId)) {
        return interaction.editReply({ content: 'User sudah diban.' });
      }

      const entry = {
        userId,
        username: user.name,
        reason,
        bannedBy: interaction.user.tag,
        timestamp: new Date().toISOString()
      };

      // Determine endpoint/token from env vars (support Railway names)
      // If user set a base URL (like https://...railway.app) we'll append the API path.
      const rawEndpoint = process.env.BAN_ENDPOINT || process.env.API_BASE || process.env.API_URL;
      let endpoint = rawEndpoint;
      if (rawEndpoint) {
        // normalize: if user provided a base (no path) append /api/bans
        if (!rawEndpoint.endsWith('/api/bans') && !rawEndpoint.endsWith('/bans')) {
          endpoint = rawEndpoint.replace(/\/+$/,'') + '/api/bans';
        }
      }
      const token = process.env.BAN_TOKEN || process.env.ROBLOX_API_KEY;

      // If BAN_ENDPOINT/API_BASE/API_URL is configured, POST to game backend to persist ban there
      if (endpoint) {
        try {
          const headers = { 'Content-Type': 'application/json' };
          if (token) headers['Authorization'] = `Bearer ${token}`;
          const resp = await fetch(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(entry)
          });
          let respBody = null;
          try { respBody = await resp.json(); } catch (e) { respBody = null; }
          console.log('BAN POST to', endpoint, 'status', resp.status, 'body', respBody);
          if (!resp.ok) {
            await interaction.editReply({ content: `Gagal kirim ke backend (status ${resp.status}). Cek logs.` });
            return;
          }
          await interaction.editReply({ content: 'User diban dan dikirim ke backend game.' });
          return;
        } catch (err) {
          console.error('Gagal kirim ke BAN_ENDPOINT:', err);
          // fallback ke file
        }
      }

      bans.push(entry);
      saveBans(bans);

      const embed = new EmbedBuilder()
        .setTitle('User diban')
        .setColor(0xcc0000)
        .addFields(
          { name: 'Username', value: user.name, inline: true },
          { name: 'ID', value: `${userId}`, inline: true },
          { name: 'Reason', value: reason, inline: false },
          { name: 'Banned by', value: interaction.user.tag, inline: true }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.editReply({ content: 'Terjadi error saat menghubungi Roblox API.' });
    }
  }
};

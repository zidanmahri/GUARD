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

      // First, optionally attempt to apply the ban via Roblox Developer API so it shows
      // in the official Developer > Bans UI. This requires a session cookie (.ROBLOSECURITY)
      // and either an explicit ROBLOX_BAN_ENDPOINT or a UNIVERSE_ID to guess the endpoint.
      // If this fails we fall back to the existing backend/file behavior.
      const robloxCookie = process.env.ROBLOX_SECURITY;
      const universeId = process.env.UNIVERSE_ID || process.env.ROBLOX_UNIVERSE_ID;
      const explicitRobloxEndpoint = process.env.ROBLOX_BAN_ENDPOINT;

      async function tryRobloxBan(targetId, reasonText) {
        if (!robloxCookie) return { ok: false, reason: 'No ROBLOX_SECURITY configured' };
        let banUrl = null;
        if (explicitRobloxEndpoint) {
          banUrl = explicitRobloxEndpoint.replace(/\/+$/, '');
        } else if (universeId) {
          // guessed API path — may need to be adjusted depending on Roblox's internal API
          banUrl = `https://games.roblox.com/v1/universes/${universeId}/bans`;
        } else {
          return { ok: false, reason: 'No ROBLOX_BAN_ENDPOINT or UNIVERSE_ID configured' };
        }

        const headersBase = {
          'Content-Type': 'application/json',
          'Cookie': `.ROBLOSECURITY=${robloxCookie}`
        };

        const payload = { targetUserId: Number(targetId), reason: reasonText };

        try {
          // first attempt (may require X-CSRF-TOKEN)
          let resp = await fetch(banUrl, { method: 'POST', headers: headersBase, body: JSON.stringify(payload) });
          if (resp.status === 403) {
            const csrf = resp.headers.get('x-csrf-token') || resp.headers.get('X-CSRF-TOKEN');
            if (csrf) {
              const headersWithCsrf = Object.assign({}, headersBase, { 'X-CSRF-TOKEN': csrf });
              resp = await fetch(banUrl, { method: 'POST', headers: headersWithCsrf, body: JSON.stringify(payload) });
            }
          }
          let body = null;
          try { body = await resp.text(); } catch (e) { body = null; }
          console.log('Roblox ban POST', banUrl, 'status', resp.status, 'body', body);
          if (!resp.ok) return { ok: false, reason: `Roblox responded ${resp.status}`, body };
          return { ok: true, body };
        } catch (err) {
          console.error('Error calling Roblox ban endpoint', err);
          return { ok: false, reason: err.message };
        }
      }

      // try Roblox ban if configured
      if (robloxCookie && (explicitRobloxEndpoint || universeId)) {
        try {
          const rres = await tryRobloxBan(userId, reason);
          if (rres.ok) {
            // if Roblox ban succeeded, still record locally/backends as well
            console.log('Roblox ban applied for', userId);
            // also persist to backend if configured
          } else {
            console.warn('Roblox ban failed:', rres.reason);
          }
        } catch (err) {
          console.error('Roblox ban flow error', err);
        }
      }

      // Determine endpoint/token from env vars (support Railway names)
      // If user set a base URL (like https://...railway.app) we'll append the API path.
      const rawEndpoint = process.env.BAN_ENDPOINT || process.env.API_BASE || process.env.API_URL;
      let endpoint = rawEndpoint;
      if (rawEndpoint) {
        // normalize: if user provided a base (no path) append /api/bans
        if (!rawEndpoint.endsWith('/api/bans') && !rawEndpoint.endsWith('/bans')) {
          endpoint = rawEndpoint.replace(/\/+$/, '') + '/api/bans';
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

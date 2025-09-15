const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
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

      // Render a monospace table inside the embed description for better readability.
      // Columns: Username (max 20), ID (max 10), Reason (max 40), By (max 15)
      const colWidths = { name: 20, id: 10, reason: 40, by: 15 };
      const pad = (s, n) => {
        s = (s || '').toString();
        if (s.length > n) return s.slice(0, n - 1) + '…';
        return s + ' '.repeat(n - s.length);
      };

      const header = `${pad('Username', colWidths.name)} ${pad('ID', colWidths.id)} ${pad('Reason', colWidths.reason)} ${pad('By', colWidths.by)}`;
      const separator = `${'-'.repeat(colWidths.name)} ${'-'.repeat(colWidths.id)} ${'-'.repeat(colWidths.reason)} ${'-'.repeat(colWidths.by)}`;
      const lines = [header, separator];

      // buttons (max 5)
      const rows = [];
      let currentRow = new ActionRowBuilder();
      let btnCount = 0;

      for (const b of sliced) {
        const name = b.username || '';
        const id = b.userId || '';
        const reason = b.reason || '';
        const by = b.bannedBy || '';
        const line = `${pad(name, colWidths.name)} ${pad(id, colWidths.id)} ${pad(reason, colWidths.reason)} ${pad(by, colWidths.by)}`;
        lines.push('`' + line + '`');

        // create unban button for this ban entry (use id when possible otherwise username)
        const input = id || name;
        if (input && btnCount < 5) {
          const btn = new ButtonBuilder()
            .setCustomId(`unban:${input}`)
            .setLabel(`Unban ${input}`)
            .setStyle(ButtonStyle.Danger);
          currentRow.addComponents(btn);
          btnCount++;
        }
        if (btnCount >= 5) break;
      }

      if (btnCount > 0) rows.push(currentRow);

      embed.setDescription(lines.join('\n'));
      if (bans.length > sliced.length) embed.setFooter({ text: `Showing ${sliced.length} of ${bans.length} bans` });

      return interaction.editReply({ embeds: [embed], components: rows });
    } catch (err) {
      console.error(err);
      return interaction.editReply({ content: 'Gagal mengambil daftar ban.' });
    }
  }
};

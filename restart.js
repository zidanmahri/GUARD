const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('restart')
    .setDescription('Trigger restart for all game servers (kicks players / restarts instances)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(opt => opt.setName('reason').setDescription('Optional reason to send to players').setRequired(false)),

  async execute(interaction) {
    const reason = interaction.options.getString('reason') || 'Server restart requested by staff';
    await interaction.deferReply({ ephemeral: true });

    const rawEndpoint = process.env.BAN_ENDPOINT || process.env.API_BASE || process.env.API_URL;
    let endpoint = rawEndpoint;
    if (rawEndpoint) {
      if (!rawEndpoint.endsWith('/api/commands/restart') && !rawEndpoint.endsWith('/commands/restart')) {
        endpoint = rawEndpoint.replace(/\/+$/,'') + '/api/commands/restart';
      }
    }
    const token = process.env.BAN_TOKEN || process.env.ROBLOX_API_KEY;

    try {
      if (!endpoint) {
        return interaction.editReply({ content: 'Backend endpoint not configured (API_BASE / BAN_ENDPOINT missing).' });
      }

      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const resp = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ payload: { reason }, createdBy: interaction.user.tag })
      });
      let body = null;
      try { body = await resp.json(); } catch (e) { body = null; }
      console.log('Restart POST', endpoint, 'status', resp.status, 'body', body);

      if (!resp.ok) {
        return interaction.editReply({ content: `Gagal kirim perintah restart (status ${resp.status}).` });
      }

      return interaction.editReply({ content: 'Perintah restart berhasil dikirim ke backend. Game servers akan menerima perintah dan melakukan restart.' });
    } catch (err) {
      console.error('Error sending restart command:', err);
      return interaction.editReply({ content: 'Terjadi error saat mengirim perintah restart.' });
    }
  }
};

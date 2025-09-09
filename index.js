const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// ==================== REGISTER COMMANDS ====================
const commands = [
    new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Menampilkan info user Roblox')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('Masukkan username Roblox')
                .setRequired(true)
        ),
    new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban user Roblox')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('Masukkan username Roblox')
                .setRequired(true)
        ),
    new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Unban user Roblox')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('Masukkan username Roblox')
                .setRequired(true)
        ),
    new SlashCommandBuilder()
        .setName('banlist')
        .setDescription('Lihat daftar user yang di-ban')
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
    try {
        console.log('Mendaftarkan slash command...');
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );
        console.log('✅ Berhasil daftar slash command');
    } catch (error) {
        console.error(error);
    }
})();

// ==================== BOT HANDLER ====================
client.on('ready', () => {
    console.log(`✅ Bot login sebagai ${client.user.tag}`);
});

let banList = [];

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options } = interaction;

    if (commandName === 'userinfo') {
        const username = options.getString('username');
        const embed = new EmbedBuilder()
            .setTitle(`📜 Info User Roblox`)
            .addFields(
                { name: '👤 Username', value: username, inline: true },
                { name: '🔒 Status', value: banList.includes(username) ? '🚫 Banned' : '✅ Active', inline: true }
            )
            .setColor(banList.includes(username) ? 0xff0000 : 0x00ff00)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }

    if (commandName === 'ban') {
        const username = options.getString('username');
        if (!banList.includes(username)) banList.push(username);
        await interaction.reply(`🚫 User **${username}** berhasil di-ban.`);
    }

    if (commandName === 'unban') {
        const username = options.getString('username');
        banList = banList.filter(u => u !== username);
        await interaction.reply(`✅ User **${username}** berhasil di-unban.`);
    }

    if (commandName === 'banlist') {
        if (banList.length === 0) {
            await interaction.reply('📭 Tidak ada user yang di-ban.');
        } else {
            await interaction.reply(`🚫 Daftar Ban: \n${banList.map(u => `- ${u}`).join('\n')}`);
        }
    }
});

client.login(process.env.TOKEN);

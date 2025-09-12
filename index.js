const { Client, GatewayIntentBits, REST, Routes, Collection } = require("discord.js");
const fs = require("fs");
require("dotenv").config();

// Init client
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.commands = new Collection();

// === Load Commands ===
const commandFiles = fs.readdirSync("./commands").filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command);
}

// === Register Slash Commands ===
const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log("⏳ Registering slash commands...");
    const commands = client.commands.map(cmd => cmd.data.toJSON());

    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );

    console.log("✅ Slash commands berhasil di-register!");
  } catch (err) {
    console.error("❌ Error register commands:", err);
  }
})();

// === Interaction Handler ===
client.on("interactionCreate", async interaction => {
  if (!interaction.isCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(err);
    await interaction.reply({
      content: "❌ Ada error pas jalanin command ini!",
      ephemeral: true
    });
  }
});

// === Bot Ready ===
client.once("ready", () => {
  console.log(`✅ Bot login sebagai ${client.user.tag}`);
});

// === Login ===
client.login(process.env.DISCORD_TOKEN);

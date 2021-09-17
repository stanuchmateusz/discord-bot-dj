require("dotenv").config({
    path: __dirname + "/.env"
});

const { Client, Intents } = require("discord.js");
const { Player } = require("discord-player");
const client = new Client({
    intents: [
        Intents.FLAGS.GUILD_VOICE_STATES,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILDS]
});


const { Dj_ttak } = require('./dj_class')
// instantiate the player
const player = new Player(client);
const dj = new Dj_ttak(player, 20)


client.on("ready", () => {
    console.log("Bot został uruchomiony!");
    client.user.setActivity({
        name: "🎶 | Gram muzykę",
        type: "LISTENING"
    });
});

client.on("error", console.error);
client.on("warn", console.warn);


client.on("messageCreate", async (message) => {
    if (message.author.bot || !message.guild) return;
    if (!client.application?.owner) await client.application?.fetch();

    if (message.content === "!deploy" && message.author.id === '415831414404153344') {
        dj.zaladuj(message)
    }
});

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand() || !interaction.guildId) return;

    if (dj.interakcje(player, interaction) == 'huj') {
        interaction.reply({
            content: "Unknown command!",
            ephemeral: true
        });
    }
});

client.login(process.env.TOKEN);
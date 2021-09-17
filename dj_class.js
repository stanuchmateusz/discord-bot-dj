const wait = require('util').promisify(setTimeout);
const { QueueRepeatMode, QueryType } = require("discord-player");
const { GuildMember } = require("discord.js");


class Dj_ttak {

    constructor(player, usun_wiadomosc_po) {//player z dj ttak a usun_wiadomos_po w sekundach
        player.usun_wiadomosc_po = usun_wiadomosc_po

        player.on("error", (queue, error) => {
            console.log(`[${queue.guild.name}] Error w kolejce: ${error.message}`)
        });

        player.on("connectionError", (queue, error) => {
            console.log(`[${queue.guild.name}] Error w połączeniu: ${error.message}`)
        });

        player.on("trackStart", (queue, track) => {
            queue.metadata.send(`🎶 | Gram: **${track.title}** w **${queue.connection.channel.name}**!`)
                .then(async msg => { await wait(player.usun_wiadomosc_po * 1000); msg.delete(); });
        });

        player.on("trackAdd", (queue, track) => {
            queue.metadata.send(`🎶 | Dodano utwór **${track.title}** kolejki!`)
                .then(async msg => { await wait(player.usun_wiadomosc_po * 1000); msg.delete(); });
        });

        player.on("botDisconnect", (queue) => {
            queue.metadata.send("❌ | Zostałem wyjebany z kanału, czyszczę kolejkę!")
                .then(async msg => { await wait(player.usun_wiadomosc_po * 1000); msg.delete(); });
        });

        player.on("channelEmpty", (queue) => {
            queue.metadata.send("❌ | Nie ma nikogo to jest jakaś prowokacja, wypierdalam...")
                .then(async msg => { await wait(player.usun_wiadomosc_po * 1000); msg.delete(); });
        });

        player.on("queueEnd", (queue) => {
            queue.metadata.send("✅ | Koniec kolejki!")
                .then(async msg => { await wait(player.usun_wiadomosc_po * 1000); msg.delete(); });
        });
    }
    async zaladuj(message) {
        await message.guild.commands.set([
            {
                name: "play",
                description: "Gra muzyczkę z youtuba",
                options: [
                    {
                        name: "query",
                        type: "STRING",
                        description: "Piosenka do grania tu tego",
                        required: true
                    }
                ]
            },
            {
                name: "loop",
                description: "Wybiera tryb kolejki",
                options: [
                    {
                        name: "mode",
                        type: "INTEGER",
                        description: "Tryb pętli",
                        required: true,
                        choices: [
                            {
                                name: "Off",
                                value: QueueRepeatMode.OFF
                            },
                            {
                                name: "Track",
                                value: QueueRepeatMode.TRACK
                            },
                            {
                                name: "Queue",
                                value: QueueRepeatMode.QUEUE
                            },
                            {
                                name: "Autoplay",
                                value: QueueRepeatMode.AUTOPLAY
                            }
                        ]
                    }
                ]
            },
            {
                name: "skip",
                description: "Skipuj to"
            },
            {
                name: "queue",
                description: "Wyświetla kolejkę"
            },
            {
                name: "pause",
                description: "No pauzuje"
            },
            {
                name: "resume",
                description: "No wznawia"
            },
            {
                name: "stop",
                description: "No chyba wiadomo"
            },
            {
                name: "clear",
                description: "Czyści kolejkę"
            },
            {
                name: "np",
                description: "Obecnie odtwarzany"
            },
            {
                name: "bassboost",
                description: "Przełącza bassboost'a"
            },
            {
                name: "ping",
                description: "Opóźnienie bota"
            }
        ]);

        await message.reply("Zaktualizowano komendy!");
    }
    async interakcje(player, inter) {
        if (inter.commandName === "ping") {
            await inter.deferReply();
            const queue = player.getQueue(inter.guild);

            return inter.followUp({
                embeds: [
                    {
                        title: "⏱️ | Latency",
                        fields: [
                            { name: "Bot Latency", value: `\`${Math.round(client.ws.ping)}ms\`` },
                            { name: "Voice Latency", value: !queue ? "N/A" : `UDP: \`${queue.connection.voiceConnection.ping.udp ?? "N/A"}\`ms\nWebSocket: \`${queue.connection.voiceConnection.ping.ws ?? "N/A"}\`ms` }
                        ],
                        color: 0xFFFFFF
                    }
                ]
            });
        }

        if (!(inter.member instanceof GuildMember) || !inter.member.voice.channel) {
            return inter.reply({ content: "Nie ma cie na kanale głosowym typie!", ephemeral: true });
        }

        if (inter.guild.me.voice.channelId && inter.member.voice.channelId !== inter.guild.me.voice.channelId) {
            return inter.reply({ content: "Halo, nie jesteś na moim kanale, co ty odwalasz?!", ephemeral: true });
        }

        if (inter.commandName === "play") {

            await inter.deferReply();

            const query = inter.options.get("query").value;

            const searchResult = await player
                .search(query, {
                    requestedBy: inter.user,
                    searchEngine: QueryType.AUTO
                })
                .catch(() => { });

            if (!searchResult || !searchResult.tracks.length) return inter.followUp({ content: "Nie ma czegoś takiego!" })
                .then(async msg => { await wait(player.usun_wiadomosc_po * 1000); msg.delete(); });

            const queue = await player.createQueue(inter.guild, {
                metadata: inter.channel
            });

            try {
                if (!queue.connection) await queue.connect(inter.member.voice.channel);
            } catch {
                player.deleteQueue(inter.guildId);
                return inter.followUp({ content: "Nie mogę dołączyć do twojego kanału głosowego!" })
                    .then(async msg => { await wait(player.usun_wiadomosc_po * 1000); msg.delete(); });
            }

            await inter.followUp({ content: `⏱ | Ładowanie ${searchResult.playlist ? "playlisty" : "utworu"}...` })
                .then(async msg => { await wait(player.usun_wiadomosc_po * 1000); msg.delete(); });
            searchResult.playlist ? queue.addTracks(searchResult.tracks) : queue.addTrack(searchResult.tracks[0]);
            if (!queue.playing) await queue.play();

        }
        else if (inter.commandName === "skip") {

            await inter.deferReply();

            const queue = player.getQueue(inter.guildId);
            if (!queue || !queue.playing) return inter.followUp({ content: "❌ | Kurde faja, nic teraz nie leci mordeczko" })
                .then(async msg => { await wait(player.usun_wiadomosc_po * 1000); msg.delete(); });

            const currentTrack = queue.current;
            const success = queue.skip();

            return inter.followUp({
                content: success ? `✅ | Pominięto **${currentTrack}**!` : "❌ | Coś się popsuło!"
            }).then(async msg => { await wait(player.usun_wiadomosc_po * 1000); msg.delete(); });

        } else if (inter.commandName === "queue") {

            await inter.deferReply();

            const queue = player.getQueue(inter.guildId);

            if (!queue || !queue.playing) return inter.followUp({ content: "❌ | Kurde faja, nic teraz nie leci mordeczko" })
                .then(async msg => { await wait(player.usun_wiadomosc_po * 1000); msg.delete(); });

            const currentTrack = queue.current;
            const tracks = queue.tracks.slice(0, 10).map((m, i) => {
                return `${i + 1}. **${m.title}** ([link](${m.url}))`;
            });

            return inter.followUp({
                embeds: [
                    {
                        title: "Kolejka serwerowa",
                        description: `${tracks.join("\n")}${queue.tracks.length > tracks.length
                            ? `\n...${queue.tracks.length - tracks.length === 1 ? `${queue.tracks.length - tracks.length} utworu` : `${queue.tracks.length - tracks.length} utworów`}`
                            : ""
                            }`,
                        color: 0xff0000,
                        fields: [{ name: "Odtwarzam", value: `🎶 | **${currentTrack.title}** ([link](${currentTrack.url}))` }]
                    }
                ]
            }).then(async msg => { await wait(player.usun_wiadomosc_po * 1000); msg.delete(); });

        } else if (inter.commandName === "pause") {

            await inter.deferReply();

            const queue = player.getQueue(inter.guildId);
            if (!queue || !queue.playing) return inter.followUp({ content: "❌ | Kurde faja, nic teraz nie leci mordeczko" })
                .then(async msg => { await wait(player.usun_wiadomosc_po * 1000); msg.delete(); });

            const paused = queue.setPaused(true);
            return inter.followUp({ content: paused ? "⏸ | Pauza !" : "❌ | Coś się popsuło!" })
                .then(async msg => { await wait(player.usun_wiadomosc_po * 1000); msg.delete(); });

        } else if (inter.commandName === "resume") {
            await inter.deferReply();
            const queue = player.getQueue(inter.guildId);
            if (!queue || !queue.playing) return inter.followUp({ content: "❌ | Kurde faja, nic teraz nie leci mordeczko" })
                .then(async msg => { await wait(player.usun_wiadomosc_po * 1000); msg.delete(); });

            const paused = queue.setPaused(false);
            return inter.followUp({ content: !paused ? "❌ | Coś się popsuło!" : "▶ | Resumed!" })
                .then(async msg => { await wait(player.usun_wiadomosc_po * 1000); msg.delete(); });

        } else if (inter.commandName === "stop") {
            await inter.deferReply();
            const queue = player.getQueue(inter.guildId);
            if (!queue || !queue.playing) return inter.followUp({ content: "❌ | Kurde faja, nic teraz nie leci mordeczko" })
                .then(async msg => { await wait(player.usun_wiadomosc_po * 1000); msg.delete(); });

            queue.destroy();
            return inter.followUp({ content: "🛑 | Zatrzymano muzykę!" })
                .then(async msg => { await wait(player.usun_wiadomosc_po * 1000); msg.delete(); });

        } else if (inter.commandName === "clear") {
            await inter.deferReply();
            const queue = player.getQueue(inter.guildId);
            if (!queue || !queue.playing) return inter.followUp({ content: "❌ | Kurde faja, nic teraz nie leci mordeczko" })
                .then(async msg => { await wait(player.usun_wiadomosc_po * 1000); msg.delete(); });

            queue.destroy(false);
            return inter.followUp({ content: "🛎️ | Wyczyszczono kolejkę!" })
                .then(async msg => { await wait(player.usun_wiadomosc_po * 1000); msg.delete(); });

        }
        else if (inter.commandName === "np") {
            await inter.deferReply();
            const queue = player.getQueue(inter.guildId);
            if (!queue || !queue.playing) return inter.followUp({ content: "❌ | Kurde faja, nic teraz nie leci mordeczko" })
                .then(async msg => { await wait(player.usun_wiadomosc_po * 1000); msg.delete(); });

            const progress = queue.createProgressBar();
            const perc = queue.getPlayerTimestamp();

            return inter.followUp({
                embeds: [
                    {
                        title: "Odtwarzam",
                        description: `🎶 | **${queue.current.title}**! (\`${perc.progress}%\`)`,
                        fields: [
                            {
                                name: "\u200b",
                                value: progress
                            }
                        ],
                        color: 0xffffff
                    }
                ]
            });
        } else if (inter.commandName === "loop") {

            await inter.deferReply();

            const queue = player.getQueue(inter.guildId);

            if (!queue || !queue.playing) return inter.followUp({ content: "❌ | Kurde faja, nic teraz nie leci mordeczko" })
                .then(async msg => { await wait(player.usun_wiadomosc_po * 1000); msg.delete(); });

            const loopMode = inter.options.get("mode").value;
            const success = queue.setRepeatMode(loopMode);

            const mode = loopMode === QueueRepeatMode.TRACK ? "🔂" : loopMode === QueueRepeatMode.QUEUE ? "🔁" : "▶";

            return inter.followUp({ content: success ? `${mode} | Zaktualizowano tryb pętli!` : "❌ | Nie można zaktualizować trybu pętli!" })
                .then(async msg => { await wait(player.usun_wiadomosc_po * 1000); msg.delete(); });

        } else if (inter.commandName === "bassboost") {

            await inter.deferReply();

            const queue = player.getQueue(inter.guildId);

            if (!queue || !queue.playing) return inter.followUp({ content: "❌ | Kurde faja, nic teraz nie leci mordeczko" })
                .then(async msg => { await wait(player.usun_wiadomosc_po * 1000); msg.delete(); });

            await queue.setFilters({
                bassboost: !queue.getFiltersEnabled().includes("bassboost"),
                normalizer2: !queue.getFiltersEnabled().includes("bassboost") // because we need to toggle it with bass
            });

            return inter.followUp({ content: `🎵 | Bassboost ${queue.getFiltersEnabled().includes("bassboost") ? "Włączony" : "Wyłączony"}!` })
                .then(async msg => { await wait(player.usun_wiadomosc_po * 1000); msg.delete(); });

        }
        else
            return "huj"
    }

}

module.exports = {
    Dj_ttak: Dj_ttak
}
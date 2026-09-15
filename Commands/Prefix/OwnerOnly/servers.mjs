import {
    ActionRowBuilder,
    ButtonBuilder,
    Message
} from 'discord.js';
import Bot from '../../../src/client.mjs';
import EmbedBuilder from '../../../src/utils/classes/EmbedBuilder.mjs';
export default {
    name: "servers",
    cooldown: 5,
    ownerOnly: true,
    description: "Returns Bot server list",
    aliases: [],
    category: "OwnerOnly",
    /** 
     * @param {Message} message
     * @param {Bot} client
     * @param {String[]} args
     * @param err ErrorHnadler
     */
    run: async ({
        message,
        client,
        err,
        guildData
    }) => {
        try {
            let i0 = 0,
                i1 = 10,
                page = 1;

            let description = `\n` + client.guilds.cache
                .sort((a, b) => b.memberCount - a.memberCount)
                .map(r => r)
                .map((r, i) => `\`\`\`ansi\n[2;34m${r.name}\nID: ${r.id}\nMembers: ${r.members.cache.size}\nHumans: ${r.members.cache.filter(member => !member.user.bot).size}\nBots: ${r.members.cache.filter(member => member.user.bot).size}[0m\n\`\`\``)
                .slice(0, 10)
                .join("\n");

            let embed = new EmbedBuilder()
                .setTheme(guildData.Theme)
                .setColor("DarkBlue")
                .setTitle(`Total Servers - ${client.guilds.cache.size}`)
                .setAuthor({
                    name: client.user.tag,
                    iconURL: client.user.displayAvatarURL({
                        dynamic: true
                    })
                })
                .setFooter({
                    text: `Page - ${page}/${Math.ceil(client.guilds.cache.size / 10)}`
                })
                .setDescription(description);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("back").setLabel("⬅").setStyle(2),
                new ButtonBuilder().setCustomId("stop").setLabel("⏹️").setStyle(2),
                new ButtonBuilder().setCustomId("next").setLabel("➡").setStyle(2)
            );

            let msg = await message.channel.safeSend({
                embeds: [embed],
                components: [row],
                collector: true
            })

            var filter = (button) => button.user.id === message.author.id;
            let collector = await msg.createMessageComponentCollector({
                filter
            })

            collector.on("collect", async (button) => {
                if (button.customId === "back") {
                    i0 = i0 - 10;
                    i1 = i1 - 10;
                    page = page - 1;

                    if (i0 + 1 < 0) {
                        return await button.message.delete();
                    }

                    if (!i0 || !i1) {
                        return await button.message.delete();
                    }

                    description = `Total Servers - ${client.guilds.cache.size}\n\n` + client.guilds.cache
                        .sort((a, b) => b.memberCount - a.memberCount)
                        .map(r => r)
                        .map((r, i) => `\`\`\`ansi\n[2;34m${r.name}\nID: ${r.id}\nMembers: ${r.members.cache.size}\nHumans: ${r.members.cache.filter(member => !member.user.bot).size}\nBots: ${r.members.cache.filter(member => member.user.bot).size}[0m\n\`\`\``)
                        .slice(i0, i1)
                        .join("\n");

                    embed.setFooter({
                        text: `Page - ${page}/${Math.round(client.guilds.cache.size / 10 + 1)}`
                    });
                    embed.setDescription(description);

                    await button.safeUpdate({
                        embeds: [embed]
                    });
                }

                if (button.customId === "next") {
                    i0 = i0 + 10;
                    i1 = i1 + 10;
                    page = page + 1;

                    if (i1 > client.guilds.cache.size + 10) {
                        return await button.message.delete();
                    }

                    if (!i0 || !i1) {
                        return await button.message.delete();
                    }

                    description = `Total Servers - ${client.guilds.cache.size}\n\n` + client.guilds.cache
                        .sort((a, b) => b.memberCount - a.memberCount)
                        .map(r => r)
                        .map((r, i) => `\`\`\`ansi\n[2;34m${r.name}\nID: ${r.id}\nMembers: ${r.members.cache.size}\nHumans: ${r.members.cache.filter(member => !member.user.bot).size}\nBots: ${r.members.cache.filter(member => member.user.bot).size}[0m\n\`\`\``)
                        .slice(i0, i1)
                        .join("\n");

                    embed.setFooter({
                        text: `Page - ${page}/${Math.round(client.guilds.cache.size / 10 + 1)}`
                    });
                    embed.setDescription(description);

                    await button.safeUpdate({
                        embeds: [embed]
                    });
                }

                if (button.customId === "stop") {
                    return await button.message.delete();
                }
            });

            collector.on('end', collected => {
                msg?.safeEdit({
                    embeds: [new EmbedBuilder(client).setTheme(guildData.Theme).setDescription("^{common.timeout}")],
                    files: [],
                    content: "",
                    components: []
                }).catch(err => {})
            });

        } catch (error) {
            err(error)
        }
    }
};
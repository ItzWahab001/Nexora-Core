import { ActionRowBuilder, ButtonBuilder, ChannelSelectMenuBuilder, Message, Collector, ChannelType, Webhook } from "discord.js";
import { EmbedBuilder, cache } from "../../../src/utils/index.mjs";
import Bot from "../../../src/client.mjs";

const cmd = {};

/** 
* @param {Object} object
 * @param {Message | import('discord.js').Interaction} object.message
 * @param {Bot} object.client
 * @param {String[]} object.args
 * @param {Object} object.Slash
 * @param err ErrorHnadler
 */
cmd.run = async ({ message, client, err, Slash, options, guildData }) => {
    try {

        const user = message.author || message.user

        /** @type {import("../../../Database/-Models/GuildConfig.json")} data*/
        const data = guildData;

        const events = {
            Message: 'Messge',
            Guild: 'Server',
            Member: 'Members',
            Channels: 'Channel',
            Threads: 'Threads',
            Roles: 'Roles',
            AutoMod: 'Auto Moderation',
            ServerEvents: 'Server Events',
            StickerAndEmotes: 'Sticker & Emotes',
            Voice: 'Voice',
        }

        const firstRow = (da) => {
            const row = new ActionRowBuilder()
            Object.keys(events).slice(0, 5).forEach((event) => {
                const btn = new ButtonBuilder()
                    .setCustomId(`setup:al:event:${event}`)
                    .setLabel(events[event])
                    .setStyle(da?.AuditLog?.[event] ? 2 : 3)
                row.addComponents(btn)
            })
            return row
        }

        const secondRow = (da) => {
            const row = new ActionRowBuilder()
            Object.keys(events).slice(5, 10).forEach((event) => {
                const btn = new ButtonBuilder()
                    .setCustomId(`setup:al:event:${event}`)
                    .setLabel(events[event])
                    .setStyle(da?.AuditLog?.[event] ? 2 : 3)
                row.addComponents(btn)
            })
            return row
        }

        const Embed = new EmbedBuilder().setTheme(data.Theme)

        let homeBtn = new ButtonBuilder().setCustomId("home-btn").setStyle(2).setLabel("^{common.home_page}");
        let resetBtn = (da) => new ButtonBuilder().setCustomId("setup:al:reset").setEmoji("979818265582899240").setDisabled(da && da?.AuditLog?.Channel ? false : true)
        .setStyle(2).setLabel("^{common.reset}");

        const select = () => {
            const menu = new ChannelSelectMenuBuilder()
                .setCustomId('setup:al:panel')
                .setChannelTypes(ChannelType.GuildText)
                .setPlaceholder('^{common.click_here}')
                .setDisabled(false).setMaxValues(1)

            return menu;
        }

        const embed = (d) => {
            let des = "**^{command.auditlog.description}**\n!{dot} Events\n"

            Object.keys(events).forEach(event => {
                des += `- ${events[event]}: ${d?.AuditLog?.[event] ? `\`^{common.enabled}\`` : "\`^{common.disabled}\`"}\n`
            })

            des += `\n\n> ${(client.getPromotion())?.Message}`

            return new EmbedBuilder().setTheme(d.Theme)
                .setDefaultFooter()
                .setDescription(des)
                .setThumbnail("https://cdn.discordapp.com/emojis/1068024801186295808.gif")
                .setAuthor({
                    name: "^{command.auditlog.title}",
                }).toJSON()

        }


        const home =  (d) => {
            const row = new ActionRowBuilder().addComponents(select(d))
            const resetRow = new ActionRowBuilder().addComponents(resetBtn(d))

            return {
                files: [],
                embeds: [embed(d)],
                components: [row, firstRow(d), secondRow(d), resetRow].map(r => r.toJSON()),
                content: ""
            }
        }

        let msg = await message.safeReply(home(data));


        /**@type {Collector} */
        const collector = msg.createMessageComponentCollector({
            componentType: 0,
            time: 240 * 1000
        });

        collector.on('collect', async i => {
            if (i.user.id !== user.id) return i.safeReply({
                content: "^{common.no_auth_components}",
                ephemeral: true
            });

            const data2 = await i.guild.fetchData()

            const load = {
                content: "",
                files: [],
                components: [],
                embeds: [new EmbedBuilder(client).setTheme(data2.Theme).setDescription("^{common.loading}")]
            }

            if (i.isAnySelectMenu()) {
                if (i.customId === "setup:al:panel") {
                    const WebHook = {}

                    await i.safeUpdate(load);

                    /** @type {Webhook} */
                    const web = await message.guild.channels.cache.get(i.values[0])?.createWebhook({
                        name: message.guild.name + " - Audit Log",
                        avatar: message.guild.iconURL(),
                        reason: "For Audit Logs"
                    })
                    WebHook.token = web.token;
                    WebHook.id = web.id

                    const key = `Webhook:${message.guild.id}:${WebHook.id}`
                    await cache.delete(key)

                    const newData = await client.db.UpdateOne('GuildConfig', {
                        Guild: message.guildId
                    }, {
                        $set: {
                            ["AuditLog.Channel"]: WebHook
                        }
                    }, { upsert: true, new: true })

                    await msg.safeEdit(home(newData))

                    await i.guild.updateData()
                }
            } else if (i.customId === "setup:al:reset") {

                await i.safeUpdate(load);
                const op = {}
                Object.keys(events).forEach(key => { op[key] = false })

                const data4 = await client.db.UpdateOne('GuildConfig', { Guild: i.guild.id }, {
                    $set: {
                        ["AuditLog"]: {
                            Channel: "",
                            ...op
                        }
                    }

                }, { upsert: true, new: true })

                await msg.safeEdit(home(data4))

                await i.guild.updateData()
            } else if (i.customId.includes("setup:al:event:")) {
                const event = i.customId.replace("setup:al:event:", "")
                await i.safeUpdate(load)

                if (data2.AuditLog?.[event]) data2.AuditLog[event] = false;
                else data2.AuditLog[event] = true

                const data4 = await client.db.UpdateOne('GuildConfig', { Guild: i.guild.id }, {
                    $set: {
                        ["AuditLog"]: data2.AuditLog
                    }

                }, { upsert: true, new: true })

                await msg.safeEdit(home(data4))

                await i.guild.updateData()

            }
        })


        collector.on('end', async i => {
            await msg.safeEdit({
                embeds: [new EmbedBuilder(client).setTheme(data.Theme).setDescription("^{common.timeout}")],
                files: [],
                content: "",
                components: []
            }).catch(() => { })

        })

    } catch (e) {
        err(e)
    }
}


export default {
    name: "setup-auditlog",
    cooldown: 5,
    description: "Setup audit for this server",
    category: "Setup",
    aliases: ["auditlog", "setal", "set-al", "setupauditlog", "auditlog-set", "auditlog-setup"],
    permissions: {
        user: ["Administrator"],
        bot: ["Administrator"]
    },
    run: cmd.run
};
import { EmbedBuilder, cache } from '../../../src/utils/index.mjs';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ChannelType, Message, Webhook, parseWebhookURL } from 'discord.js';
import Bot from '../../../src/client.mjs';
import { logModeration } from '../../../src/utils/classes/ModUtils.mjs';


export default {
    name: "set-modlog",
    description: "Set Moderation logs channel for this guild",
    cooldown: 5,
    category: "Setup",
    aliases: ['modlog-set', 'setup-modlog'],
    permissions: {
        user: ["Administrator", "SendMessages"],
        bot: ["Administrator"]
    },
    /** 
    * @param {Object} object
    * @param {Message | import("discord.js").Interaction} object.message - The message object.
    * @param {Bot} object.client
    * @param err ErrorHnadler
    */
    run: async ({ message, User, client, err, options, guildData, Slash }) => {
        try {
            const user = User || message.author || message.user;

            const Embed = new EmbedBuilder(client).setTheme(guildData?.Theme)

            const select = new ChannelSelectMenuBuilder()
                .setCustomId("setup:modlog:select")
                .setChannelTypes([ChannelType.GuildText])
                .setDisabled(guildData?.Modlog?.WebHook?.id ? true : false)
                .setMaxValues(1)
                .setPlaceholder("Channel")

            const btn = new ButtonBuilder()
                .setCustomId("setup:modlog:btn")
                .setDisabled(guildData?.Modlog?.WebHook?.id ? false : true)
                .setStyle(ButtonStyle.Secondary)
                .setLabel("^{common.reset}")

            const row = new ActionRowBuilder().addComponents(select)
            const row2 = new ActionRowBuilder().addComponents(btn)

            const msg = await message.safeReply({
                embeds: [
                    Embed.setAuthor({
                        name: `^{command.mod_log.title}`,
                        iconURL: client.user.displayAvatarURL(),
                    })
                        .setDescription("^{command.mod_log.description}")
                        .setDefaultFooter()
                ],
                components: [row, row2]
            })

            const collector = msg.createMessageComponentCollector({
                componentType: 0,
                time: 240 * 1000,
            })

            collector.on("collect",
                async i => {
                    if (i.user.id !== user.id) return await i.safeReply({
                        content: "^{common.no_auth_components}",
                        ephemeral: true
                    });

                    await i.safeUpdate({
                        components: [],
                        embeds: [
                            new EmbedBuilder().setTheme(guildData?.Theme).setDescription("^{common.loading}")
                        ]
                    });

                    const WebHook = {};

                    if (i.customId === "setup:modlog:select") {
                        /** @type {Webhook} */
                        const web = await message.guild.channels.cache.get(i.values[0])?.createWebhook({
                            name: message.guild.name,
                            avatar: message.guild.iconURL(),
                            reason: "For Mod Logs"
                        })
                        WebHook.token = web.token;
                        WebHook.id = web.id

                        const key = `Webhook:${message.guild.id}:${WebHook.id}`
                        await cache.delete(key)
                    }

                    if (i.customId === "setup:modlog:btn" && guildData.Modlog?.WebHook?.id) {
                        await client.deleteWebhook(guildData.Modlog.WebHook?.id, { token: guildData.Modlog.WebHook?.token }).catch(() => "");
                    }

                    await client.db.UpdateOne('GuildConfig', {
                        Guild: message.guildId
                    }, {
                        $set: {
                            ["Modlog.WebHook"]: WebHook
                        }
                    })

                    await msg.safeEdit({
                        components: [],
                        embeds: [
                            new EmbedBuilder(client).setTheme(guildData?.Theme).setDescription("^{common.updated} Modlog Channel.")
                        ]
                    });

                    await message.guild.updateData();
                });

            collector.on('end', async i => {
                await msg.safeEdit({
                    embeds: [new EmbedBuilder(client).setTheme(guildData?.Theme).setDescription("^{common.timeout}")],
                    files: [],
                    content: "",
                    components: []
                }).catch(() => { });
            });

        } catch (error) {
            err(error)
        }
    }
};
import { EmbedBuilder, cache } from '../../../src/utils/index.mjs';
import { ActionRowBuilder, ButtonBuilder, roleMention, ChannelSelectMenuBuilder, ChannelType, RoleSelectMenuBuilder } from 'discord.js';

/**@type {import('../../../src/utils/Command.mjs').prefix} */

export default {
    name: "set-ticket",
    description: "Setup ticket system for this guild",
    cooldown: 5,
    category: "Setup",
    aliases: ['ticket-set', 'setup-ticket', "setup-ticket"],
    permissions: {
        user: ["Administrator", "SendMessages"],
        bot: ["Administrator"]
    },
    run: async ({ message, User, client, err, options, guildData }) => {
        try {
            const user = User || message.author || message.user;

            const Embed = new EmbedBuilder().setTheme(guildData?.Theme)

            const rows = data => {
                const roleMenu = new RoleSelectMenuBuilder()
                    .setCustomId("setup:ticket:role")
                    .setDisabled(!data?.Ticket?.Enable)
                    .setMaxValues(1)
                    .setPlaceholder("Mod Roles")

                const categoryMenu = new ChannelSelectMenuBuilder()
                    .setCustomId("setup:ticket:category")
                    .setDisabled(!data?.Ticket?.Enable)
                    .setChannelTypes([ChannelType.GuildCategory])
                    .setMaxValues(1)
                    .setPlaceholder("Categories")

                const logChannelMenu = new ChannelSelectMenuBuilder()
                    .setCustomId("setup:ticket:logChannel")
                    .setDisabled(!data?.Ticket?.Enable)
                    .setChannelTypes([ChannelType.GuildText])
                    .setMaxValues(1)
                    .setPlaceholder("Log Channel")

                const btn = new ButtonBuilder()
                    .setCustomId("setup:ticket:enable")
                    .setStyle(data?.Ticket?.Enable ? 2 : 3)
                    .setLabel(data?.Ticket?.Enable ? "^{common.disable}" : "^{common.enable}")

                const btn2 = new ButtonBuilder()
                    .setCustomId("setup:ticket:reset")
                    .setDisabled(!(data.Ticket.Enable && data.Ticket.Category))
                    .setStyle(4)
                    .setLabel("^{common.reset}")

                const btn3 = new ButtonBuilder()
                    .setCustomId("setup:ticket:send")
                    .setStyle(3)
                    .setLabel("^{command.ticket.buttons.send_panel}")
                    .setDisabled(!(data.Ticket.Enable && data.Ticket.Role && data.Ticket.Category))


                return [
                    new ActionRowBuilder().setComponents([categoryMenu]),
                    new ActionRowBuilder().setComponents([roleMenu]),
                    new ActionRowBuilder().setComponents([logChannelMenu]),
                    new ActionRowBuilder().setComponents([btn, btn2]),
                    new ActionRowBuilder().setComponents([btn3]),
                ].map(row => row.toJSON())
            }


            const home = (data) => ({
                embeds: [
                    Embed.setAuthor({
                        name: `^{command.ticket.title}`,
                        iconURL: client.user.displayAvatarURL(),
                    })
                        .setDescription(`^{command.ticket.description}\n\n${data?.Ticket?.Category ? `!{star} Category: <#${data.Ticket.Category}>` : ""}\n${data?.Ticket?.Role ? `!{star} Admin Role: ${roleMention(data.Ticket.Role)}` : ""}\n${data?.Ticket?.LogChannel ? `!{star} Log Channel: <#${data.Ticket.LogChannel}>` : ""}`)
                        .setDefaultFooter()
                ],
                components: rows(data)
            });

            const msg = await message.safeReply(home(guildData))

            const collector = msg.createMessageComponentCollector({
                componentType: 0,
                time: 240 * 1000,
            })

            collector.on("collect",
                /** * @param {import('discord.js').Interaction} i */
                async i => {
                    if (i.user.id !== user.id) return await i.safeReply({
                        content: "^{common.no_auth_components}",
                        ephemeral: true
                    });

                    const load = {
                        embeds: [new EmbedBuilder(client).setTheme(guildData.Theme).setDescription("^{common.loading}")],
                        components: []
                    }

                    if (i.customId === "setup:ticket:category") {
                        await i.safeUpdate(load);

                        const data = await client.db.UpdateOne('GuildConfig', {
                            Guild: message.guildId
                        }, {
                            $set: {
                                ["Ticket.Category"]: i.values[0]
                            }
                        }, { upsert: true, new: true });

                        await msg.safeEdit(home(data));
                        await i.guild.updateData();

                    }

                    if (i.customId === "setup:ticket:logChannel") {
                        await i.safeUpdate(load);

                        const data = await client.db.UpdateOne('GuildConfig', {
                            Guild: message.guildId
                        }, {
                            $set: {
                                ["Ticket.LogChannel"]: i.values[0]
                            }
                        }, { upsert: true, new: true });

                        await msg.safeEdit(home(data));
                        await i.guild.updateData();

                    }

                    else if (i.customId === "setup:ticket:role") {
                        await i.safeUpdate(load);

                        const data = await client.db.UpdateOne('GuildConfig', {
                            Guild: message.guildId
                        }, {
                            $set: {
                                ["Ticket.Role"]: i.values[0]
                            }
                        }, { upsert: true, new: true });

                        await msg.safeEdit(home(data));
                        await i.guild.updateData();

                    }

                    else if (i.customId === "setup:ticket:enable") {
                        await i.safeUpdate(load);

                        const data2 = await i.guild.fetchData()

                        const data = await client.db.UpdateOne('GuildConfig', {
                            Guild: message.guildId
                        }, {
                            $set: {
                                ["Ticket.Enable"]: !data2.Ticket.Enable
                            }
                        }, { upsert: true, new: true });

                        await msg.safeEdit(home(data));
                        await i.guild.updateData();

                    }
                    else if (i.customId === "setup:ticket:reset") {
                        await i.safeUpdate(load);

                        const data = await client.db.UpdateOne('GuildConfig', {
                            Guild: message.guildId
                        }, {
                            $unset: {
                                ["Ticket"]: 0
                            }
                        }, { upsert: true, new: true });

                        await msg.safeEdit(home(data));
                        await i.guild.updateData();
                    }

                    else if (i.customId === "setup:ticket:send") {
                        await i.safeUpdate({
                            embeds: [],
                            components: [
                                new ActionRowBuilder().setComponents([
                                    new ChannelSelectMenuBuilder()
                                        .setChannelTypes([ChannelType.GuildText])
                                        .setPlaceholder("Channels")
                                        .setCustomId("setup:ticket:channel")
                                        .setMaxValues(1)
                                ])
                            ]
                        })
                    }


                    else if (i.customId === "setup:ticket:channel") {
                        await i.safeUpdate(load);
                        const row = new ActionRowBuilder()
                            .setComponents([
                                new ButtonBuilder()
                                    .setCustomId("feat:ticket:open")
                                    .setLabel("^{command.ticket.buttons.open}")
                                    .setStyle(1)
                                    .setEmoji("🎟️")
                            ]);
                        const embed = new EmbedBuilder()
                            .setTheme(guildData?.Theme)
                            .setFooter({
                                text: `${client.user.username} | ^{command.ticket.ticket_panel.title}`,
                                iconURL: client.user.displayAvatarURL()
                            })
                            .setAuthor({
                                name: i.guild.name,
                                iconURL: i.guild.iconURL()
                            })
                            .setDescription(`^{command.ticket.ticket_panel.description}`)
                            .setTimestamp()
                            .setTitle("^{command.ticket.ticket_panel.title}")

                        await i.guild.channels.cache.get(i.values[0]).safeSend({
                            embeds: [embed],
                            components: [row.toJSON()]
                        }).catch(() => { });

                        await msg.safeEdit(home(await i.guild.fetchData()));
                        await i.guild.updateData();
                    }
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
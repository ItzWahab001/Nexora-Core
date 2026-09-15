import EmbedBuilder from '../../../src/utils/classes/EmbedBuilder.mjs';
import {
    ChannelSelectMenuBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ChannelType
} from 'discord.js';


/**@type {import('../../../src/utils/Command.mjs').prefix} */
export default {
    name: "setup-message-mode",
    category: "Setup",
    cooldown: 5,
    description: "Setup ImageOnly textOnly channels",
    aliases: ["set-message-modes", "setup-message-mode", "set-message-mode", "message-mode"],
    permissions: {
        user: ["Administrator", "SendMessages"],
        bot: ["ManageRoles", "ManageWebhooks", "ManageMessages"]
    },
    run: async ({ message, client, err, Slash, options, guildData }) => {
        try {
            if (Slash && Slash.is) await message.deferReply({ fetchReply: true });

            const Types = ["Image", "Link", "DiscordInvites"]
            const user = message.author || message.user
            const data = guildData

            let homeBtn = new ButtonBuilder().setCustomId("MessageModes:home-btn").setStyle(2).setLabel("^{common.home_page}").setEmoji("979818265582899240");

            let resetBtn = (isdata = data) => new ButtonBuilder()
                .setCustomId("setup:MessageModes:reset")
                .setStyle(2).setLabel("^{common.reset}")
                .setEmoji("979818265582899240")
                .setDisabled(isdata?.MessageModes?.List?.length > 0 ? false : true)

            let addBtn = (isdata = data) => new ButtonBuilder()
                .setCustomId("setup:MessageModes:add")
                .setStyle(3).setLabel("^{command.message_modes.buttons.add}")
                .setDisabled(isdata?.MessageModes?.List?.length < 25 ? false : true)

            let removeBtn = (isdata = data) => new ButtonBuilder()
                .setCustomId("setup:MessageModes:remove:btn")
                .setStyle(4).setLabel("^{command.message_modes.buttons.remove}")
                .setDisabled(isdata?.MessageModes?.List?.length > 0 ? false : true)


            const row = (d = data) => new ActionRowBuilder()
                .addComponents(addBtn(d), removeBtn(d));

            const row2 = (isdata = data) => new ActionRowBuilder()
                .addComponents(resetBtn(isdata))

            let emebd = (d = data) => {
                let des = "^{command.message_modes.description}\n"

                if (d?.MessageModes?.List?.length) {
                    des += "\n^{command.message_modes.list}\n"
                    d.MessageModes.List.forEach(y => {
                        des += `- <#${y.Channel}> - \`${y.Type}\`\n`;
                    })
                }

                des += `\n\n> *${(client.getPromotion())?.Message}*`

                return new EmbedBuilder(client)
                    .setTheme(data.Theme)
                    .setAuthor({
                        name: "^{command.message_modes.title}",
                    })
                    .setDescription(des)
                    .setThumbnail("https://cdn.discordapp.com/emojis/1068024801186295808.gif")
                    .setFooter({
                        text: `${d.MessageModes?.List?.length || 0}/24`
                    })
                    .setTimestamp()
            }

            let msg = await message[Slash?.is ? "safeEdit" : "safeReply"]({
                components: [row(), row2()].map(c => c.toJSON()),
                embeds: [emebd()]
            });

            const collector = msg.createMessageComponentCollector({
                componentType: 0,
                time: 240 * 1000
            })

            collector.on("collect",
                /**
                 * @param {import('discord.js').Interaction} i 
                 */
                async (i) => {
                    if (i.user.id !== user.id) return await i.safeReply({
                        content: "^{common.no_auth_components}",
                        ephemeral: true
                    });

                    const data2 = await i.guild.fetchData();

                    const wait = {
                        embeds: [new EmbedBuilder().setTheme(data.Theme).setDescription("^{common.loading}")],
                        components: []
                    }

                    if (i.customId === "setup:MessageModes:reset") {

                        await i.safeUpdate(wait);

                        const data4 = await client.db.UpdateOne('GuildConfig', {
                            Guild: i.guild.id,
                        }, {
                            $set: {
                                ["MessageModes"]: {
                                    Enable: false,
                                    List: []
                                }
                            }
                        }, { upsert: true, new: true })

                        await msg.safeEdit({
                            components: [row(data4), row2(data4)],
                            embeds: [emebd(data4)]
                        })

                        await i.guild.updateData()

                    }

                    else if (i.customId === "setup:MessageModes:add") {

                        const row = new ActionRowBuilder()
                            .setComponents(
                                Types.map((type) => new ButtonBuilder().setCustomId(`setup:MessageModes:new:${type}`).setLabel(type).setStyle(2))
                            )

                        const embed = new EmbedBuilder().setTheme(guildData.Theme).setDescription("^{command.message_modes.select_mode}")
                        await i.safeUpdate({
                            components: [row],
                            embeds: [embed]
                        })
                    }

                    else if (i.customId.startsWith("setup:MessageModes:new:")) {
                        const [, , , type] = i.customId.split(":");

                        if (!i.isAnySelectMenu()) {
                            const menu = new ChannelSelectMenuBuilder()
                                .setCustomId(`setup:MessageModes:new:${type}`)
                                .setMaxValues(1)
                                .setChannelTypes([ChannelType.GuildText])
                                .setPlaceholder('channel')

                            const embed = new EmbedBuilder().setTheme(guildData.Theme).setDescription("^{command.message_modes.select_channel}")
                            const row = new ActionRowBuilder().setComponents([menu])
                            await i.safeUpdate({
                                components: [row],
                                embeds: [embed.toJSON()]
                            })
                        }
                        else {
                            const channel = i.values.shift();

                            if (data2.MessageModes.List.length >= 24) {
                                return await i.safeReply({
                                    ephemeral: true,
                                    embeds: [
                                        new EmbedBuilder().setTheme(guildData.Theme).setColor("wrongcolor").setDescription(`^{command.message_modes.limit_exceeded}. ${data2.MessageModes.List.length}/24`)
                                    ]
                                })
                            }

                            const channelData = data2.MessageModes?.List.find(l => l.Channel === channel);

                            if (channelData) {
                                return await i.safeReply({
                                    ephemeral: true,
                                    embeds: [
                                        new EmbedBuilder().setTheme(guildData.Theme).setColor("wrongcolor").setDescription(`^{command.message_modes.channel_already} \`${channelData.Type}\``)
                                    ]
                                })
                            }

                            await i.safeUpdate(wait);
                            const NewData = await client.db.UpdateOne('GuildConfig', {
                                Guild: i.guildId
                            }, {
                                $push: {
                                    ["MessageModes.List"]: {
                                        Channel: channel,
                                        Type: type
                                    }
                                }
                            }, { upsert: true, new: true })

                            await i.guild.updateData();
                            await msg.safeEdit(await home(NewData))
                        }

                    }

                    else if (i.customId === "setup:MessageModes:remove:btn") {

                        const Select = new StringSelectMenuBuilder()
                            .setCustomId(`setup:MessageModes:remove:menu`)
                            .setPlaceholder('^{common.click_here}')

                        let dis = ``

                        data2.MessageModes.List.forEach((y, index) => {
                            dis += `${index + 1}. <#${y.Channel}> - \`${y.Type}\``
                            Select.addOptions(
                                new StringSelectMenuOptionBuilder()
                                    .setLabel(`${index + 1}`)
                                    .setValue(`${index}`)
                            )
                        })

                        Select.setMinValues(1)
                        Select.setMaxValues(data2.MessageModes.List.length)

                        await i.safeUpdate({
                            embeds: [
                                new EmbedBuilder().setTheme(data2.Theme)
                                    .setDescription("^{command.message_modes.select_number}")
                            ],
                            components: [
                                new ActionRowBuilder().addComponents(Select),
                                new ActionRowBuilder().addComponents(homeBtn)
                            ].map(row => row.toJSON())
                        })

                    }

                    else if (i.customId === "setup:MessageModes:remove:menu") {
                        await i.safeUpdate(wait);

                        data2.MessageModes.List = data2.MessageModes.List.filter((y, index) => !i.values.map(Number).includes(index))

                        const updated = await client.db.UpdateOne('GuildConfig', {
                            Guild: i.guild.id
                        }, {
                            $set: {
                                ['MessageModes.List']: data2.MessageModes.List
                            }
                        }, { upsert: true, new: true });

                        await msg.safeEdit(await home(updated));

                        await i.guild.updateData()
                    }

                    else if (i.customId === "MessageModes:home-btn") await i.safeUpdate(await home())


                    //* Go to main page
                    async function home(data) {
                        if (!data) data = await i.guild.fetchData()
                        return {
                            files: [],
                            embeds: [emebd(data)],
                            content: "",
                            components: [row(data), row2(data)].map(row => row.toJSON())
                        };
                    }


                });


            collector.on('end', async i => {
                await msg.safeEdit({
                    embeds: [new EmbedBuilder().setTheme(guildData.Theme).setDescription("^{common.timeout}")],
                    files: [],
                    content: "",
                    components: []
                }).catch(() => { })
            })


        } catch (error) {
            err(error)
        }
    }
};
import Bot from '../../../src/client.mjs';
import EmbedBuilder from '../../../src/utils/classes/EmbedBuilder.mjs';
import {
    roleMention,
    ChannelSelectMenuBuilder,
    ActionRowBuilder,
    RoleSelectMenuBuilder,
    ButtonBuilder,
    Message,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    StringSelectMenuOptionBuilder,
    ChannelType
} from 'discord.js';
import { validateSocialMedia } from '../../../src/utils/index.mjs';


/**@type {import('../../../src/utils/Command.mjs').prefix} */
export default {
    ignore: false,
    name: "setup-auto-feeds",
    category: "Setup",
    cooldown: 5,
    description: "Setup social media feeds",
    aliases: ["set-autofeed", "set-auto-feed", "set-auto-feeds", "setup-autofeed", "setup-auto-feed", "setup-auto-feeds", "set-autofeeds"],
    permissions: {
        user: ["Administrator", "SendMessages"],
        bot: ["ManageRoles", "ManageWebhooks", "ManageMessages", "ReadMessageHistory", "EmbedLinks", "AttachFiles"]
    },
    run: async ({ message, client, err, Slash, options, guildData }) => {
        try {
            if (Slash?.is) await message.deferReply({ fetchReply: true });
            const Types = ["YouTube", "Twitch"]
            const user = message.author || message.user
            const data = guildData

            const homeBtn = new ButtonBuilder().setCustomId("AutoFeed:home-btn").setStyle(2).setLabel(`^{common.home_page}`);

            let resetBtn = (isdata = data) => new ButtonBuilder()
                .setCustomId("setup:AutoFeed:reset")
                .setStyle(2).setLabel("^{common.reset}")
                .setEmoji("979818265582899240")
                .setDisabled(isdata?.AutoFeed?.List?.length > 0 ? false : true)

            let addBtn = (isdata = data) => new ButtonBuilder()
                .setCustomId("setup:AutoFeed:add")
                .setStyle(3).setLabel("^{command.autofeed.buttons.add}")
                .setDisabled(isdata?.AutoFeed?.List?.length < 25 ? false : true)

            let removeBtn = (isdata = data) => new ButtonBuilder()
                .setCustomId("setup:AutoFeed:remove:btn")
                .setStyle(4).setLabel("^{command.autofeed.buttons.remove}")
                .setDisabled(isdata?.AutoFeed?.List?.length > 0 ? false : true)


            const row = (d = data) => new ActionRowBuilder()
                .addComponents(addBtn(d), removeBtn(d));

            const row2 = (isdata = data) => new ActionRowBuilder()
                .addComponents(resetBtn(isdata))

            let emebd = (d = data) => {
                let des = "^{command.autofeed.description}\n\n"

                if (d?.AutoFeed?.List?.length) {
                    des += "^{command.autofeed.list}\n"
                    d.AutoFeed.List.forEach(y => {
                        des += `- ${y.Type} - <#${y.Channel}> - \`${y.ID}\`\n`;
                    })
                }

                des += `\n\n> *${(client.getPromotion())?.Message}*`

                return new EmbedBuilder(client)
                    .setTheme(data.Theme)
                    .setAuthor({
                        name: "^{command.autofeed.title}",
                    })
                    .setDescription(des)
                    .setThumbnail("https://cdn.discordapp.com/emojis/1068024801186295808.gif")
                    .setFooter({
                        text: `${d.AutoFeed?.List?.length || 0}/24`
                    })
                    .setTimestamp()
            }

            let msg = await message[Slash?.is ? "safeEdit" : "safeReply"]({
                components: [row(), row2()].map(x=>x.toJSON()),
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

                    if (i.customId === "setup:AutoFeed:reset") {

                        await i.safeUpdate(wait);

                        const data4 = await client.db.UpdateOne('GuildConfig', {
                            Guild: i.guild.id,
                        }, {
                            $unset: {
                                ["AutoFeed"]: 0
                            }
                        }, { upsert: true, new: true })

                        await msg.safeEdit({
                            components: [row(data4), row2(data4)],
                            embeds: [emebd(data4)]
                        })

                        await i.guild.updateData()

                    }

                    else if (i.customId === "setup:AutoFeed:add") {

                        const row = new ActionRowBuilder()
                            .setComponents(
                                Types.map((type) => new ButtonBuilder().setCustomId(`setup:AutoFeed:new:${type}`).setLabel(type).setStyle(2))
                            )

                        const embed = new EmbedBuilder().setTheme(guildData.Theme).setDescription("^{command.autofeed.select_social_media}")
                        await i.safeUpdate({
                            components: [row.toJSON()],
                            embeds: [embed]
                        })
                    }

                    else if (i.customId.startsWith("setup:AutoFeed:new:")) {
                        const [, , , type, channel] = i.customId.split(":");

                        if (i.isButton()) {
                            if (!channel) {
                                const menu = new ChannelSelectMenuBuilder()
                                    .setCustomId(`setup:AutoFeed:new:${type}`)
                                    .setMaxValues(1)
                                    .setChannelTypes([ChannelType.GuildText])
                                    .setPlaceholder('channel')

                                const embed = new EmbedBuilder().setTheme(guildData.Theme).setDescription("^{command.autofeed.select_channel}")
                                const row = new ActionRowBuilder().setComponents([menu])

                                await i.safeUpdate({
                                    components: [row],
                                    embeds: [embed]
                                })
                            } else {
                                const input_1 = new TextInputBuilder()
                                    .setCustomId("url")
                                    .setLabel("Feed Url")
                                    .setStyle(1)
                                    .setMaxLength(200)
                                    .setRequired(true)
                                    .setPlaceholder("https://www.youtube.com/channel/UC_example_channel_id'")

                                const input_2 = new TextInputBuilder()
                                    .setCustomId("message")
                                    .setLabel("^{command.autofeed.modal.message}")
                                    .setStyle(2)
                                    .setMaxLength(1000)
                                    .setRequired(false)
                                    .setPlaceholder("^{command.autofeed.modal.message_ph}")

                                const modal = new ModalBuilder()
                                    .setCustomId(`setup:AutoFeed:new:modal`)
                                    .setTitle("^{command.autofeed.title}")
                                    .addComponents(
                                        new ActionRowBuilder().addComponents(input_1),
                                        new ActionRowBuilder().addComponents(input_2)
                                    )

                                await i.safeShowModal(modal.toJSON())

                                const response = await i.awaitModalSubmit({
                                    time: 240 * 1000,
                                    filter: (i) => i.user.id === i.user.id && i.customId === `setup:AutoFeed:new:modal`
                                });

                                if (!response || !response.isModalSubmit()) return;

                                const url = response.fields.fields.get("url").value
                                const message = response.fields.fields.get("message").value

                                if (message && !message.includes("{url}")) return await response.safeReply({
                                    content: "^{command.autofeed.must_contain_url}",
                                    ephemeral: true
                                });

                                const ID = validateSocialMedia(url, type)


                                if (!ID) {
                                    return await response.safeReply({
                                        ephemeral: true,
                                        embeds: [
                                            new EmbedBuilder().setTheme(guildData.Theme).setColor("wrongcolor").setDescription(`^{command.autofeed.invalid_id}`)
                                        ]
                                    })
                                }


                                if (data2.AutoFeed.List.length >= 24) {
                                    return await response.safeReply({
                                        ephemeral: true,
                                        embeds: [
                                            new EmbedBuilder().setTheme(guildData.Theme)
                                            .setColor("wrongcolor")
                                            .setDescription(`^{command.autofeed.limit_exceeded} ${data2.AutoFeed.List.length}/24`)
                                        ]
                                    })
                                }

                                const channelData = data2.AutoFeed?.List.find(l => l.ID === ID && l.Type === type);

                                if (channelData) {
                                    return await response.safeReply({
                                        ephemeral: true,
                                        embeds: [
                                            new EmbedBuilder().setTheme(guildData.Theme)
                                            .setColor("wrongcolor").setDescription(`^{command.autofeed.already_exists}`)
                                        ]
                                    })
                                }

                                await response.safeUpdate(wait);
                                const NewData = await client.db.UpdateOne('GuildConfig', {
                                    Guild: i.guildId
                                }, {
                                    $push: {
                                        ["AutoFeed.List"]: {
                                            Channel: channel,
                                            ID: ID,
                                            Message: message,
                                            Type: type
                                        }
                                    }
                                }, { upsert: true, new: true })

                                await i.guild.updateData();
                                await msg.safeEdit(await home(NewData))

                            }
                        }

                        else if (i.isAnySelectMenu()) {
                            const channel = i.values.shift();

                            const row = new ActionRowBuilder()
                                .setComponents([
                                    new ButtonBuilder()
                                        .setCustomId(`setup:AutoFeed:new:${type}:${channel}`)
                                        .setLabel("^{command.autofeed.title}")
                                        .setStyle(3)
                                ])
                            const embed = new EmbedBuilder().setTheme(guildData.Theme)
                                .setDefaultFooter()
                                .setDescription(`^{command.autofeed.variables}`)

                            await i.safeUpdate({
                                components: [row.toJSON()],
                                embeds: [embed]
                            })

                        }


                    }

                    else if (i.customId === "setup:AutoFeed:remove:btn") {

                        await i.safeUpdate(wait)
                        const Select = new StringSelectMenuBuilder()
                            .setCustomId(`setup:AutoFeed:remove:menu`)
                            .setPlaceholder('^{common.click_here}')

                        let dis = ``

                        // iterate on AutoFeed list and make a menu
                        data2.AutoFeed.List.forEach((y, index) => {
                            dis += `${index + 1}. **${y.Type}** - <#${y.Channel}> - \`${y.ID}\`\n`
                            Select.addOptions(
                                new StringSelectMenuOptionBuilder()
                                    .setLabel(`${index + 1}`)
                                    .setValue(`${index}`)
                            )
                        })

                        Select.setMinValues(1)
                        Select.setMaxValues(data2.AutoFeed.List.length)

                        await msg.safeEdit({
                            embeds: [
                                new EmbedBuilder().setTheme(data2.Theme)
                                    .setDescription("^{command.autofeed.select_to_remove}" + dis)
                            ],
                            components: [
                                new ActionRowBuilder().addComponents(Select),
                                new ActionRowBuilder().addComponents(homeBtn)
                            ].map(x => x.toJSON())
                        })

                    }

                    else if (i.customId === "setup:AutoFeed:remove:menu") {
                        await i.safeUpdate(wait);

                        data2.AutoFeed.List = data2.AutoFeed.List.filter((y, index) => !i.values.map(Number).includes(index))

                        const updated = await client.db.UpdateOne('GuildConfig', {
                            Guild: i.guild.id
                        }, {
                            $set: {
                                ['AutoFeed.List']: data2.AutoFeed.List
                            }
                        }, { upsert: true, new: true });

                        await msg.safeEdit(await home(updated));

                        await i.guild.updateData()
                    }

                    else if (i.customId === "AutoFeed:home-btn") await i.safeUpdate(await home())


                    //* Go to main page
                    async function home(data) {
                        if (!data) data = await i.guild.fetchData()
                        return {
                            files: [],
                            embeds: [emebd(data)],
                            content: "",
                            components: [row(data), row2(data)]
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
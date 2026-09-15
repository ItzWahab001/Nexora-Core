import Bot from '../../../src/client.mjs';
import EmbedBuilder from '../../../src/utils/classes/EmbedBuilder.mjs';
import {
    ActionRowBuilder,
    ButtonBuilder,
    Message,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ChannelSelectMenuBuilder,
    ChannelType
} from 'discord.js';

export default {
    ignore: true,
    name: "setup-auto-delete",
    category: "Setup",
    cooldown: 5,
    description: "Setup auto delete messages in channel with spcified time.",
    aliases: ["set-autodelete", "setup-autodelete", "setautodelete", "autodelete", "setup-d", "set-ad", "autodelete-setup", "setad"],
    permissions: {
        user: ["Administrator", "SendMessages"],
        bot: ["ManageRoles", "ManageWebhooks", "ManageMessages"]
    },
    /** 
    *@param {Object} object
    * @param {Message | import('discord.js').Interaction} object.message
    * @param {String[]} object.args
    * @param {Bot} object.client
    * @param {Object} object.Slash
    * @param {Map} object.options
    * @param object.err ErrorHnadler
     */
    run: async ({ message, client, err, Slash, options, guildData }) => {
        try {
            if (Slash && Slash.is) await message.deferReply({ fetchReply: true });
            const cacheKey = `setup:ad`
            const user = message.author || message.user

            const data = guildData;

            const Time = {
                "10s": "10 Seconds",
                "30s": "30 Seconds",
                "1min": "1 Minute",
                "5min": "5 Minutes",
                "30min": "30 Minutes",
                "60min": "1 Hour",
            }

            let homeBtn = new ButtonBuilder().setCustomId("home-btn").setStyle(2).setLabel("Back");

            let resetBtn = (isdata = data) => new ButtonBuilder()
                .setCustomId("setup:ad:reset")
                .setStyle(2).setLabel("Reset All")
                .setEmoji("979818265582899240")
                .setDisabled(isdata?.AutoDelete?.Enable && isdata?.AutoDelete?.List?.length > 0 ? false : true)

            let enableBtn = (isdata = data) => new ButtonBuilder()
                .setCustomId("setup:ad:Enable")
                .setStyle(isdata?.AutoDelete?.Enable ? 2 : 3)
                .setLabel(`${isdata?.AutoDelete?.Enable ? "Disable" : "Enable"}`)

            const row = (d = data) => new ActionRowBuilder()
                .addComponents(new ChannelSelectMenuBuilder()
                    .setChannelTypes(ChannelType.GuildText)
                    .setCustomId("setup:ad:channel:menu")
                    .setDisabled(d?.AutoDelete?.Enable ? false : true)
                    .setMaxValues(1)
                    .setPlaceholder("Select A channel to add or remove"));

            const row2 = (isdata = data) => new ActionRowBuilder()
                .addComponents(enableBtn(isdata), resetBtn(isdata))

            let emebd = (d = data) => {
                let des = "**This feature delete messages in spcified channel with spcified time**\n"

                if (d?.AutoDelete?.List?.length) {
                    des += "\n!{dot} **List Of Auto Deletes**\n"
                    d.AutoDelete.List.forEach(y => {
                        des += `- <#${y.Channel}> - Time: ${Time[y.Time]}\n`;
                    })
                }

                des += `\n\n> *${(client.getPromotion())?.Message}*`

                return new EmbedBuilder(client)
                    .setTheme(data.Theme)
                    .setAuthor({
                        name: "Auto Delete",
                        url: `${client.config.Links.Discord}`
                    })
                    .setDescription(des)
                    .setThumbnail("https://cdn.discordapp.com/emojis/1068024801186295808.gif")
                    .setDefaultFooter()
                    .setTimestamp()
            }

            let msg = await message[Slash?.is ? "safeEdit" : "safeReply"]({
                components: [row(), row2()],
                embeds: [emebd()]
            });

            const collector = msg.createMessageComponentCollector({
                componentType: 0,
                time: 240 * 1000
            })

            collector.on("collect",
                /** * @param {import('discord.js').Interaction} i */
                async (i) => {
                    if (i.user.id !== user.id) return await i.safeReply({
                        content: "^{common.no_auth_components}",
                        ephemeral: true
                    });

                    const data2 = await i.guild.fetchData();

                    const wait = {
                        embeds: [new EmbedBuilder(client).setTheme(data.Theme).setDescription("^{common.loading}")],
                        components: []
                    }

                    if (i.customId === "setup:ad:Enable") {
                        await i.safeUpdate(wait);
                        if (data2?.AutoDelete === undefined) {
                            Object.setPrototypeOf(data2, {
                                AutoDelete: { Enable: false, List: [] }
                            })
                        }
                        data2.AutoDelete.Enable = !data2.AutoDelete.Enable
                        const data3 = await client.db.UpdateOne('GuildConfig', {
                            Guild: i.guild.id,
                        }, {
                            $set: {
                                ["AutoDelete"]: data2.AutoDelete
                            }
                        }, { upsert: true, new: true })

                        await msg.safeEdit(await home(data3))

                        await i.guild.updateData()

                    } else if (i.customId === "setup:ad:reset") {

                        await i.safeUpdate(wait)

                        const data4 = await client.db.UpdateOne('GuildConfig', {
                            Guild: i.guild.id,
                        }, {
                            $set: {
                                ["AutoDelete"]: {
                                    Enable: false,
                                    List: []
                                }
                            }
                        }, { upsert: true, new: true })

                        await msg.safeEdit({
                            components: [row(false), row2(data4)],
                            embeds: [emebd(data4)]
                        })

                        await i.guild.updateData()

                    } else if (i.customId === "setup:ad:channel:menu") {
                        if (data2?.AutoDelete?.List?.find(y => y.Channel === i.values[0])) {
                            await i.safeUpdate(wait);
                            const data3 = await client.db.UpdateOne('GuildConfig', {
                                Guild: i.guild.id,
                            }, {
                                $set: {
                                    ["AutoDelete.List"]: data2.AutoDelete.List.filter(y => y.Channel !== i.values[0])
                                }
                            }, { upsert: true, new: true })

                            await msg.safeEdit(await home(data3))

                            await i.guild.updateData()
                        } else {
                            const row = new ActionRowBuilder()
                            const select = new StringSelectMenuBuilder()
                                .setCustomId(`setup:ad:time:menu:${i.values[0]}`)
                                .setMaxValues(1)
                                .setPlaceholder("Select Time")

                            Object.keys(Time).forEach(t => {
                                select.addOptions(
                                    new StringSelectMenuOptionBuilder()
                                        .setValue(t)
                                        .setLabel(Time[t])
                                )
                            });
                            row.setComponents(select);
                            await i.safeUpdate({
                                components: [row, new ActionRowBuilder().setComponents(homeBtn)],
                                embeds: [new EmbedBuilder().setTheme(guildData.Theme).setDescription("!{star} Select Auto Delete time from the following list")]
                            })
                        }
                    } else if (i.customId.includes("setup:ad:time:menu:")) {
                        const channelId = i.customId.replace("setup:ad:time:menu:", "")
                        await i.safeUpdate(wait);
                        if (data2?.AutoDelete?.List) data2.AutoDelete.List.push({
                            Channel: channelId,
                            Time: i.values[0]
                        });
                        else data2.AutoDelete.List = [{
                            Channel: channelId,
                            Time: i.values[0]
                        }]

                        const data3 = await client.db.UpdateOne('GuildConfig', {
                            Guild: i.guild.id,
                        }, {
                            $set: {
                                ["AutoDelete"]: data2.AutoDelete
                            }
                        }, { upsert: true, new: true })

                        await msg.safeEdit(await home(data3))

                        await i.guild.updateData()

                    } else if (i.customId === "home-btn") await i.safeUpdate(await home())


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
                    embeds: [new EmbedBuilder(client).setDescription("^{common.timeout}")],
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
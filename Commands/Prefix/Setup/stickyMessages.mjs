import EmbedBuilder from '../../../src/utils/classes/EmbedBuilder.mjs';
import {
    roleMention,
    ActionRowBuilder,
    RoleSelectMenuBuilder,
    ButtonBuilder,
    Message,
    ChannelSelectMenuBuilder,
    TextInputBuilder,
    ModalBuilder,
    ChannelType
} from 'discord.js';
import { sanitizeMessage } from '../../../src/utils/index.mjs';

export default {
    name: "setup-sticky-messages",
    cooldown: 5,
    category: "Setup",
    description: "Setup sticky messages in server. ",
    aliases: ["set-sm", "setup-sm", "sm-setup", "set-StickyMessages", "setup-StickyMessages", "StickyMessages-setup"],
    permissions: {
        user: ["Administrator", "SendMessages"],
        bot: ["ManageRoles"]
    },
    /** 
     * @param {Message | import('discord.js').Interaction} message
     * @param {Bot} client
     * @param {String[]} args
     * @param {Object} Slash
     * @param {Map} options
     * @param err ErrorHnadler
     */
    run: async ({ message, client, err, Slash, options, guildData }) => {
        try {
            if (Slash && Slash.is) await message.deferReply({ fetchReply: true });
            const user = message.author || message.user

            const data = guildData

            const select = (data) => new ChannelSelectMenuBuilder()
                .setCustomId(`setup:StickyMessages`)
                .setPlaceholder('Dont Make Selection!')
                .setChannelTypes([
                    ChannelType.GuildText
                ])
                .setDisabled(!data.StickyMessages?.Enable ? true : false)
                .setMaxValues(1);

            let resetBtn = (isdata = data) => new ButtonBuilder()
                .setCustomId("setup:StickyMessages:reset")
                .setStyle(2).setLabel("Reset")
                .setEmoji("979818265582899240")
                .setDisabled(isdata?.StickyMessages?.Enable ? false : true)

            let enableBtn = (isdata = data) => new ButtonBuilder()
                .setCustomId("setup:StickyMessages:Toggle")
                .setStyle(2)
                .setLabel(`${isdata?.StickyMessages?.Enable ? "Disable" : "Enable"}`)

            const row = (data) => new ActionRowBuilder()
                .addComponents(select(data));

            const row2 = (isdata = data) => new ActionRowBuilder()
                .addComponents(enableBtn(isdata), resetBtn(isdata))

            let emebd = (d = data) => {
                let des = "**Select a channel to add or remove into Sticky Roles!**"

                if (d && d.StickyMessages.List) {
                    let maped = d.StickyMessages.List.map((i, index) => `${index + 1}. <#${i.Channel}> - ${sanitizeMessage(i.Message, 20)}`)
                    if (maped.length > 0) des += `\n\n**Current List**\n${maped.join("\n")}`
                }

                des += `\n\n> *${(client.getPromotion())?.Message}*`

                return new EmbedBuilder(client)
                    .setTheme(data.Theme)
                    .setAuthor({
                        name: "Sticky List",
                        url: `${client.config?.Links?.Discord}`
                    })
                    .setDescription(des)
                    .setThumbnail("https://cdn.discordapp.com/emojis/1068024801186295808.gif")
                    .setDefaultFooter()
                    .setTimestamp()
            }

            let msg = await message[Slash?.is ? "editReply" : "reply"]({
                components: [row(data), row2()],
                embeds: [emebd()]
            });

            const collector = msg.createMessageComponentCollector({
                componentType: 0,
                time: 100 * 1000
            })

            collector.on("collect", async (i) => {
                if (i.user.id !== user.id) return await i.reply({
                    content: "!{skull}".replaceEmojis(client),
                    ephemeral: true
                });

                const data2 = await i.guild.fetchData();

                const wait = async () => await i.update({
                    embeds: [new EmbedBuilder(client).setTheme(data.Theme).setDescription("!{l} Loading...")],
                    components: []
                });

                if (i.customId === "setup:StickyMessages") {

                    let Exits = data2?.StickyMessages?.List?.find(y => y.Channel === i.values[0])

                    if (Exits) {

                        await wait();

                        let filterd = data2.StickyMessages.List.filter(y => y.Channel !== i.values[0]);

                        const data4 = await client.db.UpdateOne('GuildConfig', {
                            Guild: i.guild.id,
                        }, {
                            $set: {
                                ["StickyMessages.List"]: filterd
                            }
                        }, { upsert: true, new: true })

                        await msg.edit({
                            components: [row(data4), row2(data4)],
                            embeds: [emebd(data4)]
                        });

                        await i.guild.updateData()

                    } else {

                        if (data2 && data2?.StickyMessages?.List?.length >= 20) {
                            return await i.reply({
                                content: "***You can add 20 only!***",
                                ephemeral: true
                            })

                        } else {
                            const input_1 = new TextInputBuilder()
                                .setCustomId('sticky:message')
                                .setLabel("Message")
                                .setRequired(true)
                                .setPlaceholder("This is a sticket message")
                                .setStyle(2).setMaxLength(200);

                            const modal = new ModalBuilder().setCustomId('StickyMessages')
                                .setTitle('Sticky Messages')
                                .addComponents(new ActionRowBuilder().addComponents(input_1));

                            await i?.safeShowModal(modal.toJSON());

                            const response = await i.awaitModalSubmit({
                                filter: i => i.customId === "StickyMessages" && i.user.id === user.id,
                                time: 240 * 1000
                            });

                            /// on modal submit
                            if (response.isModalSubmit()) {
                                let value = response.fields.fields.get("sticky:message").value;


                                // await msg.edit({
                                //     embeds: [new EmbedBuilder(client).setDescription("***Wait A Second!*** !{l}")],
                                //     components: []
                                // });


                                const data4 = await client.db.UpdateOne('GuildConfig', {
                                    Guild: i.guild.id,
                                }, {
                                    $push: {
                                        ["StickyMessages.List"]: {
                                            Channel: i.values[0],
                                            Message: value
    
                                        }
                                    }
                                }, { upsert: true, new: true });

                                await response.update({
                                    components: [row(data4), row2(data4)],
                                    embeds: [emebd(data4)]
                                })

                                await i.guild.updateData()
                            }



                        }

                    }

                } else if (i.customId === "setup:StickyMessages:Toggle") {

                    await wait();

                    const data3 = await client.db.UpdateOne('GuildConfig', {
                        Guild: i.guild.id,
                    }, {
                        $set: {
                            ["StickyMessages.Enable"]: data2.StickyMessages.Enable ? false : true
                        }
                    }, { upsert: true, new: true })

                    await msg.edit({
                        components: [row(data3), row2(data3)],
                        embeds: [emebd(data3)]
                    })
                    await i.guild.updateData()


                } else if (i.customId === "setup:StickyMessages:reset") {

                    await wait();

                    const data4 = await client.db.UpdateOne('GuildConfig', {
                        Guild: i.guild.id,
                    }, {
                        $set: {
                            ["StickyMessages"]: {
                                Enable: false,
                                List: [],
                            }
                        }
                    }, { upsert: true, new: true })

                    await msg.edit({
                        components: [row(data4), row2(data4)],
                        embeds: [emebd(data4)]
                    })
                    await i.guild.updateData()

                }

            });

            collector.on('end', async i => {
                await msg.edit({
                    embeds: [new EmbedBuilder(client).setTheme(guildData.Theme).setDescription("!{skull} **Timeout!** Run Command Again.")],
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
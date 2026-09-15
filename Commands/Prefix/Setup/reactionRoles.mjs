import EmbedBuilder from '../../../src/utils/classes/EmbedBuilder.mjs';
import { isImageURLValid } from '../../../src/utils/index.mjs';

import {
    roleMention,
    ActionRowBuilder,
    RoleSelectMenuBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ButtonBuilder,
    TextInputBuilder,
    ModalBuilder,
    ChannelSelectMenuBuilder,
    Message
} from 'discord.js';
import { parseEmoji } from '../../../src/utils/emoji.mjs';
export default {
    name: "setup-reaction-roles",
    category: "Setup",
    cooldown: 5,
    description: "Setup reaction roles in server upto 25 panels",
    permissions: {
        user: ["Administrator", "SendMessages"],
        bot: ["ManageRoles"]
    },
    aliases: ["set-rr", "setup-rr", "rr-setup", "set-reactionroles", "setup-reactionroles", "setup-reactionrole"],
    options: [
        {
            name: "Panel Number",
            type: "number",
            id: "panel",
            required: true,
            min: 1,
            max: 25
        }
    ],
    /** 
     * @param {Message | import('discord.js').message} message
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
            const panelNum = options.get("panel")?.value || options.get("panel");

            const data = await client.db.FindOne('ReactionRoles', {
                Guild: message.guild.id,
                Panel: panelNum
            })

            const roleSelect = (disabled = false) => new RoleSelectMenuBuilder()
                .setCustomId(`setup-reaction-roles-panel`)
                .setPlaceholder('Roles')
                .setDisabled(disabled)
                .setMaxValues(1);

            let resetBtn = (isdata = data) => new ButtonBuilder()
                .setCustomId("reaction-roles-panel-reset")
                .setStyle(2).setLabel("^{common.reset}")
                .setEmoji("979818265582899240")
                .setDisabled(isdata ? false : true)

            let multiSelectBtn = (isdata = data) => new ButtonBuilder()
                .setCustomId("reaction-roles-multiselect")
                .setStyle(2).setLabel(`${isdata && isdata.MultiSelect ? "^{command.react_role.buttons.multi_select_role.disable}" : "^{command.react_role.buttons.multi_select_role.enable}"}`)

            let sendPanelBtn = (isdata = data) => new ButtonBuilder()
                .setCustomId("reaction-roles-send-panel")
                .setStyle(3).setLabel("^{command.react_role.buttons.send_panel}")
                .setEmoji("1058313763457081435")
                .setDisabled(isdata ? false : true)


            const row = (dis = false) => new ActionRowBuilder()
                .addComponents(roleSelect()).toJSON();

            const row2 = (isdata = data) => new ActionRowBuilder()
                .addComponents(multiSelectBtn(isdata), resetBtn(isdata), sendPanelBtn(isdata)).toJSON()

            let emebd = (d = data) => {
                let des = "^{command.react_role.description}"
                if (d && d.Roles) {
                    let maped = d.Roles.map((i, index) => `${index + 1}. ${roleMention(i.RoleID)}`)
                    if (maped.length > 0) des += `\n\n**Roles in ${panelNum} Panel**\n${maped.join("\n")}`
                }
                des += `\n\n> *${(client.getPromotion())?.Message}*`
                return new EmbedBuilder(client).setAuthor({
                    name: "^{command.react_role.title}",
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

            collector.on("collect", async (i) => {
                if (i.user.id !== user.id) return await i.safeReply({
                    content: "^{common.no_auth_components}",
                    ephemeral: true
                });

                const data2 = await client.db.FindOne('ReactionRoles', {
                    Guild: i.guild.id,
                    Panel: panelNum
                })

                const wait = async () => await i.safeUpdate({
                    embeds: [new EmbedBuilder(client).setDescription('^{common.loading}')],
                    components: []
                });

                if (i.customId === "setup-reaction-roles-panel") {

                    const role = i.guild.roles.cache.get(i.values[0])
                    const myPositon = i.guild.members.me.roles.highest.position;

                    if (role.position >= myPositon) return i.safeReply({
                        content: "^{command.react_role.high_role}",
                        ephemeral: true
                    });

                    else if (role.tags && role.tags.botId) return i.safeReply({
                        content: "^{command.react_role.bot_role} - <@" + role.tags.botId + ">",
                        ephemeral: true
                    })

                    let isRoleExits = data2?.Roles?.find(y => y.RoleID === role.id)

                    if (isRoleExits) {
                        await wait();
                        let filterd = data2.Roles.filter(y => y.RoleID !== role.id);
                        const data4 = await client.db.UpdateOne('ReactionRoles', {
                            Guild: i.guild.id,
                            Panel: panelNum
                        }, {
                            $set: {
                                Roles: filterd
                            }
                        }, { upsert: true, new: true })
                        await msg.safeEdit({
                            components: [row(data4), row2(data4)],
                            embeds: [emebd(data4)]
                        });
                    } else {
                        if (data2 && data2?.Roles?.length >= 20) {
                            return await i.safeReply({
                                content: `^{command.react_role.limit_exceeded}. ${data2.Roles.length}/20`,
                                ephemeral: true
                            })
                        } else {
                            const input_1 = new TextInputBuilder()
                                .setCustomId('reaction-role-title')
                                .setLabel("^{command.react_role.modal.title.label}")
                                .setValue("^{command.react_role.modal.title.value}")
                                .setRequired(true)
                                // .setPlaceholder('Enter some text!')
                                .setStyle(1)
                                .setMaxLength(20)
                            const input_2 = new TextInputBuilder()
                                .setCustomId('reaction-role-ds')
                                .setLabel("^{command.react_role.modal.des.label}")
                                .setValue("^{command.react_role.modal.des.value}")
                                .setRequired(true)
                                // .setPlaceholder('Enter some Description!')
                                .setStyle(1)
                                .setMaxLength(50)
                            const input_3 = new TextInputBuilder()
                                .setCustomId('reaction-role-emoji')
                                .setValue("^{command.react_role.modal.emoji.value}")
                                .setLabel("^{command.react_role.modal.emoji.label}")
                                .setRequired(false)
                                // .setPlaceholder('Enter A Valid Emoji ID! (Emoji must accessible by me)')
                                .setStyle(1)
                                .setMaxLength(50)

                            const modal = new ModalBuilder()
                                .setCustomId('reaction-role-modal')
                                .setTitle('^{command.react_role.title}')
                                .addComponents(new ActionRowBuilder().addComponents(input_1))
                                .addComponents(new ActionRowBuilder().addComponents(input_2))
                                .addComponents(new ActionRowBuilder().addComponents(input_3))


                            await i.safeShowModal(modal.toJSON())

                            const response = await i.awaitModalSubmit({
                                filter: (i) =>
                                    i.customId === "reaction-role-modal" &&
                                    i.user.id === user.id,
                                time: 240 * 1000,
                            });

                            /// on modal submit
                            if (response.isModalSubmit()) {
                                let title = response.fields.fields.get("reaction-role-title").value
                                let description = response.fields.fields.get("reaction-role-ds").value
                                let emoji = response.fields.fields.get("reaction-role-emoji").value;
                                let parsed = parseEmoji(emoji)
                                if (emoji && !parsed) return await response.safeReply({
                                    content: "^{command.react_role.invalid_emoji}",
                                    ephemeral: true
                                })


                                await response.deferUpdate();

                                await msg.safeEdit({
                                    embeds: [new EmbedBuilder(client).setDescription("^{common.loading}")],
                                    components: []
                                });


                                const data4 = await client.db.UpdateOne('ReactionRoles', {
                                    Guild: i.guild.id,
                                    Panel: panelNum
                                }, {
                                    $push: {
                                        Roles: {
                                            RoleID: role.id, Title: title, Description: description, Emoji: parsed || null
                                        }
                                    }
                                }, { upsert: true, new: true });

                                await msg.safeEdit({
                                    components: [row(false), row2(data4)],
                                    embeds: [emebd(data4)]
                                })

                            }
                        }

                    }

                } else if (i.customId === "reaction-roles-multiselect") {
                    if (!data2 || (data2 && data2.Roles?.length <= 1)) return await i.safeReply({
                        content: "^{command.react_role.two_roles_required}",
                        ephemeral: true
                    })

                    await wait();

                    data2.MultiSelect = data2.MultiSelect ? false : true;

                    const data3 = await client.db.UpdateOne('ReactionRoles', {
                        Guild: i.guild.id,
                        Panel: panelNum
                    }, {
                        $set: {
                            MultiSelect: data2.MultiSelect
                        }
                    }, { upsert: true, new: true })

                    await msg.safeEdit({
                        components: [row(false), row2(data3)],
                        embeds: [emebd(data3)]
                    })

                } else if (i.customId === "reaction-roles-panel-reset") {
                    await wait();

                    await client.db.Delete('ReactionRoles', {
                        Guild: i.guild.id,
                        Panel: panelNum
                    })

                    const data4 = await client.db.FindOne('ReactionRoles', {
                        Guild: i.guild.id,
                        Panel: panelNum
                    })

                    await msg.safeEdit({
                        components: [row(false), row2(data4)],
                        embeds: [emebd(data4)]
                    })

                } else if (i.customId === "reaction-roles-send-panel") {

                    let embed = new EmbedBuilder(client).setAuthor({
                        name: "Reaction Role",
                        url: "https://youtube.com/@uoaio",
                        iconURL: "https://cdn.discordapp.com/emojis/1122752979854962719"
                    })
                        .setThumbnail("https://cdn.discordapp.com/emojis/1122752979854962719")
                        .setDescription("*Select a channel from given channels to send Reaction Role Panel!*")
                    const channelSelect = (disabled = false) => new ChannelSelectMenuBuilder()
                        .setCustomId('reactionRole-channel')
                        .setPlaceholder('Dont Make Selection!')
                        .setDisabled(disabled)
                        .setMaxValues(1)
                        .setChannelTypes(0);

                    const channelRow = new ActionRowBuilder()
                        .addComponents(channelSelect());

                    await i.safeUpdate({
                        embeds: [embed],
                        components: [channelRow.toJSON()]
                    });
                } else if (i.customId === "reactionRole-channel") {
                    let channel = i.values[0];

                    const input_1 = new TextInputBuilder()
                        .setCustomId('reaction-role-title')
                        .setLabel("^{command.react_role.modal.embed_title.label}")
                        .setValue("^{command.react_role.modal.embed_title.value}")
                        .setRequired(true)
                        // .setPlaceholder('Enter some text!')
                        .setStyle(1)
                        .setMaxLength(60)
                    const input_2 = new TextInputBuilder()
                        .setCustomId('reaction-role-ds')
                        .setLabel("^{command.react_role.modal.embed_des.label}")
                        .setValue("^{command.react_role.modal.embed_des.value}")
                        .setRequired(true)
                        // .setPlaceholder('Enter some Description!')
                        .setStyle(2)
                        .setMaxLength(200)
                    const input_3 = new TextInputBuilder()
                        .setCustomId('reaction-role-color')
                        .setLabel("^{command.react_role.modal.embed_c.label}")
                        .setRequired(false)
                        .setPlaceholder('^{command.react_role.modal.embed_c.ph}')
                        .setStyle(1)
                        .setMaxLength(6).setMinLength(6)
                    const input_4 = new TextInputBuilder()
                        .setCustomId('reaction-role-embed-image')
                        .setLabel("^{command.react_role.modal.embed_image.label}")
                        .setRequired(false)
                        .setPlaceholder('^{command.react_role.modal.embed_image.ph}')
                        .setStyle(1)
                        .setMaxLength(300)
                    const input_5 = new TextInputBuilder()
                        .setCustomId('reaction-role-embed-thumbnail')
                        .setLabel("^{command.react_role.modal.embed_thumb.label}")
                        .setRequired(false)
                        .setPlaceholder('^{command.react_role.modal.embed_thumb.ph}')
                        .setStyle(1)
                        .setMaxLength(300)


                    const modal = new ModalBuilder()
                        .setCustomId('reaction-role-embed')
                        .setTitle('^{command.react_role.title}')
                        .addComponents(new ActionRowBuilder().addComponents(input_1))
                        .addComponents(new ActionRowBuilder().addComponents(input_3))
                        .addComponents(new ActionRowBuilder().addComponents(input_4))
                        .addComponents(new ActionRowBuilder().addComponents(input_5))
                        .addComponents(new ActionRowBuilder().addComponents(input_2))


                    await i.safeShowModal(modal.toJSON());

                    const response = await i.awaitModalSubmit({
                        filter: (i) =>
                            i.customId === "reaction-role-embed" &&
                            i.user.id === user.id,
                        time: 240 * 1000,
                    });

                    if (response.isModalSubmit()) {
                        let title = response.fields.fields.get("reaction-role-title").value
                        let description = response.fields.fields.get("reaction-role-ds").value
                        let color = response.fields.fields.get("reaction-role-color").value
                        let image = response.fields.fields.get("reaction-role-embed-image").value
                        let thumbnail = response.fields.fields.get("reaction-role-embed-thumbnail").value

                        if (color && !/^[A-Fa-f0-9]{6}$/.test(color)) return await response.safeReply({
                            embeds: [new EmbedBuilder(client).setDescription("^{common.invalid_hex}")],
                            ephemeral: true
                        });

                        if (image) {
                            if (!await isImageURLValid(image)) return await response.safeReply({
                                embeds: [new EmbedBuilder(client).setDescription("^{common.invalid_image_url}")],
                                ephemeral: true
                            });
                        }

                        if (thumbnail) {
                            if (!await isImageURLValid(thumbnail)) return await response.safeReply({
                                embeds: [new EmbedBuilder(client).setDescription("^{common.invalid_image_url}")],
                                ephemeral: true
                            });
                        }


                        await response.deferUpdate();

                        await msg.safeEdit({
                            embeds: [new EmbedBuilder(client).setDescription("^{common.loading}")],
                            components: []
                        });

                        const data3 = await client.db.FindOne('ReactionRoles', {
                            Guild: i.guild.id,
                            Panel: panelNum
                        })

                        const select = new StringSelectMenuBuilder()
                            .setCustomId(`reaction-roles-panel-${panelNum}`)
                            .setPlaceholder('Roles!')
                            .setMaxValues(1);

                        data3.Roles.forEach(y => {
                            select.addOptions([
                                new StringSelectMenuOptionBuilder()
                                    .setLabel(y.Title.toString())
                                    .setDescription(y.Description.toString())
                                    .setValue(y.RoleID.toString())
                                    .setEmoji(y.Emoji ? y.Emoji.toString() : "1079435102989324409")
                            ])
                        })

                        await i.guild.channels.cache.get(channel).safeSend({
                            embeds: [new EmbedBuilder(client)
                                .setFooter({
                                    text: `${i.guild.name} - Panel Number: ${panelNum}`,
                                    iconURL: i.guild.iconURL({
                                        dynamic: true
                                    })
                                })
                                .setTitle(`${title}`)
                                .setColor(color ? `#${color}` : "color")
                                .setThumbnail(thumbnail ? thumbnail.toString() : "https://cdn.discordapp.com/emojis/1079435102989324409")
                                .setImage(image ? image.toString() : "https://cdn.discordapp.com/attachments/1041589448523128874/1157980074923003946/jH6vegK.png")
                                .setDescription(`${description}`)
                            ],
                            components: [new ActionRowBuilder().addComponents(select)]
                        }).then(async (m) => {


                            await client.db.UpdateOne('ReactionRoles', {
                                Guild: i.guild.id,
                                Panel: panelNum
                            }, {
                                $set: {
                                    Channel: channel,
                                    MessageID: m.id
                                }
                            })

                            await msg.safeEdit({
                                embeds: [new EmbedBuilder(client).setDescription("^{command.react_role.panel_success}")],
                                components: []
                            });

                            if (data3.MessageID && data3.Channel) await message.guild.channels.cache.get(data3.Channel)?.messages.delete(data3.MessageID).catch({})
                        }).catch(async (error) => {
                            console.log(error)
                            await msg.safeEdit({
                                embeds: [new EmbedBuilder(client).setDescription("^{command.react_role.error_while_panel}")],
                                components: []
                            });
                        });

                    }

                }

            });

            collector.on('end', async i => {
                await msg.safeEdit({
                    embeds: [new EmbedBuilder(client).setTheme(guildData.Theme).setDescription("^{common.timeout}")],
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
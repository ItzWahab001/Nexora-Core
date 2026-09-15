import Bot from '../../../src/client.mjs';
import EmbedBuilder from '../../../src/utils/classes/EmbedBuilder.mjs';
import {
    ActionRowBuilder,
    RoleSelectMenuBuilder,
    ButtonBuilder,
    Message,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    StringSelectMenuOptionBuilder
} from 'discord.js';
import { sanitizeMessage, cache, variables, isImageURLValid } from '../../../src/utils/index.mjs';

export default {
    name: "setup-commands",
    category: "Setup",
    cooldown: 5,
    description: "Setup custom commands for this server.",
    aliases: ["set-custom-command", "setup-customcommands", "setcommand", "set-custom-commands", "setup-cc", "set-cc", "custom-commands", "setcc"],
    permissions: {
        user: ["Administrator", "SendMessages"],
        bot: ["ManageRoles", "ManageWebhooks", "ManageMessages"]
    },
    run: async ({ message, client, err, Slash, options, guildData }) => {
        try {
            if (Slash && Slash.is) await message.deferReply({ fetchReply: true });
            const cacheKey = `setup:cc`
            const user = message.author || message.user

            const data = guildData

            let homeBtn = new ButtonBuilder().setCustomId("cc:home-btn").setStyle(2).setLabel("Back");
            let resetBtn = (isdata = data) => new ButtonBuilder()
                .setCustomId("setup:cc:reset")
                .setStyle(2).setLabel("^{common.reset}")
                .setEmoji("979818265582899240")
                .setDisabled(isdata?.CustomCommands?.Enable && isdata?.CustomCommands?.List?.length > 0 ? false : true)

            let addBtn = (isdata = data) => new ButtonBuilder()
                .setCustomId("setup:cc:add")
                .setStyle(3).setLabel("^{command.custom_commands.buttons.add}")
                // .setEmoji("979818265582899240")
                .setDisabled(isdata?.CustomCommands?.Enable && isdata?.CustomCommands?.List?.length < 25 ? false : true)

            let removeBtn = (isdata = data) => new ButtonBuilder()
                .setCustomId("setup:cc:remove:btn")
                .setStyle(4).setLabel("^{command.custom_commands.buttons.remove}")
                // .setEmoji("979818265582899240")
                .setDisabled(isdata?.CustomCommands?.Enable && isdata?.CustomCommands?.List?.length > 0 ? false : true)

            let prefixBtn = (isdata = data) => new ButtonBuilder()
                .setCustomId("setup:cc:prefix")
                .setStyle(2).setLabel("^{command.custom_commands.buttons.update_prefix}") 
                .setDisabled(isdata?.CustomCommands?.Enable ? false : true)


            let enableBtn = (isdata = data) => new ButtonBuilder()
                .setCustomId("setup:cc:Enable")
                .setStyle(2)
                .setLabel(`${isdata?.CustomCommands?.Enable ? "^{common.disable}" : "^{common.enable}"}`)

            const row = (d = data) => new ActionRowBuilder()
                .addComponents(addBtn(d), removeBtn(d));

            const row2 = (isdata = data) => new ActionRowBuilder()
                .addComponents(enableBtn(isdata), resetBtn(isdata), prefixBtn(isdata))

            let emebd = (d = data) => {
                let des = "**^{command.custom_commands.description}**\n"

                if (d?.CustomCommands?.List?.length) {
                    des += "\n^{command.custom_commands.list}\n"
                    d.CustomCommands.List.forEach(y => {
                        des += `- ${y.Triger}\n - ${y.Response?.content ? sanitizeMessage(y.Response.content, 10) : "Embed Response"}\n`;
                    })
                }

                des += `\n\n> *${(client.getPromotion())?.Message}*`

                return new EmbedBuilder(client)
                    .setTheme(data.Theme)
                    .setAuthor({
                        name: "^{command.custom_commands.title}",
                        url: `${client.config.Links.Discord}`
                    })
                    .setDescription(des)
                    .setThumbnail("https://cdn.discordapp.com/emojis/1068024801186295808.gif")
                    .setFooter({
                        text: `^{command.custom_commands.footer.0}: ${d?.CustomCommands?.Prefix} - ^{command.custom_commands.footer.1}: ${d.CustomCommands?.List?.length || 0}/24`
                    })
                    .setTimestamp()
            }

            let msg = await message[Slash?.is ? "safeEdit" : "safeReply"]({
                components: [row(), row2()].map(row=> row.toJSON()),
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

                const data2 = await i.guild.fetchData();

                const wait = async () => await i.safeUpdate({
                    embeds: [new EmbedBuilder(client).setTheme(data.Theme).setDescription("^{common.loading}")],
                    components: []
                });

                if (i.customId === "setup:cc") {

                    if (!data2.CustomCommands.Enable) return await i.safeReply({
                        content: "^{command.custom_commands.enable_first}",
                        ephemeral: true
                    })

                    await wait();

                    const data4 = await client.db.UpdateOne('GuildConfig', {
                        Guild: i.guild.id,
                    }, {
                        $set: {
                            ["CustomCommands.Channel"]: i.values[0]
                        }
                    }, { upsert: true, new: true })

                    await msg.safeEdit({
                        components: [row(data4), row2(data4)],
                        embeds: [emebd(data4)]
                    });

                    await i.guild.updateData()

                } else if (i.customId === "setup:cc:Enable") {

                    await wait();

                    const data3 = await client.db.UpdateOne('GuildConfig', {
                        Guild: i.guild.id,
                    }, {
                        $set: {
                            ["CustomCommands.Enable"]: data2.CustomCommands.Enable ? false : true
                        }
                    }, { upsert: true, new: true })

                    await msg.safeEdit(await home(data3))

                    await i.guild.updateData()


                } else if (i.customId === "setup:cc:reset") {

                    await wait();

                    const data4 = await client.db.UpdateOne('GuildConfig', {
                        Guild: i.guild.id,
                    }, {
                        $set: {
                            ["CustomCommands"]: {
                                Enable: false,
                                Prefix: data.Prefix,
                                List: []
                            }
                        }
                    }, { upsert: true, new: true })

                    await msg.safeEdit({
                        components: [row(false), row2(data4)],
                        embeds: [emebd(data4)]
                    })

                    await i.guild.updateData()

                } else if (i.customId === "setup:cc:prefix") {

                    const input_1 = new TextInputBuilder()
                        .setCustomId('prefix')
                        .setLabel("^{command.custom_commands.modal.prefix}")
                        .setRequired(true)
                        .setPlaceholder("^{command.custom_commands.modal.prefix_ph}")
                        .setStyle(1).setMaxLength(2);

                    const modal = new ModalBuilder().setCustomId('cc:prefix')
                        .setTitle('^{command.custom_commands.title}')
                        .addComponents(new ActionRowBuilder().addComponents(input_1));

                    await i?.safeShowModal(modal.toJSON());

                    const response = await i.awaitModalSubmit({
                        filter: i => i.customId === "cc:prefix" && i.user.id === user.id,
                        time: 240 * 1000
                    });

                    /// on modal submit
                    if (response.isModalSubmit()) {
                        let value = response.fields.fields.get("prefix").value;


                        await response?.safeUpdate({
                            embeds: [new EmbedBuilder(client).setTheme(data.Theme).setDescription("^{common.loading}!")],
                            components: [],
                            files: []
                        });

                        const data4 = await client.db.UpdateOne('GuildConfig', {
                            Guild: i.guild.id,
                        }, {
                            $set: {
                                ["CustomCommands.Prefix"]: value,
                            }
                        }, { upsert: true, new: true })

                        await msg.safeEdit(await home(data4))

                        await i.guild.updateData()

                    }


                } else if (i.customId === "setup:cc:add") {
                    await wait();

                    await msg.safeEdit(await updateAdd())

                } else if (i.customId === "setup:cc:remove:btn") {

                    const Select = new StringSelectMenuBuilder()
                        .setCustomId(`setup:cc:remove:menu`)
                        .setPlaceholder('^{common.click_here}')

                    data2.CustomCommands.List.forEach(y => {
                        Select.addOptions(
                            new StringSelectMenuOptionBuilder()
                                .setLabel(`${y.Triger}`)
                                .setValue(`${y.Triger}`)
                        )
                    })

                    Select.setMinValues(1)
                    Select.setMaxValues(data2.CustomCommands.List.length)

                    await i.safeUpdate({
                        embeds: [
                            new EmbedBuilder().setTheme(data2.Theme)
                                .setDescription("^{command.custom_commands.select_to_remove}")
                        ],
                        components: [
                            new ActionRowBuilder().addComponents(Select),
                            new ActionRowBuilder().addComponents(homeBtn)
                        ]
                    })

                } else if (i.customId === "setup:cc:remove:menu") {
                    await wait()

                    data2.CustomCommands.List = data2.CustomCommands.List.filter(y => !i.values.includes(y.Triger))

                    const updated = await client.db.UpdateOne('GuildConfig', {
                        Guild: i.guild.id
                    }, {
                        $set: {
                            ['CustomCommands.List']: data2.CustomCommands.List
                        }
                    }, { upsert: true, new: true });

                    await msg.safeEdit(await home(updated))
                    await i.guild.updateData()
                } else if (i.customId === "cc:set:res") {
                    // set response type

                    const resTypeRow = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId("cc:withEmbed")
                                .setLabel("^{command.custom_commands.buttons.with_embed}")
                                .setStyle(2),
                            new ButtonBuilder()
                                .setCustomId("cc:withOutEmbed")
                                .setLabel("^{command.custom_commands.buttons.without_embed}")
                                .setStyle(2),
                        )

                    const varRow = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId("cc:variables")
                                .setLabel(`^{command.custom_commands.buttons.variables}`)
                                .setStyle(1)
                        )

                    await i.safeUpdate({
                        embeds: [
                            new EmbedBuilder().setTheme(data?.Theme)
                                .setDescription("^{command.custom_commands.select_res_type}")
                        ],
                        components: [resTypeRow, varRow].map(row=>row.toJSON())
                    })

                } else if (i.customId === "cc:withOutEmbed" || i.customId === "cc:set:triger") {
                    const type = i.customId === "cc:set:triger" ? true : false

                    const input_1 = new TextInputBuilder()
                        .setCustomId('content')
                        .setLabel(type ? '^{command.custom_commands.modal.trigger}' : '^{command.custom_commands.modal.response}')
                        .setRequired(true)
                        .setPlaceholder(type ? "^{command.custom_commands.modal.trigger_ph}" : "^{command.custom_commands.modal.response_ph}")
                        .setStyle(!type ? 2 : 1).setMaxLength(!type ? 400 : 20);

                    const modal = new ModalBuilder().setCustomId('cc:withOutEmbedOrTrigger')
                        .setTitle('^{command.custom_commands.title}')
                        .addComponents(new ActionRowBuilder().addComponents(input_1));

                    await i?.safeShowModal(modal.toJSON());

                    const response = await i.awaitModalSubmit({
                        filter: i => i.customId === "cc:withOutEmbedOrTrigger" && i.user.id === user.id,
                        time: 240 * 1000
                    });

                    /// on modal submit
                    if (response.isModalSubmit()) {
                        let value = response.fields.fields.get("content").value;

                        const cacheData = cache.get(cacheKey)

                        if (type) {
                            const check = data2?.CustomCommands?.List.find(y => y.Triger === value.toLowerCase().trim().replace(" ", ""))
                            if (check) return response.safeReply({
                                content: "^{command.custom_commands.already_exists}",
                                ephemeral: true
                            })
                            cache.set(cacheKey, {
                                ...cacheData,
                                triger: value.toLowerCase().trim().replace(" ", "")
                            });
                        } else cache.set(cacheKey, {
                            ...cacheData,
                            response: value
                        })

                        await response.safeUpdate(await updateAdd())
                    }

                } else if (i.customId === "cc:withEmbed") {
                    const input_1 = new TextInputBuilder()
                        .setCustomId('title')
                        .setLabel("^{command.custom_commands.modal.embed_title}")
                        .setRequired(true)
                        .setPlaceholder('^{command.custom_commands.modal.embed_title_ph}')
                        .setStyle(1)
                        .setMaxLength(60)
                    const input_2 = new TextInputBuilder()
                        .setCustomId('ds')
                        .setLabel("^{command.custom_commands.modal.embed_des}")
                        .setRequired(true)
                        .setPlaceholder('^{command.custom_commands.modal.embed_des_ph}')
                        .setStyle(2)
                        .setMaxLength(200)
                    const input_3 = new TextInputBuilder()
                        .setCustomId('color')
                        .setLabel("^{command.custom_commands.modal.embed_c}")
                        .setRequired(false)
                        .setPlaceholder('^{command.custom_commands.modal.embed_c_ph}')
                        .setStyle(1)
                        .setMaxLength(6).setMinLength(6)
                    const input_4 = new TextInputBuilder()
                        .setCustomId('image')
                        .setLabel("^{command.custom_commands.modal.embed_image}")
                        .setRequired(false)
                        .setPlaceholder('^{command.custom_commands.modal.embed_image_ph}')
                        .setStyle(1)
                        .setMaxLength(300)
                    const input_5 = new TextInputBuilder()
                        .setCustomId('thumbnail')
                        .setLabel("^{command.custom_commands.modal.embed_thumb}")
                        .setRequired(false)
                        .setPlaceholder('^{command.custom_commands.modal.embed_thumb_ph}')
                        .setStyle(1)
                        .setMaxLength(300)

                    const modal = new ModalBuilder()
                        .setCustomId('cc:withEmbed')
                        .setTitle('^{command.custom_commands.title}')
                        .addComponents(new ActionRowBuilder().addComponents(input_1))
                        .addComponents(new ActionRowBuilder().addComponents(input_3))
                        .addComponents(new ActionRowBuilder().addComponents(input_4))
                        .addComponents(new ActionRowBuilder().addComponents(input_5))
                        .addComponents(new ActionRowBuilder().addComponents(input_2))

                    await i?.safeShowModal(modal.toJSON());

                    const response = await i.awaitModalSubmit({
                        filter: i => i.customId === "cc:withEmbed" && i.user.id === user.id,
                        time: 240 * 1000
                    });

                    /// on modal submit
                    if (response.isModalSubmit()) {
                        let title = response.fields.fields.get("title").value
                        let description = response.fields.fields.get("ds").value
                        let color = response.fields.fields.get("color").value || "060606"
                        let image = response.fields.fields.get("image").value || null
                        let thumbnail = response.fields.fields.get("thumbnail").value || null

                        const Embed = new EmbedBuilder().setTheme(data.Theme)

                        if (color && !/^[A-Fa-f0-9]{6}$/.test(color)) return await response.safeReply({
                            embeds: [Embed.setDescription("^{common.invalid_hex}")],
                            ephemeral: true
                        });

                        if (image) {
                            if (!await isImageURLValid(variables.Replace(image, i.member))) return await response.safeReply({
                                embeds: [Embed.setDescription("^{common.invalid_image_url}, Image")],
                                ephemeral: true
                            });
                        }

                        if (thumbnail) {
                            if (!await isImageURLValid(variables.Replace(thumbnail, i.member))) return await response.safeReply({
                                embeds: [Embed.setDescription("^{common.invalid_image_url}, Thumbnail")],
                                ephemeral: true
                            });
                        }


                        const d = cache.get(cacheKey) || {}
                        const ccOptions = {
                            ...d,
                            response: "<Embed>",
                            Embed: {
                                description,
                                title,
                                thumbnail,
                                image,
                                color,
                            }
                        }

                        cache.set(cacheKey, ccOptions)

                        await response.safeUpdate(await updateAdd())
                    }
                } else if (i.customId === "cc:set:roles:btn") {
                    const roleSelect = new RoleSelectMenuBuilder()
                        .setCustomId(`cc:set:roles:menu`)
                        .setPlaceholder('^{common.click_here}')
                        .setMaxValues(6);

                    const Embed = new EmbedBuilder().setTheme(data?.Theme)
                        .setTitle("^{command.custom_commands.title}")
                        .setDefaultFooter()
                        .setDescription(`^{command.custom_commands.select_roles}`)

                    const roleRow = new ActionRowBuilder()
                        .addComponents(roleSelect)

                    await i.safeUpdate({
                        embeds: [Embed],
                        components: [roleRow.toJSON()]
                    })
                } else if (i.customId === "cc:set:roles:menu") {
                    let selectedRoles = i.values;
                    const d = cache.get(cacheKey) || {};

                    const ccoptions = {
                        ...d,
                        roles: selectedRoles,
                    };
                    cache.set(cacheKey, ccoptions)
                    await i.safeUpdate(await updateAdd())

                } else if (i.customId === "cc:set:save") {
                    await wait();
                    const data = cache.get(cacheKey);
                    let Response = {};

                    if (data.response === "<Embed>") {
                        let embed = new EmbedBuilder()
                            .setColor(`#${data.Embed.color}`)
                            .setDescription(data.Embed.description)
                            .setTitle(data.Embed.title);
                        if (data.image) embed.setImage(data.Embed.image)
                        if (data.thumbnail) embed.setThumbnail(data.Embed.thumbnail)
                        Response.embeds = [embed.toJSON()]
                    } else Response.content = data.response

                    data2.CustomCommands.List.push({
                        Triger: data.triger,
                        Response,
                        Roles: data.roles
                    })

                    const updated = await client.db.UpdateOne('GuildConfig', {
                        Guild: i.guild.id
                    }, {
                        $set: {
                            ['CustomCommands.List']: data2.CustomCommands.List
                        }
                    }, { upsert: true, new: true })

                    msg.safeEdit({
                        embeds: [
                            new EmbedBuilder().setTheme(updated.Theme).setDescription(`^{command.custom_commands.added} -> \`${updated.CustomCommands.Prefix}${data.triger}\` to test.`)
                        ]
                    })

                    await i.guild.updateData()

                    cache.delete(cacheKey)
                } else if (i.customId === "cc:variables") await i.safeReply({
                    content: variables.description,
                    ephemeral: true
                })
                else if (i.customId === "cc:home-btn") await i.safeUpdate(await home())


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

                async function updateAdd(/*data*/) {
                    // if (!data) data = await i.guild.fetchData()

                    const cacheData = cache.get(cacheKey) || {}

                    const ccOptions = {
                        triger: "Not Set",
                        response: "Not Set",
                        ...cacheData
                    }

                    let ccTriger = new ButtonBuilder()
                        .setCustomId("cc:set:triger")
                        .setStyle(2).setLabel("^{command.custom_commands.buttons.set_trigger}")

                    let ccResType = new ButtonBuilder()
                        .setCustomId("cc:set:res")
                        .setStyle(2).setLabel("^{command.custom_commands.buttons.set_response}")


                    let ccSetRole = new ButtonBuilder()
                        .setCustomId("cc:set:roles:btn")
                        .setStyle(2).setLabel("^{command.custom_commands.buttons.set_roles}")

                    let ccSave = new ButtonBuilder()
                        .setCustomId("cc:set:save")
                        .setStyle(3).setLabel("^{command.custom_commands.buttons.save}")
                        .setDisabled(ccOptions.triger === "Not Set" || ccOptions.response === "Not Set" ? true : false)

                    const ccRow = new ActionRowBuilder()
                        .addComponents(ccTriger, ccResType, ccSetRole)
                    const ccRow2 = new ActionRowBuilder()
                        .addComponents(homeBtn, ccSave)


                    const Embed = new EmbedBuilder().setTheme(data?.Theme)
                        .setTitle("^{command.custom_commands.title}")
                        .setDescription(`!{dot} Trigger: ${ccOptions.triger}\n!{dot} Response: ${ccOptions.response}\n${ccOptions?.roles ? `!{dot} Roles: ${ccOptions.roles.map(r => `<@&${r}>`).join(", ")}` : ""}`)
                        .setDefaultFooter()

                    return {
                        files: [],
                        content: "",
                        embeds: [Embed],
                        components: [ccRow, ccRow2].map(r => r.toJSON())
                    }

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
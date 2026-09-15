import { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, StringSelectMenuOptionBuilder, ModalBuilder, TextInputBuilder, ChannelSelectMenuBuilder, AttachmentBuilder, Message, Collector, ChannelType, Webhook, ButtonStyle, MentionableSelectMenuBuilder, RoleSelectMenuBuilder, UserSelectMenuBuilder } from "discord.js";
import { isImageURLValid, EmbedBuilder, welcome, cache, number } from "../../../src/utils/index.mjs";
import modlog from "./modLog.mjs"
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

        const { guild } = message;
        const user = message.author || message.user


        /** @type {import("../../../Database/-Models/GuildConfig.json")} data*/
        const data = guildData;
        const { Theme } = data;

        const Anti = {
            Invite: "Anti Invite",
            Links: "Anit Link",
            Spam: "Anti Spam",
            Ghostping: "Anti Ghostping",
            MassMention: "Mass Mention",
        }

        const firstRow = (da = guildData) => {
            const row = new ActionRowBuilder()
            Object.keys(Anti).slice(0, 5).forEach((anti) => {
                const btn = new ButtonBuilder()
                    .setCustomId(`setup:automod:anti:${anti}`)
                    .setLabel(Anti[anti])
                    .setDisabled(!da.AutoMod.Enable)
                    .setStyle(da?.AutoMod?.Anti?.[anti] ? 2 : 3)
                row.addComponents(btn)
            })
            return row
        }


        const Embed = new EmbedBuilder().setTheme(Theme)

        let homeBtn = new ButtonBuilder().setCustomId("home-btn").setStyle(2).setLabel("^{common.home_page}");
        let resetBtn = (da) => new ButtonBuilder().setCustomId("setup:automod:reset").setEmoji("979818265582899240")
            .setDisabled(da && da?.AutoMod?.Enable ? false : true).setStyle(2).setLabel("^{common.reset}");
        let enableBtn = (da) => new ButtonBuilder().setCustomId("setup:automod:enable")
            .setStyle(da && da?.AutoMod?.Enable ? 2 : 3).setLabel(da && da?.AutoMod?.Enable ? "^{common.disable}" : "^{common.enable}");

        const select = () => {
            const menu = new StringSelectMenuBuilder()
                .setCustomId('setup:automod:panel')
                .setPlaceholder('^{common.click_here}')
                .setDisabled(false).setMaxValues(1)
                .addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel("^{command.automod.menu.strikes.label}")
                        .setValue("strikes")
                        .setDescription("^{command.automod.menu.strikes.description}"),
                    new StringSelectMenuOptionBuilder()
                        .setLabel("^{command.automod.menu.action.label}")
                        .setValue("action")
                        .setDescription("^{command.automod.menu.action.description}"),
                    new StringSelectMenuOptionBuilder()
                        .setLabel("^{command.automod.menu.debug.label}")
                        .setValue("debug")
                        .setDescription("^{command.automod.menu.debug.description}"),
                    new StringSelectMenuOptionBuilder()
                        .setLabel("^{command.automod.menu.whitelist.label}")
                        .setValue("wl")
                        .setDescription("^{command.automod.menu.whitelist.description}"),
                    new StringSelectMenuOptionBuilder()
                        .setLabel("^{command.automod.menu.logs.label}")
                        .setValue("logs")
                        .setDescription("^{command.automod.menu.logs.description}"),
                )

            return menu;
        }

        const embed = (d) => {
            let des = "^{command.automod.description}\n"

            Object.keys(Anti).forEach(anti => {
                des += `- ${Anti[anti]}: ${d?.AutoMod?.Anti?.[anti] ? `\`^{common.enabled}\`` : "\`^{common.disabled}\`"}\n`
            })
            des += `\n!{star} __**Debug Mode**__: ${d.AutoMod?.Debug ? "`^{common.enabled}`" : "`^{common.disabled}`"}`
            des += `\n!{star} __**Strikes**__: ${d.AutoMod?.Strikes || "N/A"}`
            des += `\n!{star} __**Action**__: ${d.AutoMod?.Action || "N/A"}`
            des += `\n\n> ${(client.getPromotion())?.Message}`

            return new EmbedBuilder().setTheme(d.Theme)
                .setDefaultFooter()
                .setDescription(des)
                .setThumbnail("https://cdn.discordapp.com/emojis/1068024801186295808.gif")
                .setAuthor({
                    name: "^{command.automod.title}",
                })

        }

        const home = async (d) => {
            if (!d) d = await message.guild.fetchData()
            const row = new ActionRowBuilder().addComponents(select(d))
            const row2 = new ActionRowBuilder().addComponents(enableBtn(d), resetBtn(d))

            return {
                files: [],
                embeds: [embed(d)],
                components: [row, firstRow(d), row2].map(x => x.toJSON()),
                content: ""
            }
        }

        let msg = await message.safeReply(await home(data));

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
                if (i.customId === "setup:automod:panel") {
                    const value = i.values[0]
                    if (value === "logs") {
                        // await i.deferUpdate();
                        await modlog.run({
                            User: user,
                            message: i,
                            client,
                            err,
                            guildData,
                            Slash: { is: true }
                        });
                        // collector.stop();
                    } else if (value === "debug") {
                        await i.safeUpdate(load);

                        const data4 = await client.db.UpdateOne('GuildConfig', { Guild: i.guild.id }, {
                            $set: {
                                ["AutoMod.Debug"]: data2.AutoMod?.Debug ? false : true
                            },
                        }, { upsert: true, new: true })

                        await msg.safeEdit(await home(data4))

                        await i.guild.updateData()
                    } else if (value === "strikes") {
                        const input_1 = new TextInputBuilder()
                            .setStyle(1)
                            .setRequired(true)
                            .setCustomId('strikes')
                            .setLabel("^{command.automod.modal.strikes.label}")
                            .setPlaceholder('^{command.automod.modal.strikes.ph}')
                            .setMaxLength(2);

                        const modal = new ModalBuilder()
                            .setCustomId('setup:automod:strikes:modal')
                            .setTitle('^{command.automod.title}')
                            .addComponents(new ActionRowBuilder().addComponents(input_1));

                        await i.safeShowModal(modal.toJSON());

                        const response = await i.awaitModalSubmit({
                            filter: i => i.customId === "setup:automod:strikes:modal" && i.user.id === user.id,
                            time: 240 * 1000
                        });

                        if (!response) return;

                        /// on modal submit
                        if (response.isModalSubmit()) {
                            const value = response.fields.fields.get("strikes").value;

                            const num = parseInt(value);
                            if (isNaN(num)) return await response.safeReply({
                                content: "^{common.invalid_number}",
                                ephemeral: true
                            })
                            await response.deferUpdate();

                            const UpdatedData = await client.db.UpdateOne('GuildConfig',
                                { Guild: i.guild.id },
                                { $set: { ['AutoMod.Strikes']: number.clamp(num, 5, 20) } },
                                { upsert: true, new: true })

                            await msg.safeEdit(await home(UpdatedData));
                            await message.guild.updateData()
                        }
                    } else if (value === "action") {
                        const actions = ["Timeout", "Kick", "Ban"]
                        const row = new ActionRowBuilder();
                        actions.forEach(action => {
                            row.addComponents(
                                new ButtonBuilder()
                                    .setCustomId("automod:action:" + action)
                                    .setLabel(action)
                                    .setDisabled(data2.AutoMod?.Action === action)
                                    .setStyle(data2.AutoMod?.Action === action ? 1 : 2)
                            )
                        })

                        await i.safeUpdate({
                            embeds: [new EmbedBuilder().setTheme(data2.Theme).setDescription(`^{command.automod.select_action}`)]
                            , components: [row, new ActionRowBuilder().setComponents(homeBtn)].map(x => x.toJSON())
                        })
                    } else if (value === "wl") {
                        const wl = ["Users", "Roles", "Channels"]
                        const wlRow = new ActionRowBuilder();
                        wl.forEach(WL => {
                            wlRow.addComponents(
                                new ButtonBuilder()
                                    .setCustomId("automod:wl:btn" + WL)
                                    .setLabel(WL)
                                    .setStyle(1)
                            )
                        })

                        await i.safeUpdate({
                            embeds: [new EmbedBuilder().setTheme(data2.Theme)
                                .setDefaultFooter()
                                .setTimestamp()
                                .setTitle("White List")
                                .setDescription(`!{star} __**Whitelist Stats**__\n- Users: ${data2.AutoMod.Whitelist?.Users?.length}/24\n- Roles: ${data2.AutoMod.Whitelist?.Roles.length}/24\n- Channels: ${data2.AutoMod.Whitelist?.Channels.length}/24`)]
                            , components: [wlRow, new ActionRowBuilder().setComponents(homeBtn)]
                        })
                    }
                } else if (i.customId.includes("automod:wl:menu:")) {
                    const type = i.customId.replace("automod:wl:menu:", "");
                    const wl = data2.AutoMod.Whitelist[type];

                    const exits = wl.filter(y => i.values.includes(y))
                    if (exits.length > 0) {
                        const toUpdate = wl.filter(y => !i.values.includes(y))
                        await i.safeUpdate(load);

                        const data4 = await client.db.UpdateOne('GuildConfig', { Guild: i.guild.id }, {
                            $set: {
                                [`AutoMod.Whitelist.${type}`]: toUpdate
                            }

                        }, { upsert: true, new: true })

                        await msg.safeEdit(await home(data4))

                        await i.guild.updateData()
                    } else {
                        let Wl = [...wl, ...i.values]
                        await i.safeUpdate(load);

                        const data4 = await client.db.UpdateOne('GuildConfig', { Guild: i.guild.id }, {
                            $set: {
                                [`AutoMod.Whitelist.${type}`]: Wl.slice(0, 24)
                            }

                        }, { upsert: true, new: true })

                        await msg.safeEdit(await home(data4))

                        await i.guild.updateData()
                    }
                }
            } else if (i.customId === "setup:automod:reset") {

                await i.safeUpdate(load);
                const op = {}

                Object.keys(Anti).forEach(key => { op[key] = false })

                const data4 = await client.db.UpdateOne('GuildConfig', { Guild: i.guild.id }, {
                    $set: {
                        ["AutoMod"]: {
                            Enable: false,
                            Anti: op,
                            Strikes: 5,
                            Action: "Kick",
                            Debug: false,
                            Whitelist: {
                                Channels: [],
                                Roles: [],
                                Users: []
                            },
                        },
                    }

                }, { upsert: true, new: true })

                await msg.safeEdit(await home(data4))

                await i.guild.updateData()
            } else if (i.customId === "setup:automod:enable") {

                await i.safeUpdate(load);

                const data4 = await client.db.UpdateOne('GuildConfig', { Guild: i.guild.id }, {
                    $set: {
                        ["AutoMod.Enable"]: data2.AutoMod?.Enable ? false : true
                    },
                }, { upsert: true, new: true })

                await msg.safeEdit(await home(data4))

                await i.guild.updateData()
            } else if (i.customId.includes("setup:automod:anti:")) {
                const anti = i.customId.replace("setup:automod:anti:", "")
                if (anti.includes("MassMention")) {

                    const input_1 = new TextInputBuilder()
                        .setStyle(1)
                        .setRequired(true)
                        .setCustomId('mm')
                        .setLabel("^{command.automod.modal.mass_mention.label}")
                        .setPlaceholder('^{command.automod.modal.mass_mention.ph}')
                        .setMaxLength(2);

                    const modal = new ModalBuilder()
                        .setCustomId('setup:automod:mm:modal')
                        .setTitle('^{command.automod.title}')
                        .addComponents(new ActionRowBuilder().addComponents(input_1));

                    await i.safeShowModal(modal.toJSON());

                    const response = await i.awaitModalSubmit({
                        filter: i => i.customId === "setup:automod:mm:modal" && i.user.id === user.id,
                        time: 240 * 1000
                    });

                    if (!response) return;

                    /// on modal submit
                    if (response.isModalSubmit()) {
                        const value = response.fields.fields.get("mm").value;

                        const num = parseInt(value);
                        if (isNaN(num)) return await response.safeReply({
                            content: "^{common.invalid_number}",
                            ephemeral: true
                        })
                        await response.deferUpdate();

                        const UpdatedData = await client.db.UpdateOne('GuildConfig',
                            { Guild: i.guild.id },
                            { $set: { ['AutoMod.Anti.MassMention']: number.clamp(num, 0, 20) } },
                            { upsert: true, new: true })

                        await msg.safeEdit(await home(UpdatedData));
                        await message.guild.updateData()
                    }
                } else {
                    await i.safeUpdate(load)

                    if (data2.AutoMod?.Anti?.[anti]) data2.AutoMod.Anti[anti] = false;
                    else data2.AutoMod.Anti[anti] = true

                    const data4 = await client.db.UpdateOne('GuildConfig', { Guild: i.guild.id }, {
                        $set: {
                            ["AutoMod"]: data2.AutoMod
                        }

                    }, { upsert: true, new: true });


                    await msg.safeEdit(await home(data4))

                    await i.guild.updateData()
                }
            } else if (i.customId.includes("automod:action:")) {
                const action = i.customId.replace("automod:action:", "");
                await i.safeUpdate(load);

                const data4 = await client.db.UpdateOne('GuildConfig', { Guild: i.guild.id }, {
                    $set: {
                        ["AutoMod.Action"]: action
                    },
                }, { upsert: true, new: true })

                await msg.safeEdit(await home(data4))

                await i.guild.updateData()
            } else if (i.customId.includes("automod:wl:btn")) {
                const type = i.customId.replace("automod:wl:btn", "")

                const rows = {
                    Users: new ActionRowBuilder()
                        .setComponents(new UserSelectMenuBuilder()
                            .setMaxValues(24)
                            .setMinValues(1)
                            .setPlaceholder("^{common.click_here}")
                            .setCustomId("automod:wl:menu:Users")),
                    Roles: new ActionRowBuilder()
                        .setComponents(new RoleSelectMenuBuilder()
                            .setMaxValues(24)
                            .setMinValues(1)
                            .setPlaceholder("^{common.click_here}")
                            .setCustomId("automod:wl:menu:Roles")),
                    Channels: new ActionRowBuilder()
                        .setComponents(new ChannelSelectMenuBuilder()
                            .setChannelTypes(ChannelType.GuildText)
                            .setMaxValues(24)
                            .setMinValues(1)
                            .setPlaceholder("^{common.click_here}")
                            .setCustomId("automod:wl:menu:Channels")),
                }

                const embed = new EmbedBuilder().setTheme(Theme)
                    .setFooter({ text: `Use Select Menu To add or remove whitlist. (Note: You can add only 24 ${type}` })
                    .setTitle(`Whitelisted ${type}`)

                if (data2.AutoMod.Whitelist[type].length) embed.setDescription(`!{star} **__Status__**\n ${data2.AutoMod.Whitelist[type].map(y => { return type === "Channels" ? `<#${y}>` : type === "Roles" ? `<@&${y}>` : `<@${y}>` }).join(", ")}`)

                await i.safeUpdate({
                    embeds: [embed],
                    components: [rows[type], new ActionRowBuilder().setComponents(homeBtn)].map(x => x.toJSON())
                })
            } else if (i.customId === "home-btn") await i.safeUpdate(await home(data2))
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

/** @type {import("../../../src/utils/Command.mjs").prefix} */
export default {
    name: "setup-automod",
    cooldown: 15,
    description: "Setup basic automod for this server",
    category: "Setup",
    aliases: ["automod", "setautomod", "set-automod", "setupam", "automod-set", "automod-setup"],
    permissions: {
        user: ["Administrator"],
        bot: ["Administrator"]
    },
    run: cmd.run
};
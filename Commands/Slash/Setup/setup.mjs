import { SlashCommandBuilder, PermissionFlagsBits, RoleSelectMenuBuilder, ActionRowBuilder } from 'discord.js';
import GlobalConfig from '../../../Assets/Global/config.mjs';
import reactionRole from '../../Prefix/Setup/reactionRoles.mjs';
import rank from '../../Prefix/Setup/rank.mjs';
import EmbedBuilder from '../../../src/utils/classes/EmbedBuilder.mjs';
import auditlog from '../../Prefix/Setup/auditlog.mjs';
import automod from '../../Prefix/Setup/automod.mjs';
import autoReddit from '../../Prefix/Setup/autoReddit.mjs';
import autorole from '../../Prefix/Setup/autorole.mjs';
import customCommand from '../../Prefix/Setup/customCommand.mjs';
import farewell from '../../Prefix/Setup/farewell.mjs';
import modLog from '../../Prefix/Setup/modLog.mjs';
import welcome from '../../Prefix/Setup/welcome.mjs';
import birthday from '../../Prefix/Setup/birthday.mjs';
import autoFeed from '../../Prefix/Setup/autoFeed.mjs';
import messageModes from '../../Prefix/Setup/messageModes.mjs';
import ticket from '../../Prefix/Setup/ticket.mjs';
import autoAnnounce from '../../Prefix/Setup/autoAnnounce.mjs';

let panels = [];
for (let i = 1; i <= 25; i++) panels.push({ name: i.toString(), value: i.toString() })

/**@type {import('../../../src/utils/Command.mjs').interaction} */

export default {
    category: "Setup",
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Setup command!')
        .setNameLocalization("de", "setup")
        .setDescriptionLocalization("de", "Setup command!")

        .addSubcommand(sub => sub
            .setName("language")
            .setDescription("Setup language for this server")
            .addStringOption(op => op
                .setName("language")
                .setDescription("language to set")
                .setRequired(true)
                .setChoices(...GlobalConfig.Languages.map(lang => ({ name: lang, value: lang })))
            ))

        .addSubcommand(sub => sub
            .setName("level")
            .setDescription("setup leveling system for this server!"))

        .addSubcommand(sub => sub
            .setName("audit-log")
            .setDescription("setup audit log for this server!"))

        .addSubcommand(sub => sub
            .setName("automod")
            .setDescription("setup auto moderation for this server!"))

        .addSubcommand(sub => sub
            .setName("auto-reddit-feed")
            .setDescription("setup auto reddit feed!"))

        .addSubcommand(sub => sub
            .setName("autorole")
            .setDescription("setup auto roles!"))

        .addSubcommand(sub => sub
            .setName("custom-commands")
            .setDescription("setup custom commands for this server"))

        // .addSubcommand(sub => sub
        //     .setName("farewell")
        //     .setDescription("setup goodbye message for this server"))


        .addSubcommand(sub => sub
            .setName("modlog")
            .setDescription("setup modlog for this server"))
        .addSubcommandGroup(sub => sub
            .setName("role-commands")
            .setDescription("setup role commands for this server")
            .addSubcommand(sub => sub
                .setName("add")
                .setDescription("add role commands")
                .addStringOption(op => op
                    .setName("trigger")
                    .setDescription("trigger to run role command")
                    .setRequired(true)))
            .addSubcommand(sub => sub
                .setName("remove")
                .setDescription("remove role commands")
                .addStringOption((op) => op
                    .setName("trigger")
                    .setDescription("trigger to remove role command")
                    .setRequired(true)))
            .addSubcommand(sub => sub
                .setName("list")
                .setDescription("list role commands"))
            .addSubcommand(sub => sub
                .setName("find")
                .setDescription("find role command")
                .addStringOption(op => op
                    .setName("trigger")
                    .setDescription("trigger to find role command")
                    .setRequired(true)))
            .addSubcommand(sub => sub
                .setName("set-prefix")
                .setDescription("set prefix for role commands")
                .addStringOption(op => op
                    .setName("prefix")
                    .setDescription("prefix to set")
                    .setMaxLength(2)
                    .setMinLength(1)
                    .setRequired(true)))

            .addSubcommand(sub => sub
                .setName("reset")
                .setDescription("reset all roles commands"))
        )
        // .addSubcommand(sub => sub
        //     .setName("welcome")
        //     .setDescription("setup welcome for this server"))
        .addSubcommand(sub => sub
            .setName("birthday")
            .setDescription("Setup birthday system for this server"))
        .addSubcommand(sub => sub
            .setName("message-modes")
            .setDescription("set message modes for spcified channels"))
        // .addSubcommand(sub => sub
        //     .setName("daily-announce")
        //     .setDescription("setup auto announcements"))
        .addSubcommand(sub => sub
            .setName("ticket")
            .setDescription("setup ticket system"))
        .addSubcommand(sub => sub
            .setName("auto-feed")
            .setDescription("setup soical media auto feeds"))
        .addSubcommand(sub => sub
            .setName("reaction-role")
            .setDescription("setup reaction roles in this server!")
            .addStringOption(op => op
                .setName("panel")
                .setDescription("Select a panale number")
                .setRequired(true)
                .addChoices(...panels)))
        .setDMPermission(false)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    cooldown: 5,
    run: async ({ interaction, client, err, guildData }) => {
        try {
            const { options } = interaction;
            const sub = options.getSubcommand();
            const group = options.getSubcommandGroup();


            if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.Administrator)) return await interaction.safeReply({
                embeds: [new EmbedBuilder().setTheme(guildData.Theme).setColor("DarkAqua").setDescription("^{common.need_admin_perm}").setColor(client.embed.wrongcolor)],
                ephemeral: true
            });

            if (group === "role-commands") {
                await interaction.deferReply();
                if (sub === "add") {
                    let trigger = options.getString("trigger");

                    const isCmd = guildData.RolesCommands?.List?.find(cmd => cmd.Triger === trigger);

                    if (isCmd) return await interaction.safeEdit({
                        embeds: [new EmbedBuilder().setTheme(guildData.Theme).setDescription(`^{command.role_command.already}`)]
                    });

                    // // valdiation of mod role. not bot role and editable
                    // if (
                    //     modRole.id === interaction.guildId ||
                    //     interaction.guild.roles.cache.get(modRole.id)?.tags?.botId
                    // ) return await interaction.safeEdit({
                    //     embeds: [new EmbedBuilder().setTheme(guildData.Theme).setDescription(`^{command.role_command.bot_role}`)],
                    //     ephemeral: true
                    // });

                    trigger = trigger.toLowerCase().trim();

                    const firstMessage = () => {
                        const roleMenu = new RoleSelectMenuBuilder()
                            .setCustomId(`setup:RoleCommands:roles:${trigger}`) // roles to add/remove
                            .setPlaceholder(`Roles`)
                            .setMaxValues(24)
                            .setMinValues(1)

                        const row = new ActionRowBuilder().addComponents(roleMenu)
                        const embed = new EmbedBuilder()
                            .setTheme(guildData.Theme)
                            .setTitle(`^{command.role_command.title}`)
                            .setDefaultFooter()
                            .setDescription(`^{command.role_command.roles_panel_des}`)

                        return {
                            embeds: [embed],
                            components: [row]
                        }
                    }

                    /**
                     * 
                     * @param {import('discord.js').Interaction} i 
                     */
                    const secondMessage = (i) => {
                        const [, , , trigger] = i.customId.split(":")

                        const modRoleMenu = new RoleSelectMenuBuilder()
                            .setCustomId(`setup:RoleCommands:modRoles:${trigger}:${i.values.join(":")}`)
                            .setPlaceholder(`Roles`)
                            .setMaxValues(24)
                            .setMinValues(1)
                        const row = new ActionRowBuilder().addComponents(modRoleMenu)
                        const embed = new EmbedBuilder()
                            .setTheme(guildData.Theme)
                            .setTitle(`^{command.role_command.title}`)
                            .setDefaultFooter()
                            .setDescription(`^{command.role_command.mod_roles_panel_des}`)

                        return {
                            embeds: [embed],
                            components: [row]
                        }
                    }

                    const message = await interaction.safeEdit(firstMessage());

                    const collector = message.createMessageComponentCollector({
                        componentType: 0,
                        time: 240 * 1000

                    });

                    collector.on('collect',
                        /**
                         * @param {import('discord.js').Interaction} i
                         */
                        async (i) => {
                            if (i.user.id !== interaction.user.id) return i.safeReply({
                                embeds: [new EmbedBuilder().setTheme(guildData.Theme).setDescription(`^{common.no_auth_components}`)],
                                ephemeral: true
                            })


                            if (i.customId.startsWith("setup:RoleCommands:roles")) {
                                const roles = i.values

                                const roleValidation = roles.map(r => interaction.guild.roles.cache.get(r));
                                if (!roleValidation.every(r => r.editable)) {
                                    return await i.safeReply({
                                        embeds: [new EmbedBuilder().setTheme(guildData.Theme).setDescription(`^{command.role_command.high_roles}\n\n> ${roleValidation.filter(r => !r.editable).map(r => `\`${r.name}\``).join(", ")}`)],
                                        ephemeral: true
                                    });
                                }


                                if (roleValidation.some(r => r.tags?.botId)) {
                                    const botRoles = roleValidation.filter(r => r.tags?.botId);
                                    return await i.safeReply({
                                        embeds: [new EmbedBuilder().setTheme(guildData.Theme).setDescription(`^{command.role_command.bot_roles}\n\n> ${botRoles.map(r => `\`${r.name}\``).join(", ")}`)],
                                        ephemeral: true
                                    });
                                }

                                await i.safeUpdate(secondMessage(i));
                            }
                            else if (i.customId.startsWith("setup:RoleCommands:modRoles")) {
                                const modroles = i.values;
                                const [, , , trigger, ...roles] = i.customId.split(":");


                                const roleValidation = roles.map(r => interaction.guild.roles.cache.get(r));
                                if (!roleValidation.every(r => r.editable)) {
                                    return await i.safeReply({
                                        embeds: [new EmbedBuilder().setTheme(guildData.Theme).setDescription(`^{command.role_command.high_roles}\n\n> ${roleValidation.filter(r => !r.editable).map(r => `\`${r.name}\``).join(", ")}`)],
                                        ephemeral: true
                                    });
                                }


                                if (roleValidation.some(r => r.tags?.botId)) {
                                    const botRoles = roleValidation.filter(r => r.tags?.botId);
                                    return await i.safeReply({
                                        embeds: [new EmbedBuilder().setTheme(guildData.Theme).setDescription(`^{command.role_command.bot_roles}\n\n> ${botRoles.map(r => `\`${r.name}\``).join(", ")}`)],
                                        ephemeral: true
                                    });
                                }

                                await i.deferUpdate();
                                await client.db.UpdateOne('GuildConfig', {
                                    Guild: interaction.guildId
                                }, {
                                    $push: {
                                        "RolesCommands.List": {
                                            Triger: trigger,
                                            Roles: roles,
                                            ModRoles: modroles
                                        }
                                    }
                                }, { upsert: true, new: true });
                                await interaction.guild.updateData();

                                await i.safeEdit({
                                    components: [],
                                    embeds: [new EmbedBuilder().setTheme(guildData.Theme).setDescription(`^{command.role_command.added} -> \`${guildData.RolesCommands.Prefix}${trigger}\``)]
                                })

                            }


                        })


                }


                else if (sub === "remove") { //* role command remove

                    const trigger = options.getString("trigger");
                    const cmd = guildData.RolesCommands.List.find(x => x.Triger === trigger);

                    if (!cmd) return await interaction.safeEdit({
                        embeds: [new EmbedBuilder().setTheme(guildData.Theme).setDescription(`^{command.role_command.not_found}`)]
                    })

                    await client.db.UpdateOne('GuildConfig', {
                        Guild: interaction.guildId
                    }, {
                        $set: {
                            "RolesCommands.List": guildData.RolesCommands.List.filter(x => x.Trigger !== trigger)
                        }
                    })

                    await interaction.guild.updateData();
                    await interaction.safeEdit({
                        embeds: [
                            new EmbedBuilder().setTheme(guildData.Theme).setDescription(`^{command.role_command.removed}`)
                        ]
                    })
                }

                else if (sub === "list") {
                    if (!guildData.RolesCommands?.List?.length) return await interaction.safeEdit({
                        embeds: [
                            new EmbedBuilder().setTheme(guildData.Theme).setDescription(`^{command.role_command.not_found}`)
                        ]
                    });

                    const list = guildData.RolesCommands.List.map((x, index) => `${index + 1}. **${x.Triger}**: ${x.Roles.map(y => `<@&${y}>`).join(", ")}`)

                    await interaction.safeEdit({
                        content: list.join("\n")
                    })
                }

                else if (sub === "find") { // * find role-command
                    const trigger = options.getString("trigger")
                    const cmd = guildData.RolesCommands?.List.find(x => x.Triger === trigger);

                    if (!cmd) return await interaction.safeEdit({
                        embeds: [new EmbedBuilder().setTheme(guildData.Theme).setDescription(`^{command.role_command.not_found}`)]
                    })

                    await interaction.safeEdit({
                        embeds: [
                            new EmbedBuilder().setTheme(guildData.Theme).setTitle("^{command.role_command.title}")
                                .setDescription(`!{star} Trigger: \`${guildData.RolesCommands.Prefix}${cmd.Triger}\`\n !{star} Mod Roles: ${cmd.ModRoles.map(x => `<@&${x}>`).join(", ")}\n !{star} Roles to add/remove: ${cmd.Roles.map(x => `<@&${x}>`).join(", ")}`)
                        ]
                    })
                }


                else if (sub === "set-prefix") {
                    const prefix = options.getString("prefix");
                    await client.db.UpdateOne('GuildConfig', {
                        Guild: interaction.guildId
                    }, {
                        $set: {
                            "RolesCommands.Prefix": prefix
                        }
                    });
                    await interaction.guild.updateData();
                    await interaction.safeEdit({
                        embeds: [
                            new EmbedBuilder().setTheme(guildData.Theme).setDescription(`^{command.role_command.prefix} -> \`${prefix}\``)
                        ]
                    })
                }

                else if (sub === "reset") {
                    if (!guildData.RolesCommands?.List?.length) return await interaction.safeEdit({
                        embeds: [
                            new EmbedBuilder().setTheme(guildData.Theme).setDescription(`^{command.role_command.not_found}`)
                        ]
                    });
                    await client.db.UpdateOne('GuildConfig', {
                        Guild: interaction.guildId
                    }, {
                        $unset: {
                            "RolesCommands.List": ""
                        }
                    });
                    await interaction.guild.updateData();
                    await interaction.safeEdit({
                        embeds: [
                            new EmbedBuilder().setTheme(guildData.Theme).setDescription(`^{command.role_command.reset}`)
                        ]
                    })
                }

            }

            else if (sub === "language") {
                const lang = options.getString("language")

                if (guildData.Language === lang) {

                    return await interaction.safeReply({
                        content: `^{command.language.already} \`${lang}\``,
                        ephemeral: true
                    });

                }
                else {
                    await interaction.deferReply({ ephemeral: true });
                    await client.db.UpdateOne('GuildConfig', {
                        Guild: interaction.guildId
                    }, {
                        $set: {
                            Language: lang
                        }
                    }, { upsert: true });
                    await interaction.guild.updateData();
                    await interaction.safeEdit({
                        content: "^{command.language.success}"
                    })
                }

            }

            else if (sub === "reaction-role") {
                await reactionRole.run({
                    message: interaction,
                    client,
                    err,
                    options, guildData,
                    Slash: { is: true },
                });
            } else if (sub === "level") {
                await rank.run({
                    message: interaction,
                    client,
                    err,
                    options,
                    Slash: { is: true },
                    guildData
                });
            }

            else if (sub === "audit-log") {
                await auditlog.run({
                    message: interaction,
                    client,
                    err,
                    options,
                    Slash: { is: true },
                    guildData
                });
            }

            else if (sub === "auto-reddit-feed") {
                await autoReddit.run({
                    message: interaction, client, err, options, guildData, Slash: { is: true },
                });
            }

            else if (sub === "automod") {
                await automod.run({
                    message: interaction,
                    guildData,
                    client, err, options,
                    Slash: { is: true },
                });
            }

            else if (sub === "autorole") {
                await autorole.run({
                    message: interaction,
                    client,
                    guildData,
                    err,
                    options,
                    Slash: { is: true },
                });
            }


            else if (sub === "custom-commands") {
                await customCommand.run({
                    message: interaction,
                    client,
                    err, guildData,
                    options,
                    Slash: { is: true },
                });
            }
            else if (sub === "farewell") {
                await farewell.run({
                    message: interaction,
                    client,
                    err, guildData,
                    options,
                    Slash: { is: true },
                });
            }
            else if (sub === "modlog") {

                await modLog.run({
                    message: interaction,
                    client,
                    err, guildData,
                    options,
                    Slash: { is: true },
                });
            }


            else if (sub === "welcome") {
                await welcome.run({
                    message: interaction,
                    client,
                    err, guildData,
                    options,
                    Slash: { is: true },
                });
            }

            else if (sub === "message-modes") {
                await messageModes.run({
                    message: interaction,
                    client, err, guildData,
                    options, Slash: { is: true }
                })
            }
            else if (sub === "auto-feed") {
                await autoFeed.run({
                    message: interaction,
                    client, err, options, guildData,
                    Slash: { is: true }
                })
            }
            else if (sub === "birthday") {
                await birthday.run({
                    message: interaction,
                    err, client, options, guildData,
                    Slash: { is: true }
                })
            }

            else if (sub === "ticket") {
                await ticket.run({
                    client, err, options, guildData,
                    message: interaction,
                    Slash: { is: true }
                })
            }

            else if (sub === "daily-announce") {
                await autoAnnounce.run({
                    client, err, options, guildData,
                    message: interaction,
                    Slash: { is: true }
                })
            }



        } catch (e) {
            err(e)
        }
    }
}
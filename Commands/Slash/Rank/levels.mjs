import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { EmbedBuilder, cache } from "../../../src/utils/index.mjs";
import Bot from "../../../src/client.mjs";

/**@type {import("../../../src/utils/Command.mjs").interaction} */
export default {
    category: "Rank",
    data: new SlashCommandBuilder()
        .setName('levels')
        .setDescription('Manage Leveling system!')
        .setDMPermission(false)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(sub => sub.setName("add").setDescription("Give levels to a user")
            .addNumberOption(option => option
                .setMinValue(1)
                .setMaxValue(100)
                .setName("level")
                .setDescription("Enter level To Add")
                .setRequired(true))
            .addUserOption(option => option
                .setName("user")
                .setDescription("Select User!")
                .setRequired(true)))
        .addSubcommand(sub => sub.setName("remove").setDescription("Remove levels from a user")
            .addNumberOption(option => option
                .setMaxValue(1)
                .setMaxValue(100)
                .setName("level")
                .setDescription("The level you want to remove")
                .setRequired(true))
            .addUserOption(option => option
                .setName("user")
                .setDescription("Select User!")
                .setRequired(true)))
        .addSubcommand(sub => sub.setName("set").setDescription("Change the level of a user to specific value")
            .addUserOption(option => option
                .setName("user")
                .setDescription("Select User!")
                .setRequired(true))
            .addNumberOption(option => option
                .setMaxValue(1)
                .setMaxValue(250)
                .setName("level")
                .setDescription("The level you want to set")
                .setRequired(true)))
    // .addSubcommand(sub => sub.setName("transfer").setDescription("Give everyone with a specific role a certain level.")
    //     .addRoleOption(option => option
    //         .setName("role")
    //         .setDescription("Select role!")
    //         .setRequired(true))
    //     .addNumberOption(option => option
    //         .setMaxValue(1)
    //         .setMaxValue(250)
    //         .setName("level")
    //         .setDescription("The preferred level")
    //         .setRequired(true))) // TODO
    ,

    run: async ({ client, interaction, err }) => {
        try {
            const sub = interaction.options.getSubcommand();
            const level = interaction.options.getNumber("level");

            await interaction.deferReply({
                fetchReply: true
            });


            const data = await client.db.FindOne('GuildConfig', {
                Guild: interaction.guild.id
            });

            if (data && data.Levels === true) {
                if (sub === "transfer") {
                    const role = interaction.options.getRole("role");
                    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) return await interaction.safeReply({
                        embeds: [new EmbedBuilder(client).setDescription("!{i} I need `Manage Role` Permission!").setColor("wrongcolor")],
                        ephemeral: true
                    });

                    const myPositon = i.guild.members.me.roles.highest.position;

                    if (role.position >= myPositon) return i.safeReply({
                        content: "**Kindly Select Another Role or Change My Positon**\n> The role you selected is not addable/removeable from me, Give highest role or select another role.",
                        ephemeral: true
                    });
                    else if (role.tags && role.tags.botId) return i.safeReply({
                        content: "**Kindly Select Another Role**\n> I noticed that role is for a bot - <@" + role.tags.botId + ">",
                        ephemeral: true
                    })



                } else {
                    const user = interaction.options.getUser("user");

                    if (user?.bot) return await interaction.safeEdit({
                        embeds: [new EmbedBuilder(client).setDescription("^{common.bot_selected}")]
                    });
                    let uhh;
                    if (sub === "set") {
                        uhh = await client.lvl.setLevel({
                            user,
                            guild: interaction.guild,
                            level
                        });
                    } else if (sub === "add") {
                        uhh = await client.lvl.addLevel({
                            user,
                            guild: interaction.guild,
                            level
                        });
                    } else {
                        uhh = await client.lvl.removeLevel({
                            user,
                            guild: interaction.guild,
                            level
                        });
                    }
                    if (!uhh) return await interaction.safeEdit({
                        embeds: [new EmbedBuilder(client).setColor("wrongcolor").setDescription("^{command.levels.no_user_data}")]
                    })
                    await interaction.safeEdit({
                        embeds: [new EmbedBuilder(client).setDescription("^{command.levels.no_user_data}")]
                    });
                }
            } else {
                await interaction.safeEdit({
                    embeds: [new EmbedBuilder(client).setColor("wrongcolor").setDescription("^{command.rank.disabled}")]
                });
            }
        } catch (error) {
            err(error);
        }
    }
};
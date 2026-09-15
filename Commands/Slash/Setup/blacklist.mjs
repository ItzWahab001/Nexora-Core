import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js'
import { parseEmoji } from '../../../src/utils/emoji.mjs';

/**@type {import('../../../src/utils/Command.mjs').interaction} */
export default {
    data: new SlashCommandBuilder()
        .setName("black-list")
        .setDescription("black list users.")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub => sub
            .setName("add")
            .setDescription("add a user to black list")
            .addUserOption(option => option
                .setName("user")

                .setDescription("the user to add")
                .setRequired(true)
            )
        )
        .addSubcommand(sub => sub
            .setName("remove")
            .setDescription("remove word-react")
            .addUserOption(op => op
                .setName("user")
                .setRequired(true)
                .setDescription("the user to remove")
            ))
        .addSubcommand(sub => sub
            .setName("list")
            .setDescription("list all word-reacts")
        )

        .setDMPermission(false),
    category: "Setup",
    cooldown: 10,
    run: async ({ interaction, client, guildData, err }) => {
        try {
            const sub = interaction.options.getSubcommand();

            if (sub == "add") {
                let user = interaction.options.getUser("user")


                if (guildData.Blacklist?.find(i => i === user.id)) {
                    return interaction.reply({ content: "This user is already in the list.", ephemeral: true })
                }

                if(user.id === interaction.user.id) {
                    return await interaction.reply({
                        content: "you cant blacklist your slef"
                    })
                }

                await interaction.deferReply({
                    fetchReply: true
                });


                await client.db.UpdateOne('GuildConfig', {
                    Guild: interaction.guild.id
                }, {
                    $push: {
                        "Blacklist": user.id
                    }
                }, { upsert: true, new: true });

                await interaction.guild.updateData()


                await interaction.editReply({ content: `Added <@${user.id}>` });
            }
            else if (sub == "remove") {
                const user = interaction.options.getUser("user");
                const list = guildData.Blacklist
                if (!list || !list.find(i => i === user.id)) return await interaction.reply({
                    content: "This user is not in the list.",
                    ephemeral: true
                });

                await interaction.deferReply();
                await client.db.UpdateOne('GuildConfig', {
                    Guild: interaction.guild.id
                }, {
                    $pull: {
                        "Blacklist": user.id
                    }
                }, { upsert: true })

                await interaction.guild.updateData()
                await interaction.editReply({
                    content: `Removed ${user} from the list.`
                })
            }
            else if (sub == "list") {
                if (guildData.Blacklist?.length == 0) return await interaction.reply({
                    content: "There are no blacklisted user."
                })

                await interaction.reply({
                    content: guildData.Blacklist.map((i, index) => `${index + 1}. <@${i}>`).join("\n")

                })
            }

        } catch (e) {
            err(e)
        }
    }
}
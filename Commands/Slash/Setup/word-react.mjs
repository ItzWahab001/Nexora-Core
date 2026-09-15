import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js'
import { parseEmoji } from '../../../src/utils/emoji.mjs';

/**@type {import('../../../src/utils/Command.mjs').interaction} */
export default {
    data: new SlashCommandBuilder()
        .setName("word-react")
        .setDescription("setup word react for this server")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub => sub
            .setName("add")
            .setDescription("add a word to the word react list")
            .addStringOption(option => option
                .setName("word")
                .setDescription("the word to add")
                .setRequired(true)
            )
            .addStringOption(option => option
                .setName("emoji")
                .setDescription("the emoji to react with")
                .setRequired(true)
            )
        )
        .addSubcommand(sub => sub
            .setName("remove")
            .setDescription("remove word-react")
            .addStringOption(op => op
                .setName("word")
                .setRequired(true)
                .setDescription("the word to remove")
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
                const emoji = interaction.options.getString("emoji")
                let word = interaction.options.getString("word")

                // cleaning word
                word = word.toLowerCase().replace(/ /g, "")

                if (guildData.WordReact?.List.find(i => i.trigger === word)) {
                    return interaction.reply({ content: "This word is already in the list.", ephemeral: true })
                }

                const parsedEmoji = parseEmoji(emoji)
                if (!parsedEmoji) {
                    return interaction.reply({
                        content: "Invalid emoji",
                        ephemeral: true
                    })
                }

                const msg = await interaction.deferReply({
                    fetchReply: true
                });

                const reacted = msg.react(parsedEmoji).then(() => true).catch(() => false);

                if (!reacted) return await interaction.editReply({ content: "I don't have permission to use given emoji." });

                await client.db.UpdateOne('GuildConfig', {
                    Guild: interaction.guild.id
                }, {
                    $push: {
                        "WordReact.List": {
                            "trigger": word,
                            "emoji": parsedEmoji
                        }
                    }
                }, { upsert: true, new: true });
                await interaction.guild.updateData()


                await interaction.editReply({ content: `Added ${word} to the word react list.` });
            }
            else if (sub == "remove") {
                const word = interaction.options.getString("word");
                const list = guildData.WordReact?.List
                if (!list || !list.find(i => i.trigger === word)) return await interaction.reply({
                    content: "This word is not in the list.",
                    ephemeral: true
                });

                await interaction.deferReply();
                await client.db.UpdateOne('GuildConfig', {
                    Guild: interaction.guild.id
                }, {
                    $pull: {
                        "WordReact.List": {
                            "trigger": word
                        }
                    }
                }, { upsert: true })

                await interaction.guild.updateData()
                await interaction.editReply({
                    content: `Removed ${word} from the word react list.`
                })
            }
            else if (sub == "list") {
                if (guildData.WordReact?.List.length == 0) return await interaction.reply({
                    content: "There are no words in the word react list."
                })

                await interaction.reply({
                    content: guildData.WordReact.List.map((i, index) => `${index + 1}. ${i.trigger} -> ${i.emoji}`).join("\n")

                })
            }

        } catch (e) {
            err(e)
        }
    }
}
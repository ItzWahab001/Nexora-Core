import { Message, embedLength } from 'discord.js';
import Bot from '../../../src/client.mjs';
import EmbedBuilder from '../../../src/utils/classes/EmbedBuilder.mjs';

/**@type {import('../../../src/utils/Command.mjs').prefix} */
export default {
    ignore: true,
    name: "suggest",
    cooldown: 300,
    description: "Create a suggestion",
    aliases: ["sugg", "vote"],
    category: "Misc",
    permissions: {
        user: ["SendMessages"],
        bot: ["EmbedLinks", 'AddReactions']
    },
    options: [
        {
            type: "string",
            name: "Message",
            required: true,
            id: "sugg"
        }
    ],
    /** 
    * @param {Object} object
    * @param {Message | import("discord.js").Interaction} object.message - The message object.
    * @param {Bot} object.client
    * @param {String[]} object.args
    * @param err ErrorHnadler
    */
    run: async ({ message, client, err, options, guildData }) => {
        try {
            const sugg = options.get("suggest")?.value || options.get("sugg");
            const embed = new EmbedBuilder().setTheme(guildData.Theme)

            if (!guildData.Suggestion.Enable) {
                return await message.safeReply({
                    embeds: [embed.setDescription("!{i} Suggestion System is not enabled for this server")]
                })
            }
            const channel = message.guild.channels.cache.get(guildData?.Suggestion?.Channel)

            if (!channel) {
                return await message.safeReply({
                    embeds: [embed.setDescription("!{i} Suggestion Channel Not set or Not Found!")]
                })
            }

            const Embed = new EmbedBuilder().setTheme(guildData.Theme)
                .setAuthor({
                    name: message.author.displayName,
                    iconURL: message.author.displayAvatarURL({ extension: "gif" })
                })
                .setDescription(`${sugg}`)
                .setFooter({
                    text: message.guild.name,
                    iconURL: message.guild.iconURL()
                })

            await channel.safeSend({
                embeds: [Embed]
            }).then(m => {
                m.react("👍");
                m.react("👎");
                message.safeReply({
                    embeds: [embed.setDescription("!{y} Successfully created a suggestion.")]
                })
            }).catch(() => {
                message.safeReply({
                    embeds: [embed.setDescription("!{i} Got An Error.")]
                })
            })

        } catch (error) {
            err(error)
        }
    }
};
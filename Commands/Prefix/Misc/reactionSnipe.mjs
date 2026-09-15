import { Message, User, MessageReaction } from 'discord.js';
import { EmbedBuilder, cache } from '../../../src/utils/index.mjs';
/**@type {import('../../../src/utils/Command.mjs').prefix} */

export default {
    name: "reaction-snipe",
    description: "Snipe the latest message that was reacted",
    cooldown: 5,
    aliases: ["rs", "reactsnipe", "react-snipe", "snipe-react", "sinpereact"],
    category: "Misc",
    options: [
        {
            name: "Number",
            type: "number",
            id: "number",
            required: false
        }
    ],
    permissions: {
        user: ["ManageMessages", "SendMessages"],
        bot: ["ManageMessages"]
    },
    /** 
    * @param {Object} object
    * @param {Message | import("discord.js").Interaction} object.message - The message object.
    * @param {Bot} object.client
    * @param {String[]} object.args
    * @param err ErrorHnadler
    */
    run: async ({ message, client, err, options, guildData }) => {
        try {
            const embed = new EmbedBuilder(client).setTheme(guildData?.Theme)
            const key = `ReactionSnipe:${client.user.id}:${message.guildId}:${message.channelId}`

            const num = options.get("number") ? parseInt(options.get("number")) - 1 : 0;

            const data = cache.get(key)

            if (!data || !data[num]) {
                return await message.safeReply({ embeds: [embed.setDescription("^{command.snipe.nothing}")] })
            }


            /**@type {User} snipedUser*/
            /**@type {MessageReaction} snipedReaction*/
            let snipedUser = data[num]?.user || data[0].user;
            let snipedReaction = data[num]?.reaction || data[0]?.reaction;


            await message.safeReply({
                embeds: [
                    embed
                        .setDescription(`${snipedUser}, Reacted with ${snipedReaction.emoji} to https://discord.com/channels/${message.guildId}/${message.channelId}/${snipedReaction.message.id}`)
                        .setAuthor({
                            iconURL: snipedUser.avatarURL({
                                forceStatic: false
                            }) || snipedUser.displayAvatarURL({
                                forceStatic: false
                            }),
                            name: snipedUser.username,
                        })
                        .setFooter({
                            text: `Snipe: ${num + 1}/${data.length}`
                        })
                        .setTimestamp(snipedReaction.message.createdTimestamp)

                ]
            })

        } catch (error) {
            err(error)
        }
    }
};
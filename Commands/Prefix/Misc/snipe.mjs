import { Message } from 'discord.js';
import { EmbedBuilder, cache } from '../../../src/utils/index.mjs';

/**@type {import('../../../src/utils/Command.mjs').prefix} */
export default {
    name: "snipe",
    description: "Snipe the latest message that was deleted",
    cooldown: 5,
    aliases: ["s"],
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
    run: async ({ message, client, err, options, guildData }) => {
        try {
            const embed = new EmbedBuilder(client).setTheme(guildData?.Theme)
            const key = `Snipe:${client.user.id}:${message.guildId}:${message.channelId}`

            const num = options.get("number") ? parseInt(options.get("number")) - 1 : 0;

            const data = cache.get(key)

            if (!data) {
                return await message.safeReply({ embeds: [embed.setDescription("^{command.snipe.nothing}")] })
            }

            if (!data[num]) {
                return await message.safeReply({ embeds: [embed.setDescription("!{i} There is nothing to snipe for given number")] })
            }

            /**@type {Message} snipedMsg */
            let snipedMsg = data[num] || data[0];

            await message.safeReply({
                embeds: [
                    embed
                        .setDescription(snipedMsg.content)
                        .setAuthor({
                            iconURL: snipedMsg.author.avatarURL({
                                forceStatic: false
                            }) || snipedMsg.author.displayAvatarURL({
                                forceStatic: false
                            }),
                            name: snipedMsg.author.username,
                        })
                        .setFooter({
                            text: `Snipe: ${num + 1}/${data.length}`
                        })
                        .setTimestamp(snipedMsg.createdTimestamp)

                ]
            })





        } catch (error) {
            err(error)
        }
    }
};
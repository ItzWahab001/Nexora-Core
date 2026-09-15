import { Message } from 'discord.js';
import { EmbedBuilder, cache } from '../../../src/utils/index.mjs';
/**@type {import('../../../src/utils/Command.mjs').prefix} */

export default {
    ignore: true,
    name: "purge-snipe",
    description: "Snipe the latest message that was deleted",
    cooldown: 5,
    aliases: ["ps", "snipe-purge"],
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
            const key = `PurgeSnipe:${client.user.id}:${message.guildId}:${message.channelId}`

            const num = options.get("number") ? parseInt(options.get("number")) - 1 : 0;

            const data = cache.get(key)

            if (!data) {
                return await message.safeReply({ embeds: [embed.setDescription("!{i} There is nothing to snipe")] })
            }

            if (!data[num]) {
                return await message.safeReply({ embeds: [embed.setDescription("!{i} There is nothing to snipe for given number")] })
            }

            let { messages, channel } = data[num] || data[0];

            await message.safeReply({
                embeds: [
                    embed
                        .setDescription(`!{i} Purged **${messages.size}** In <#${channel.id}>`)
                        .setFooter({
                            text: `Snipe: ${num + 1}/${data.length}`
                        })
                        .setTimestamp()
                ]
            })

        } catch (error) {
            err(error)
        }
    }
};
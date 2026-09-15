import { Message } from 'discord.js';
import { EmbedBuilder, cache } from '../../../src/utils/index.mjs';

/**@type {import('../../../src/utils/Command.mjs').prefix} */
export default {
    name: "clear-snipe",
    description: "Clear all Snipe",
    cooldown: 5,
    aliases: ["clearsnipe", "snipe-clear", "snipeclear"],
    category: "Misc",
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

            const key = `Snipe:${client.user.id}:${message.guildId}:${message.channelId}`
            const key2 = `EditSnipe:${client.user.id}:${message.guildId}:${message.channelId}`
            const key3 = `ReactionSnipe:${client.user.id}:${message.guildId}:${message.channelId}`
            const key4 = `PurgeSnipe:${client.user.id}:${message.guildId}:${message.channelId}`

            const data = cache.get(key)
            const data2 = cache.get(key2)
            const data3 = cache.get(key3)
            const data4 = cache.get(key4)

            if (!data && !data2 && !data3 && !data4) return await message.safeReply({
                embeds: [embed.setDescription("^{command.snipe_clear.nothing}")]
            })


            await cache.delete(key)
            await cache.delete(key2)
            await cache.delete(key3)
            await cache.delete(key4)

            await message.safeReply({
                embeds: [
                    embed.setDescription("^{command.snipe_clear.cleared}")
                ]
            })

        } catch (error) {
            err(error)
        }
    }
};
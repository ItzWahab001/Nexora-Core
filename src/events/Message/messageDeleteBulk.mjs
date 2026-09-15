import { Collection, PermissionsBitField, Message, Events } from 'discord.js'
import { auditlog, cache } from '../../utils/index.mjs'
import Bot from '../../client.mjs'


export default {
    name: "messageDeleteBulk",
    /**
    * @param {Bot} client - The Discord client.
    * @param {Message} messages - The message object.
    * @param {import('discord.js').GuildTextBasedChannel} channel
    */
    run: async (client, messages, channel) => {
        await auditlog("MessageDeleteBulk", channel.guild, {channel, message: messages} )
        const key = `PurgeSnipe:${client.user.id}:${channel.guildId}:${channel.id}`

        let snipeCache = cache.get(key)

        if (!snipeCache) cache.set(key, [{ messages, channel }], 120);

        else {
            snipeCache.unshift({ messages, channel })
            cache.set(key, snipeCache, 120)
        }

    }
}
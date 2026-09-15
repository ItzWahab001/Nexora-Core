import { Collection, PermissionsBitField, Message, User, MessageReaction } from 'discord.js'
import { cache } from '../../utils/index.mjs'
import Bot from '../../client.mjs'


export default {
    name: "messageReactionRemove",
    /**
     * @param {Bot} client - The Discord client.
     * @param {MessageReaction} reaction 
     * @param {User} user
     */
    run: async (client, reaction, user) => {

        const key = `ReactionSnipe:${client.user.id}:${reaction.message.guildId}:${reaction.message.channelId}`

        let snipeCache = cache.get(key)

        if (!snipeCache) cache.set(key, [{ reaction, user }], 120);
        else {
            snipeCache.unshift({ reaction, user })
            cache.set(key, snipeCache, 120)
        }

    }
}
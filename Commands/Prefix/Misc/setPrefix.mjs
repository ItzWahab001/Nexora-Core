import { Message } from 'discord.js';

import EmbedBuilder from '../../../src/utils/classes/EmbedBuilder.mjs';

/**@type {import('../../../src/utils/Command.mjs').prefix} */
export default {
    name: "set-prefix",
    cooldown: 5,
    description: "Update Bot prefix for server",
    aliases: ["setprefix", "prefix-set"],
    category: "Misc",
    permissions: {
        user: ["Administrator", "SendMessages"]
    },
    options: [
        {
            type: "string",
            name: "New Prefix",
            required: true,
            id: "prefix"
        }
    ],
    /** 
    * @param {Message} message
    * @param {Bot} client
    * @param {String[]} args
    * @param err ErrorHnadler
    */
    run: async ({ message, client, err, options }) => {
        try {
            const prefix = options.get("prefix")?.value || options.get("prefix");

            if (prefix.length > 2) return await message.safeReply({
                content: "^{command.set_prefix.limit_exceeded}"
            })
            
            await client.db.UpdateOne('GuildConfig', { Guild: message.guild.id }, { $set: { Prefix: prefix } }, { upsert: true })

            await message.safeReply({
                embeds: [new EmbedBuilder(client).setDescription("^{command.set_prefix.success}")]
            })

            await message.guild.updateData()

        } catch (error) {
            err(error)
        }
    }
};
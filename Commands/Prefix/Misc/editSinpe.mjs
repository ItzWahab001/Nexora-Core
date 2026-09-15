import { Message, Events } from 'discord.js';
import { EmbedBuilder, cache } from '../../../src/utils/index.mjs';

/**@type {import('../../../src/utils/Command.mjs').prefix} */
export default {
    name: "edit-snipe",
    description: "Snipe the latest message that was edited",
    cooldown: 5,
    aliases: ["es", "editsnipe"],
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
            const key = `EditSnipe:${client.user.id}:${message.guildId}:${message.channelId}`

            const num = options.get("number") ? parseInt(options.get("number")) - 1 : 0;

            const data = cache.get(key)

            if (!data || !data[num]) {
                return await message.safeReply({ embeds: [embed.setDescription("^{command.snipe.nothing}")] })
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
/**@type {import('../../../src/utils/Command.mjs').prefix} */
export default {
    ignore: true,
    name: "patreon",
    cooldown: 10,
    description: "Donate Us",
    aliases: ["donate"],
    category: "General",
    run: async ({ message, client, err, guildData }) => {
        try {
            await message.safeReply({
                content: `!{star} Consider Donating Us [**Here**](${client.config.Links.Patreon})`.replaceEmojis(guildData?.Theme)
            })
        } catch (error) {
            err(error)
        }
    }
};
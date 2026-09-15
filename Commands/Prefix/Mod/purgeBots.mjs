import EmbedBuilder from '../../../src/utils/classes/EmbedBuilder.mjs';
import ModUtils from '../../../src/utils/classes/ModUtils.mjs';

export default {
    name: "purge-bots",
    description: "Deletes the specified amount of message from bots in channel",
    cooldown: 5,
    aliases: ["purgebot", "purgebots", "bot-purge", "purge-bot"],
    category: "Moderation",
    permissions: {
        user: ["ManageMessages", "ReadMessageHistory"],
        bot: ["ManageMessages", "ReadMessageHistory"]
    },
    options: [
        {
            name: "Amount",
            id: "amount",
            required: true,
            type: "number",
            min: 1,
            max: 50
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

            const Embed = new EmbedBuilder(client).setTheme(guildData.Theme)
            const amount = parseInt(options.get("amount"))


            const msg = await message.safeReply({
                embeds: [
                    Embed.setDescription("^{common.loading}")
                ]
            });

            const response = await purge(message.member, message.channel, "Bot", amount);

            await message.channel.safeSend({
                embeds: [
                    Embed.setDescription(response)
                ]
            })

            if (msg) await msg?.delete().catch(() => { });
        } catch (error) {
            err(error)
        }
    },
    purge
};


async function purge(...args) {
    const response = await ModUtils.purgeMessages(...args);
    if (typeof response === "number") return `!{y} Successfully deleted ${response} messages`;
    if (response === "BotPerm") return `!{i} I don't have \`Read Message History\` & \`Manage Messages\` to delete messages`;
    else if (response === "MemberPerm") return `!{i} Your don't have \`Read Message History\` & \`Manage Messages\` to delete messages`;
    else if (response === "NoMessages") return `!{i} No messages found that can be cleaned`;
    else return `!{i} Failed to Delete Messages`;
}

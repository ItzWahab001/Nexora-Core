import EmbedBuilder from '../../../src/utils/classes/EmbedBuilder.mjs';
import ModUtils from '../../../src/utils/classes/ModUtils.mjs';

export default {
    name: "purge-attachments",
    description: "Deletes the specified amount of message with attachments in channel",
    cooldown: 5,
    aliases: ["purgeattachment", "purgeattachments", "attach-purge", "purgeattach", "purge-attach"],
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

            const response = await purge(message.member, message.channel, "Attachment", amount);

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
    if (typeof response === "number") return `^{command.purge.success} ${response}`;
    if (response === "BotPerm") return `^{command.purge.botPerm}`;
    else if (response === "MemberPerm") return `^{command.purge.userPerm}`;
    else if (response === "NoMessages") return `^{command.purge.noMessage}`;
    else return `^{command.purge.error}`;
}

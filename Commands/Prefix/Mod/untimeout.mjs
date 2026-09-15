import EmbedBuilder from '../../../src/utils/classes/EmbedBuilder.mjs';
import ModUtils from '../../../src/utils/classes/ModUtils.mjs';

export default {
    name: "timeout-remove",
    description: "Timeout Specified Member",
    cooldown: 5,
    aliases: ["unmute", "untimeout", "remove-mute", "remove-timeout"],
    category: "Moderation",
    permissions: {
        user: ["ModerateMembers"],
        bot: ["ModerateMembers"]
    },
    options: [
        {
            name: "@User/UserId/Username",
            id: "user",
            required: true,
            type: "member"
        }, {
            name: "Reason",
            id: "reason",
            required: false,
            type: "string"
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

            const target = options.get("user");
            const reason = options.get("reason") || "Not Specified"

            const Embed = new EmbedBuilder(client).setTheme(guildData.Theme)

            const msg = await message.safeReply({
                embeds: [
                    Embed.setDescription("^{common.loading}")
                ]
            });

            const response = await untimeout(message.member, target, reason);

            await msg.safeEdit({
                embeds: [
                    Embed.setDescription(response)
                ]
            })

        } catch (error) {
            err(error)
        }
    },
    untimeout
};


async function untimeout(issuer, target, reason) {
    const response = await ModUtils.unTimeoutTarget(issuer, target, reason);
    if (typeof response === "boolean") return `^{command.untimeout.success}`;
    if (response === "BotPerm") return `^{command.untimeout.botperm}`;
    else if (response === "MemberPerm") return `^{command.untimeout.userPerm}`;
    else if (response === "NoTimeout") return `^{command.untimeout.noTimeout}`;
    else return `^{command.untimeout.error}`;
}

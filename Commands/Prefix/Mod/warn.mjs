import EmbedBuilder from '../../../src/utils/classes/EmbedBuilder.mjs';
import ModUtils from '../../../src/utils/classes/ModUtils.mjs';
export default {
    name: "warn",
    description: "Warn Specified Member",
    cooldown: 20,
    aliases: [],
    category: "Moderation",
    permissions: {
        user: ["KickMembers"],
        bot: ["ManageMessages"]
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
            const reason = options.get("reason") || "Reason Not Specified"
            const Embed = new EmbedBuilder(client).setTheme(guildData.Theme)

            const msg = await message.safeReply({
                embeds: [
                    Embed.setDescription("^{common.loading}")
                ]
            });

            const response = await warn(message.member, target, reason);

            await msg.safeEdit({
                embeds: [
                    Embed.setDescription(response)
                ]
            })

        } catch (error) {
            err(error)
        }
    },
    warn
};

async function warn(issuer, target, reason) {
    if (issuer.user.id === target.user.id) return `^{command.warn.yourSelf}`
    if (target.user.bot) return "^{command.warn.bot}";
    const response = await ModUtils.warnTarget(issuer, target, reason);
    if (typeof response === "boolean") return `^{command.warn.success}`;
    if (response === "BotPerm") return `^{command.warn.botPerm}`;
    else if (response === "MemberPerm") return `^{command.warn.userPerm}`;
    else return `^{command.warn.error}`;
}
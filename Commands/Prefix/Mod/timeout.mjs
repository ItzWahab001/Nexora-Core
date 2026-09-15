import EmbedBuilder from '../../../src/utils/classes/EmbedBuilder.mjs';
import ModUtils from '../../../src/utils/classes/ModUtils.mjs';
import ems from "enhanced-ms"
export default {
    name: "timeout",
    description: "Timeoit Specified Member",
    cooldown: 5,
    aliases: ["mute", "stfu"],
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
            name: "Duration eg: 1m/1h/1d/1w",
            id: "dur",
            required: false,
            type: "string"
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
            const ms = ems(options.get("dur") || "1m")
            const target = options.get("user");
            const reason = options.get("reason") || "Not Specified"

            const Embed = new EmbedBuilder(client).setTheme(guildData.Theme)

            const msg = await message.safeReply({
                embeds: [
                    Embed.setDescription("^{common.loading}")
                ]
            });

            const response = await timeout(message.member, target, ms, reason);

            await msg.safeEdit({
                embeds: [
                    Embed.setDescription(response)
                ]
            })

        } catch (error) {
            err(error)
        }
    },
    timeout
};


async function timeout(issuer, target, ms, reason) {
    if (isNaN(ms)) return "^{command.timeout.invalid_duration}";
    if (issuer.user.id === target.user.id) return `^{command.timeout.self}`;
    const response = await ModUtils.timeoutTarget(issuer, target, ms, reason);
    if (typeof response === "boolean") return `^{command.timeout.success}`;
    if (response === "BotPerm") return `^{command.timeout.botPerm}`;
    else if (response === "MemberPerm") return `^{command.timeout.userPerm}`;
    else if (response === "Already") return `^{command.timeout.already}. `;
    else return `^{command.timeout.error}`;
}

import EmbedBuilder from '../../../src/utils/classes/EmbedBuilder.mjs';
import ModUtils from '../../../src/utils/classes/ModUtils.mjs';
export default {
    name: "kick",
    description: "kick Specified Member",
    cooldown: 5,
    aliases: [],
    category: "Moderation",
    permissions: {
        user: ["KickMembers"],
        bot: ["KickMembers"]
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

            const response = await kick(message.member, target, reason);

            await msg?.safeEdit({
                embeds: [
                    Embed.setDescription(response)
                ]
            });
        } catch (error) {
            err(error)
        }
    },
    kick
};

async function kick(issuer, target, reason) {
    if (issuer.user.id === target.user.id) return `^{command.kick.self}`
    const response = await ModUtils.kickTarget(issuer, target, reason);
    if (typeof response === "boolean") return `^{command.kick.success}\n\n- Member: <@${target.id}>\n- Reason: ${reason}`;
    if (response === "BotPerm") return `^{command.kick.botPerm}`;
    else if (response === "MemberPerm") return `^{command.kick.userPerm}`;
    else return `^{command.kick.error}`;
}


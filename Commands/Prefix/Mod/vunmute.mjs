import EmbedBuilder from '../../../src/utils/classes/EmbedBuilder.mjs';
import ModUtils from '../../../src/utils/classes/ModUtils.mjs';

export default {
    ignore: true,
    name: "voice-unmute",
    description: "unmutes specified member's voice",
    cooldown: 5,
    aliases: ["vunmute", "voice-untimeout", "voiceunmute"],
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

            const response = await vUnMute(message, target, reason);

            await msg.safeEdit({
                embeds: [
                    Embed.setDescription(response)
                ]
            })

        } catch (error) {
            err(error)
        }
    },
    vUnMute
};


async function vUnMute({ member }, target, reason) {
    if (member.user.id === target.user.id) return `!{i} You cannot mute your self`

    const response = await ModUtils.vUnmuteTarget(member, target, reason);

    if (typeof response === "boolean") return `!{y} ${target.user.username}'s voice is unmuted in this server`;
    else if (response === "MemberPerm") return `!{i} You do not have permission to voice unmute ${target.user.username}`;
    else if (response === "BotPerm") return `!{i} I do not have permission to voice unmute ${target.user.username}`;
    else if (response === "NoVoice") return `!{i} ${target.user.username} is not in any voice channel`;
    else if (response === "NotMuted") return `!{i} ${target.user.username} is not voice muted`;
    else return `!{i} Failed to remove voice mute for ${target.user.username}`;
}

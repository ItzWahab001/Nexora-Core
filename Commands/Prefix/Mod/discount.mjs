import EmbedBuilder from '../../../src/utils/classes/EmbedBuilder.mjs';
import ModUtils from '../../../src/utils/classes/ModUtils.mjs';
export default {
    name: "disconnect",
    description: "disconnect Specified Member in Voice Channels",
    cooldown: 5,
    aliases: [],
    category: "Moderation",
    permissions: {
        user: ["MuteMembers"],
        bot: ["MuteMembers"]
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

            const response = await disconnect(message.member, target, reason);

            await msg.safeEdit({
                embeds: [
                    Embed.setDescription(response)
                ]
            })

        } catch (error) {
            err(error)
        }
    },
    disconnect
};

async function disconnect(issuer, target, reason) {
    if (issuer.user.id === target.user.id) return `^{command.disconect.self}`
    const response = await ModUtils.disconnectTarget(issuer, target, reason);
    if (typeof response === "boolean") return `^{command.disconect.success}`;
    else if (response === "MemberPerm") return `^{command.disconect.userPerm}`;
    else if (response === "BotPerm") return `^{command.disconect.botPerm}`;
    else if (response === "NoVoice") return `^{command.disconect.noVoice}`;
    else return `6{command.disconect.error}`;
}


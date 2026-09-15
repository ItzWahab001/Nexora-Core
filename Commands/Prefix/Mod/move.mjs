import EmbedBuilder from '../../../src/utils/classes/EmbedBuilder.mjs';
import ModUtils from '../../../src/utils/classes/ModUtils.mjs';
export default {
    name: "move",
    description: "move Specified Member in Voice Channels",
    cooldown: 5,
    aliases: [],
    category: "Moderation",
    permissions: {
        user: ["MoveMembers"],
        bot: ["MoveMembers"]
    },
    options: [
        {
            name: "@User/UserId/Username",
            id: "user",
            required: true,
            type: "member"
        },
        {
            name: "Channel",
            id: "channel",
            required: true,
            type: "channel"
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
            const targetChannel = options.get("channel");
            const reason = options.get("reason") || "Not Specified"
            const Embed = new EmbedBuilder(client).setTheme(guildData.Theme)

            const msg = await message.safeReply({
                embeds: [
                    Embed.setDescription("^{common.loading}")
                ]
            });

            const response = await move(message, target, reason, targetChannel);

            await msg.safeEdit({
                embeds: [
                    Embed.setDescription(response)
                ]
            })

        } catch (error) {
            err(error)
        }
    },
    move
};

async function move(message, target, reason, targetChannel) {
    if (issuer.user.id === target.user.id) return `^{command.moce.self}`
    const response = await ModUtils.moveTarget(message, target, reason, targetChannel);
    if (typeof response === "boolean") return `^{command.move.success}`;
    else if (response === "MemberPerm") return `^{cmmand.move.userPerm}`;
    else if (response === "BotPerm") return `^{command.move.botPerm}`
    else if (response === "NoVoice") return `^{command.move.noVoice}`;
    else if (response === "TargetPerm") return `^{command.move.targetPerm}`;
    else if (response === "Already") return `^{command.move.already}`;
    else return `^{command.move.error}`;
}


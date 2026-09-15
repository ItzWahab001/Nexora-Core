import EmbedBuilder from '../../../src/utils/classes/EmbedBuilder.mjs';
import ModUtils from '../../../src/utils/classes/ModUtils.mjs';
export default {
    name: "undeafen",
    description: "undeafen Specified Member in Voice Channels",
    cooldown: 5,
    aliases: [],
    category: "Moderation",
    permissions: {
        user: ["DeafenMembers"],
        bot: ["DeafenMembers"]
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

            const response = await undeafen(message.member, target, reason);

            await msg.safeEdit({
                embeds: [
                    Embed.setDescription(response)
                ]
            })

        } catch (error) {
            err(error)
        }
    },
    undeafen
};

async function undeafen(issuer, target, reason) {
    if (issuer.user.id === target.user.id) return `^{command.undeafen.self}`
    const response = await ModUtils.unDeafenTarget(issuer, target, reason);
    if (typeof response === "boolean") return `^{command.undeafen.success} ${target.user.username}`;
    else if (response === "MemberPerm") return `^{command.undeafen.userPerm} ${target.user.username}`;
    else if (response === "BotPerm") return `^{command.undeafen.botPerm} ${target.user.username}`;
    else if (response === "NoVoice") return `^{command.undeafen.noVoice}`;
    else if (response === "NotDeafned") return `^{command.undeafen.noDefean} ${target.user.username}`;
    else return `!{skull} Failed to undeafen`;
}


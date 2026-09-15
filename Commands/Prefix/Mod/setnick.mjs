import EmbedBuilder from '../../../src/utils/classes/EmbedBuilder.mjs';
import ModUtils from '../../../src/utils/classes/ModUtils.mjs';

export default {
    name: "setnick",
    description: "set nickname for a Specified Member",
    cooldown: 5,
    aliases: ["nickset", "set-nick", "set-nickname"],
    category: "Moderation",
    permissions: {
        user: ["ManageNicknames"],
        bot: ["ManageNicknames"]
    },
    options: [
        {
            name: "@User/UserId/Username",
            id: "user",
            required: true,
            type: "member"
        }, {
            name: "Nickname",
            id: "name",
            required: true,
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
            const name = options.get("name");

            const Embed = new EmbedBuilder(client).setTheme(guildData.Theme)

            const msg = await message.safeReply({
                embeds: [
                    Embed.setDescription("^{common.loading}")
                ]
            });

            const response = await setnick(message.member, target, name);

            await msg.safeEdit({
                embeds: [
                    Embed.setDescription(response)
                ]
            })

        } catch (error) {
            err(error)
        }
    },
    setnick
};


async function setnick(issuer, target, name) {
    const response = await ModUtils.setNick(issuer, target, name);
    if (typeof response === "boolean") return `^{command.forceNickname.success}`;
    if (response === "BotPerm") return `^{command.forceNickname.botPerm}`;
    else if (response === "MemberPerm") return '^{command.forceNickname.userPerm}';
    else return `^{command.forceNickname.error}`;
}

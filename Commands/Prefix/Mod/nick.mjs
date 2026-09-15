import { Message } from 'discord.js';
import EmbedBuilder from '../../../src/utils/classes/EmbedBuilder.mjs';
import ModUtils from '../../../src/utils/classes/ModUtils.mjs';

export default {
    name: "nick",
    description: "update my nickname for this sever",
    cooldown: 5,
    aliases: ["nickname"],
    category: "Moderation",
    permissions: {
        user: ["ManageNicknames"],
        bot: ["ChangeNickname"]
    },
    options: [
        {
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

            const response = await setnick(message.member, message.guild.members.me, name);

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
    if (typeof response === "boolean") return `^{command.nickname.success} -> ${name}`;
    if (response === "BotPerm") return `^{command.nickname.botPerm}`;
    else if (response === "MemberPerm") return `^{command.nickname.userPerm}`;
    else return `^{command.nickname.error}`;
}

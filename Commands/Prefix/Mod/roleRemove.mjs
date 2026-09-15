import EmbedBuilder from '../../../src/utils/classes/EmbedBuilder.mjs';
import ModUtils from '../../../src/utils/classes/ModUtils.mjs';

export default {
    name: "role-remove",
    description: "Remove specified role to specified user",
    cooldown: 5,
    aliases: ["roleremove", "remove-role", "rr"],
    category: "Moderation",
    permissions: {
        user: ["ManageRoles"],
        bot: ["ManageRoles"]
    },
    options: [
        {
            id: "user",
            type: "member",
            required: true,
            name: "@User/Username/ID",
        }, {
            id: "role",
            type: "role",
            required: true,
            name: "@Role/Name/ID",
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

            const Embed = new EmbedBuilder(client).setTheme(guildData.Theme)

            const role = options.get("role")
            const user = options.get("user")

            const msg = await message.safeReply({
                embeds: [
                    Embed.setDescription("^{common.loading}")
                ]
            });

            const response = await removeRole(message.member, user, role);

            await msg.safeEdit({
                embeds: [
                    Embed.setDescription(response)
                ]
            });

        } catch (error) {
            err(error)
        }
    },
    removeRole
};


async function removeRole(issuer, user, role) {
    const response = await ModUtils.removeRole(issuer, user, role);
    if (typeof response === "boolean") return `^{command.roleRemove.success}\n- Target: ${user}\n- Role: ${role}`;
    else if(response === "MemberPerm") return "^{command.roleRemove.userPerm}"
    else if (response === "BotPerm" || response === "BotPositon") return `^{command.roleRemove.botPerm}`;
    else if (response === "BotRole") return `^{command.mod.inValidRole}`;
    else if (response === "Already") return `^{command.roleRemove.already}`;
    else return `^{command.roleRemove.error}`;
}

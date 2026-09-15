import EmbedBuilder from '../../../src/utils/classes/EmbedBuilder.mjs';
import ModUtils from '../../../src/utils/classes/ModUtils.mjs';

export default {
    name: "role-delete",
    description: "Delete specified role",
    cooldown: 5,
    aliases: ["del-role", "delrole", "delete-role", "roledel"],
    category: "Moderation",
    permissions: {
        user: ["ManageRoles"],
        bot: ["ManageRoles"]
    },
    options: [
        {
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

            const msg = await message.safeReply({
                embeds: [
                    Embed.setDescription("^{common.loading}")
                ]
            });

            const response = await delRole(message.member, role);

            await msg.safeEdit({
                embeds: [
                    Embed.setDescription(response)
                ]
            });

        } catch (error) {
            err(error)
        }
    },
    delRole
};


async function delRole(issuer, role) {
    const response = await ModUtils.delRole(issuer, role);
    if (typeof response === "boolean") return `^{command.roleDelete.success}`;
    else if(response === "MemberPerm") return "^{command.roleDelete.userPerm}"
    else if (response === "BotPerm") return `^{command.roleDelete.botPerm}`;
    else if (response === "BotRole") return `^{command.mod.inValidRole}`;
    else return `^{command.roleDelete.error}`;
}

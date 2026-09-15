import EmbedBuilder from '../../../src/utils/classes/EmbedBuilder.mjs';
import ModUtils from '../../../src/utils/classes/ModUtils.mjs';

export default {
    ignore: true,
    name: "role-name",
    description: "Update role name",
    cooldown: 5,
    aliases: ["name-role", "rolename", "set-role-name"],
    category: "Moderation",
    permissions: {
        user: ["ManageRoles"],
        bot: ["ManageRoles"]
    },
    options: [ {
            id: "role",
            type: "role",
            required: true,
            name: "@Role/Name/ID",
        },
        {
            id: "name",
            type: "string",
            required: true,
            name: "Name",
        },
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
            const role = options.get("role");

            const name = options.get("name")

            const msg = await message.safeReply({
                embeds: [
                    Embed.setDescription("^{common.loading}")
                ]
            });

            const response = await updateRole(message.member, role, {name});

            await msg.safeEdit({
                embeds: [
                    Embed.setDescription(response)
                ]
            });

        } catch (error) {
            err(error)
        }
    },
    updateRole
};


async function updateRole(issuer, role, {name}) {
    const response = await ModUtils.roleUpdate(issuer, role, "name", name);
    if (typeof response === "boolean") return `!{y} Successfully updated ${role}`;
    else if(response === "MemberPerm") return "!{i} You dont have permisson to update that role"
    else if (response === "BotPerm") return `!{i} I don't have permisson. Give me higher role`;
    else if (response === "BotPositon") return `!{i} I don't have permisson. Give me higher role`;
    else if (response === "BotRole") return `!{i} Kindly Provide editable Role.`;
    else return `!{i} Failed to update Role`;
}

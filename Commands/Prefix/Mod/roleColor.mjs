import EmbedBuilder from '../../../src/utils/classes/EmbedBuilder.mjs';
import ModUtils from '../../../src/utils/classes/ModUtils.mjs';

export default {
    ignore: true,
    name: "role-color",
    description: "Update role color",
    cooldown: 5,
    aliases: ["color-role", "rolecolor", "set-role-color"],
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
            id: "color",
            type: "string",
            required: true,
            name: "HexColor eg: 00ffaa, fff",
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

            const color = options.get("color")

            if (!/^[A-Fa-f0-9]{6}$/.test(color)) return await message.safeReply({
                embeds: [Embed.setDescription("Kindly Provide A Vaild Hex Code. eg: 00ffaa, ffffff, 000000......")],
                ephemeral: true
            });

            const msg = await message.safeReply({
                embeds: [
                    Embed.setDescription("^{common.loading}")
                ]
            });

            const response = await updateRole(message.member, role, {color});

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


async function updateRole(issuer, role, {color}) {
    const response = await ModUtils.roleUpdate(issuer, role, "color", `#${color}`);
    if (typeof response === "boolean") return `!{y} Successfully updated ${role}`;
    else if(response === "MemberPerm") return "!{i} You dont have permisson to update that role"
    else if (response === "BotPerm") return `!{i} I don't have permisson. Give me higher role`;
    else if (response === "BotPositon") return `!{i} I don't have permisson. Give me higher role`;
    else if (response === "BotRole") return `!{i} Kindly Provide editable Role.`;
    else return `!{i} Failed to update Role`;
}

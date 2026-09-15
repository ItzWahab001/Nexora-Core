import { GuildMember, Role } from 'discord.js';
import EmbedBuilder from '../../../src/utils/classes/EmbedBuilder.mjs';
import ModUtils from '../../../src/utils/classes/ModUtils.mjs';

export default {
    ignore: true,
    name: "role-mentionable",
    description: "toggle role mentionable",
    cooldown: 5,
    aliases: ["role-mention", "mentionable-role", "toggle-role-mention"],
    category: "Moderation",
    permissions: {
        user: ["ManageRoles"],
        bot: ["ManageRoles"]
    },
    options: [{
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
            const role = options.get("role");


            const msg = await message.safeReply({
                embeds: [
                    Embed.setDescription("^{common.loading}")
                ]
            });

            const response = await updateRole(message.member, role);

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

/**
 * 
 * @param {GuildMember} issuer 
 * @param {Role} role 
 * @returns 
 */
async function updateRole(issuer, role) {
    let mentionable = role.mentionable ? false : true
    const response = await ModUtils.roleUpdate(issuer, role, "mentionable", mentionable);
    if (typeof response === "boolean") return `!{y} Successfully updated Mentioable to ${mentionable}.`;
    else if (response === "MemberPerm") return "!{i} You dont have permisson to update that role"
    else if (response === "BotPerm") return `!{i} I don't have permisson. Give me higher role`;
    else if (response === "BotPositon") return `!{i} I don't have permisson. Give me higher role`;
    else if (response === "BotRole") return `!{i} Kindly Provide editable Role.`;
    else return `!{i} Failed to update Role`;
}

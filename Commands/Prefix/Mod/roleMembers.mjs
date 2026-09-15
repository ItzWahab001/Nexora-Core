import { AttachmentBuilder } from 'discord.js';
import EmbedBuilder from '../../../src/utils/classes/EmbedBuilder.mjs';
import ModUtils from '../../../src/utils/classes/ModUtils.mjs';

export default {
    name: "members",
    description: "Fetch members has specified role",
    cooldown: 5,
    aliases: ["in-role", "roles-in", "rolein"],
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

            const response = await ModUtils.RolesIn(role);

            if (typeof response === "boolean") return await msg.safeEdit({
                embeds: [
                    Embed.setDescription("!{i} Members Not Found")
                ]
            });

            const attachment = new AttachmentBuilder(Buffer.from(response), {
                name: `Members_${role.name}.txt`, 
            })

            await msg.safeEdit({
                embeds: [],
                // content: response
                files: [attachment]
            })

        } catch (error) {
            err(error)
        }
    },
};

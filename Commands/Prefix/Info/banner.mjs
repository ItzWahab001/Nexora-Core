import { AttachmentBuilder, ButtonBuilder, Message, ActionRowBuilder, Guild, GuildMember } from "discord.js"
import { EmbedBuilder, addSuffix, cache } from "../../../src/utils/index.mjs";

/** @type {import("../../../src/utils/Command.mjs").prefix} */
export default {
    name: "banner",
    description: "Retrun User banner",
    cooldown: 5,
    category: "Misc",
    options: [{
        name: "@User/Id/Name",
        id: "user",
        type: "member",
        required: false
    }],
    /** 
    * @param {Object} object
    * @param {Message | import("discord.js").Interaction} object.message - The message object.
    * @param {Bot} object.client
    * @param {String[]} object.args
    * @param err ErrorHnadler
    */
    run: async ({ message, client, err, options, guildData }) => {
        try {

            const memberOption = options.get("user") || message?.options?.getMember("member");
            /**
            * @type {GuildMember}
             */
            const member = memberOption || message.member;

            const embed = new EmbedBuilder()
                .setTheme(guildData.Theme)
                .setAuthor({
                    name: `${member.displayName}`,
                    iconURL: `${member.displayAvatarURL()}`
                })
                .setImage(`${await member.bannerURL({ dynamic: true })}`)
                .setFooter({
                    text: `^{common.requestedBy} ${message.member.displayName}`,
                    iconURL: `${message.member.displayAvatarURL()}`
                });

            await message.safeReply({
                embeds: [embed],
            });

        } catch (error) {
            err(error)
        }
    }
};
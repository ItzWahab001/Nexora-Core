import { AttachmentBuilder, ButtonBuilder, Message, ActionRowBuilder, Guild, GuildMember } from "discord.js"
import art from "discord-arts"
import { EmbedBuilder, addSuffix, cache } from "../../../src/utils/index.mjs";

/** @type {import("../../../src/utils/Command.mjs").prefix} */
export default {
    name: "avatar",
    description: "Retrun User Avatar",
    cooldown: 5,
    aliases: ["profilepic", "dp", "pp", "av"],
    category: "Misc",
    permissions: { bot: ["EmbedLinks"] },
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

            let jpgAvatar = member.displayAvatarURL({
                size: 1024,
                extension: 'jpg'
            });
            let pngAvatar = member.displayAvatarURL({
                size: 1024,
                extension: 'png'
            });
            let normal = member.displayAvatarURL({
                // size: 1024,
                forceStatic: true,
            })

            const embed = new EmbedBuilder()
                .setTheme(guildData.Theme)
                .setAuthor({
                    name: `${member.displayName}`,
                    iconURL: `${member.displayAvatarURL()}`
                })
                .setDescription(`[**PNG**](${pngAvatar}) | [**JPG**](${jpgAvatar})`)
                .setImage(`${normal}`)
                .setFooter({
                    text: `^{common.requestedBy} ${message.member.displayName}`,
                    iconURL: `${message.member.displayAvatarURL()}`
                });

            const avatarButton = new ButtonBuilder()
                .setLabel('^{command.avatar.button.label}')
                .setStyle(5)
                .setURL(member.displayAvatarURL());

            const row = new ActionRowBuilder().addComponents(avatarButton)
            if (member.avatarURL()) row.addComponents(
                new ButtonBuilder()
                    .setLabel('^{command.avatar.button.label}')
                    .setStyle(5)
                    .setURL(member.avatarURL())
            )
            await message.safeReply({
                components: [row],
                embeds: [embed],
            });

        } catch (error) {
            err(error)
        }
    }
};
import { Message } from "discord.js"
import { EmbedBuilder } from "../../../src/utils/index.mjs";
/** @type {import("../../../src/utils/Command.mjs").prefix} */
export default {
    name: "serverinfo",
    description: "Retrun Server information",
    cooldown: 5,
    aliases: ["si", "server-info", "guild-info"],
    category: "General",
    /** 
    * @param {Object} object
    * @param {Message | import("discord.js").Interaction} object.message - The message object.
    * @param {Bot} object.client
    * @param {String[]} object.args
    * @param err ErrorHnadler
    */
    run: async ({ message, client, err, guildData }) => {

        const msg = await message.safeReply({
            embeds: [
                new EmbedBuilder().setTheme(guildData.Theme).setDescription("^{common.loading}")
            ],
        })

        try {
            const {
                guild
            } = message;
            const {
                ownerId,
                createdTimestamp
            } = guild;
            const roles = guild.roles.cache.size;
            const emojis = guild.emojis.cache.size;
            const botCount = guild.members.cache.filter(member => member.user.bot).size;
            const owner = await guild.members.fetch(ownerId);
            const ownerUsername = owner.user.username;
            const memberCount = guild.members.cache.filter(member => !member.user.bot).size;
            const textChannels = guild.channels.cache.filter((c) => c.type === 0).toJSON().length;
            const voiceChannels = guild.channels.cache.filter((c) => c.type === 2).toJSON().length;
            const categoryChannels = guild.channels.cache.filter((c) => c.type === 4).toJSON().length;
            const regionToCountry = {
                "us": "United States",
                "gb": "United Kingdom",
                "ca": "Canada",
                "au": "Australia",
                "de": "Germany",
                "fr": "France",
            };
            const region = guild.preferredLocale.toLowerCase();
            const country = regionToCountry[region] || region;

            let baseVerification = guild.verificationLevel;
            if (baseVerification == 0) baseVerification = "None"
            if (baseVerification == 1) baseVerification = "Low"
            if (baseVerification == 2) baseVerification = "Medium"
            if (baseVerification == 3) baseVerification = "High"
            if (baseVerification == 4) baseVerification = "Very High"

            let totalMemberCount = 0;
            client.guilds.cache.forEach(guild => {
                totalMemberCount += guild.members.cache.filter(member => !member.user.bot).size;
            });

            const embed = new EmbedBuilder()
                .setTitle(`^{command.serverinfo.title}`)
                .setThumbnail(client.user.displayAvatarURL())
                .setAuthor({
                    name: client.user.tag
                })
                .addFields({
                    name: " ",
                    value: "^{command.serverinfo.description}",
                    inline: false
                })
                .addFields({
                    name: "Date Created  ",
                    value: `\`\`\`yml\n${new Date(createdTimestamp).toLocaleDateString()}\`\`\``,
                    inline: true
                })
                .addFields({
                    name: "Server Owner",
                    value: `\`\`\`yml\n${ownerUsername}\`\`\``,
                    inline: true
                })
                .addFields({
                    name: "Role Number ",
                    value: `\`\`\`yml\n${roles}\`\`\``,
                    inline: true
                })
                .addFields({
                    name: 'Category',
                    value: `\`\`\`yml\n${categoryChannels}\`\`\``,
                    inline: true
                })
                .addFields({
                    name: 'Text channels',
                    value: `\`\`\`yml\n ${textChannels}\`\`\``,
                    inline: true
                })
                .addFields({
                    name: 'Voice channels',
                    value: `\`\`\`yml\n ${voiceChannels}\`\`\``,
                    inline: true
                })
                .addFields({
                    name: "Server Bots",
                    value: `\`\`\`yml\n${botCount}\`\`\``,
                    inline: true
                })
                .addFields({
                    name: "Server Members",
                    value: `\`\`\`yml\n${memberCount}\`\`\``,
                    inline: true
                })
                .addFields({
                    name: "Emoji Number",
                    value: `\`\`\`yml\n${emojis}\`\`\``,
                    inline: true
                })
                .addFields({
                    name: "Server Boost",
                    value: `\`\`\`yml\n${guild.premiumSubscriptionCount}\`\`\``,
                    inline: true
                })
                .addFields({
                    name: "Verification ",
                    value: `\`\`\`yml\n${baseVerification}\`\`\``,
                    inline: true
                })
                .addFields({
                    name: "Server Region",
                    value: `\`\`\`yml\n${country}\`\`\``,
                    inline: true
                })
                .setTimestamp();


            const reply = { embeds: [embed], };

            await msg.safeEdit(reply)

        } catch (error) {
            err(error)
        }
    }
};


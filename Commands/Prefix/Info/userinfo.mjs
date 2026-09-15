import { AttachmentBuilder, ButtonBuilder, Message, ActionRowBuilder } from "discord.js"
import { EmbedBuilder, addSuffix, cache } from "../../../src/utils/index.mjs";
/** @type {import("../../../src/utils/Command.mjs").prefix} */
export default {
    name: "userinfo",
    description: "Retrun User information",
    cooldown: 5,
    aliases: ["ui", "whois", "user-info"],
    category: "General",
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

        const memberOption = options.get("user") || message?.options?.getMember("member");
        const member = memberOption || message.member;

        if (member.user.bot) {
            return message.safeReply({
                embeds: [
                    new EmbedBuilder().setTheme(guildData.Theme).setDescription("^{command.userinfo.botSelected}")
                ],
                ephemeral: true
            });
        }

        const msg = await message.safeReply({
            embeds: [
                new EmbedBuilder().setTheme(guildData.Theme).setDescription("^{common.loading}")
            ],
        })

        try {
            const key = `UI:${message.guildId}:${member.id}`
            const Cache = cache.get(key);


            if (Cache) return await msg.safeEdit(Cache);

            const fetchedMembers = await message.guild.members.fetch();
            const profileBuffer = "" //await art.profileImage(member.id, { disableProfileTheme: true });
            let imageAttachment;
            if (profileBuffer) imageAttachment = new AttachmentBuilder(profileBuffer, { name: 'profile.png' });

            const joinPosition = Array.from(fetchedMembers
                .sort((a, b) => a.joinedTimestamp - b.joinedTimestamp)
                .keys())
                .indexOf(member.id) + 1;

            const topRoles = member.roles.cache
                .sort((a, b) => b.position - a.position)
                .map(role => role)
                .slice(0, 5);

            const userBadges = member.user.flags.toArray();

            const joinTime = parseInt(member.joinedTimestamp / 1000);
            const createdTime = parseInt(member.user.createdTimestamp / 1000);

            const avatarButton = new ButtonBuilder()
                .setLabel('^{command.userinfo.buttons.avatar}')
                .setStyle(5)
                .setURL(member.displayAvatarURL());

            const banner = (await member.user.fetch()).bannerURL();

            const row = new ActionRowBuilder()
                .addComponents(avatarButton);

            if (banner) row.addComponents(new ButtonBuilder()
                .setLabel('^{command.userinfo.buttons.banner}')
                .setStyle(5).setURL(banner))

            const fields = []

            if (member.premiumSince) fields.push(
                { name: "^{command.userinfo.fields.booster}", value: `<t:${member.premiumSince}:R>`, inline: true }
            )

            const Embed = new EmbedBuilder()
                .setTheme(guildData.Theme)
                .setAuthor({ name: `${member.user.tag}, ^{command.userinfo.title}`, iconURL: member.displayAvatarURL() })
                .setDescription(`On <t:${joinTime}:D>, ${member.user.username} Joined as the **${addSuffix(joinPosition)}** member of this guild.`)
                .addFields([
                    // { name: "Badges", value: `${addBadges(userBadges, guildData.Theme).join(" ")}`, inline: false },
                    { name: "^{command.userinfo.fields.created}", value: `<t:${createdTime}:R>`, inline: true },
                    { name: "^{command.userinfo.fields.joined}", value: `<t:${joinTime}:R>`, inline: true },
                    { name: "^{command.userinfo.fields.id}", value: `${member.id}`, inline: true },
                    { name: "^{command.userinfo.fields.roles}", value: `${topRoles.join(", ").replace(`<@${message.guildId}>`)}`, inline: false },
                ], ...fields);

            if (profileBuffer) Embed.setImage("attachment://profile.png")
            
            const reply = { embeds: [Embed], components: [row], files: imageAttachment ? [imageAttachment] : [] };

            cache.set(key, reply, 20);

            await msg.safeEdit(reply)

        } catch (error) {
            err(error)
        }
    }
};
// TODO
function addBadges(badgeNames, theme) {
    if (!badgeNames.length) return ["X"];
    const badgeMap = {
        "ActiveDeveloper": "<:activedeveloper:1137081810656960512> ",
        "BugHunterLevel1": "!{bughunter}",
        "BugHunterLevel2": "!{bughunter}",
        "PremiumEarlySupporter": "<:discordearlysupporter:1137081826872139876>",
        "Partner": "<:discordpartner:1137081833612394569>",
        "Staff": "<:discordstaff:1137081836829409362>",
        "HypeSquadOnlineHouse1": "<:hypesquadbravery:1137081841761923184>", // bravery
        "HypeSquadOnlineHouse2": "<:hypesquadbrilliance:1137081843620008007>", // brilliance
        "HypeSquadOnlineHouse3": "<:hypesquadbalance:1137081838553276416>", // balance
        "Hypesquad": "<:hypesquadevents:1137081846824452096>",
        "CertifiedModerator": "<:olddiscordmod:1137081849131319336>",
        "VerifiedDeveloper": "<:discordbotdev:1137081815799169084>",
    };

    return badgeNames.map(badgeName => badgeMap[badgeName] || '❔');
}

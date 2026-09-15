
import { EmbedBuilder, addSuffix } from '../../../src/utils/index.mjs';

/**@type {import('../../../src/utils/Command.mjs').prefix} */
export default {
    ignore: true,
    name: "join",
    cooldown: 10,
    description: "When you joined this server?",
    aliases: [],
    category: "Misc",
    permissions: {
        user: ["SendMessages"],
        bot: ["EmbedLinks"]
    },
    run: async ({ message, client, err, options, guildData }) => {
        try {
            const { member } = message;
            const fetchedMembers = await message.guild.members.fetch();

            const joinPosition = Array.from(fetchedMembers
                .sort((a, b) => a.joinedTimestamp - b.joinedTimestamp)
                .keys())
                .indexOf(member.id) + 1;

            const joinTime = parseInt(member.joinedTimestamp / 1000);

            const embed = new EmbedBuilder().setTheme(guildData.Theme)
                .setAuthor({
                    name: member.displayName,
                    iconURL: member.displayAvatarURL()
                })
                .setDescription(`On <t:${joinTime}:D>, ${member.user.username} Joined as the **${addSuffix(joinPosition)}** member.`)
                .setDefaultFooter()

            await message.safeReply({
                embeds: [embed]
            });

        } catch (error) {
            err(error)
        }
    }
};
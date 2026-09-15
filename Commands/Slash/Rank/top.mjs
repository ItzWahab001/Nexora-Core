import { PermissionFlagsBits, Role, SlashCommandBuilder } from 'discord.js';
import EmbedBuilder from '../../../src/utils/classes/EmbedBuilder.mjs';
import Bot from '../../../src/client.mjs';
import { isEntryInDuration, number } from '../../../src/utils/index.mjs';


/**@type {import("../../../src/utils/Command.mjs").interaction} */
export default {
    category: "Rank",
    data: new SlashCommandBuilder()
        .setName('top')
        .setDescription('Displays most active members on the server!')
        .addStringOption(op => op
            .setName("type")
            .setDescription("The lead board type either text or voice")
            .addChoices({
                name: "Text",
                value: "text"
            }, {
                name: "Voice",
                value: "voice"
            }))
        // .addStringOption(op => op
        //     .setName("duration")
        //     .setDescription("filter leadboard with duration")
        //     .addChoices({
        //         name: "Day",
        //         value: "day"
        //     }, {
        //         name: "Week",
        //         value: "week"
        //     }, {
        //         name: "Month",
        //         value: "month"
        //     }))
        .addNumberOption(op => op
            .setName("page")
            .setDescription("The LeadBoard page number")
            .setMinValue(1)
            .setMaxValue(100)
            .setRequired(false))
        // .addRoleOption(op => op
        //     .setName("role")
        //     .setDescription("Filter LeadBoard members with specific role")
        //     .setRequired(false))
        .setDMPermission(false),
    cooldown: 10,
    /**
     * 
     * @param {Object} object 
     * @param {Bot} object.client 
     * @param {Function} object.err
     * @param {import('discord.js').Interaction} object.interaction
     */
    run: async ({ interaction, client, err, guildData }) => {
        try {
            /** @type {Role} */
            const role = interaction.options.getRole("role");
            const type = interaction.options.getString("type")
            const duration = interaction.options.getString("duration")
            const page = interaction.options.getNumber("page");
            const load = {
                content: "",
                files: [],
                components: [],
                embeds: [new EmbedBuilder().setTheme(guildData.Theme).setDescription("^{common.loading}").setColor("stanbycolor")]
            }

            const notFound = {
                content: "",
                files: [],
                components: [],
                embeds: [new EmbedBuilder().setTheme(guildData.Theme).setDescription("^{command.top.no_data}").setColor("wrongcolor")]
            }

            if (guildData.Levels !== true) return await interaction.safeReply({
                embeds: [new EmbedBuilder().setTheme(guildData.Theme).setDescription("^{command.rank.disabled}")]
            })

            if ((page && !type) || (role && !type) || (duration && !type)) {
                return await interaction.safeReply({
                    content: "^{command.top.no_type}"
                })
            }

            await interaction.safeReply(load)

            const { guildId } = interaction

            if (!type) {
                let data = await client.db.Find('Level', {
                    Guild: guildId,
                });

                const sortedLeaderboardT = data.sort((a, b) => b.level - a.level);
                const sortedLeaderboardV = data.sort((a, b) => b.Voice.level - a.Voice.level);

                const leaderboardDataT = sortedLeaderboardT.map((res, index) => `#${index + 1} | <@${res.User}> XP: \`${number.abbreviate(res?.xp)}\``)
                const leaderboardDataV = sortedLeaderboardV.map((res, index) => `#${index + 1} | <@${res.User}> XP: \`${number.abbreviate(res?.Voice?.xp)}\``)

                let vctop = leaderboardDataV.slice(0, 5);
                let texttop = leaderboardDataT.slice(0, 5);

                const embed = new EmbedBuilder().setTheme(guildData.Theme)
                    .setAuthor({
                        name: "^{command.top.title}",
                        iconURL: interaction.guild.iconURL({
                            forceStatic: false
                        })
                    })
                    .setFields([{
                        name: "^{command.top.top_5} Text",
                        value: texttop.join("\n") + "\n**!{star} More? `/top text`**",
                        inline: true
                    },
                    {
                        name: "^{command.top.top_5} Voice",
                        value: vctop.join("\n") + "\n**!{star} More? `/top voice`**",
                        inline: true
                    }]);
                await interaction.safeEdit({
                    embeds: [embed]
                })
            } else {
                let leaderboard;

                if (type === "text") {
                    leaderboard = await client.db.Find('Level', {
                        Guild: guildId,
                    }, { sort: [`xp`, 'descending'] });
                } else if (type === "voice") {
                    leaderboard = await client.db.Find('Level', {
                        Guild: guildId,
                    }, { sort: [`Voice.xp`, 'descending'] });
                }

                if (duration){
                    leaderboard = leaderboard.filter(entry => isEntryInDuration(entry, duration, new Date(), type));
                }

                const totalPages = Math.ceil(leaderboard.length / 10);
                const currentPage = page || 1;

                if (role) leaderboard = leaderboard.filter(e => role.members.has(e.User));

                if (!leaderboard || leaderboard.length === 0) {
                    return await interaction.safeEdit(notFound);
                }

                const sortedLeaderboard = leaderboard.sort((a, b) => type === "text" ? b.level - a.level : b.Voice.level - a.Voice.level).slice((currentPage - 1) * 10, currentPage * 10);
                const leaderboardData = sortedLeaderboard.map((res, index) => `#${index + 1} | <@${res.User}> XP: \`${number.abbreviate(type === "text" ? res.xp : res.Voice.xp)}\``);

                const embed = new EmbedBuilder()
                    .setTheme(guildData.Theme)
                    .setAuthor({
                        name: `^{command.top.top_5} Leaderboard ${type? `(${type.charAt(0).toUpperCase() + type.slice(1)})` : ""} - ${duration ?? ""}`,
                        iconURL: interaction.guild.iconURL({ forceStatic: false })
                    })
                    .setFooter({
                        text: `${currentPage}/${totalPages}`
                    })
                    .setFields({
                        name: `Top ${sortedLeaderboard.length} ${type.charAt(0).toUpperCase() + type.slice(1)}`,
                        value: leaderboardData.join("\n") + `\n**!{star} More? \`/top ${type} ${page + 1}\`**`,
                        inline: true
                    });

                await interaction.safeEdit({ embeds: [embed] });
            }
        } catch (error) {
            err(error);
        }
    }
};
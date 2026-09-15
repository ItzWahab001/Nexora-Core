import { Message } from "discord.js"
import { EmbedBuilder } from "../../../src/utils/index.mjs";
import QuickChart from "quickchart-js";

/** @type {import("../../../src/utils/Command.mjs").prefix} */
export default {
    name: "members-count",
    description: "Show the number of member in this server",
    cooldown: 5,
    aliases: ["mc", "member-count"],
    category: "General",
    /** 
    * @param {Object} object
    * @param {Message | import("discord.js").Interaction} object.message - The message object.
    * @param {Bot} object.client
    * @param {String[]} object.args
    * @param err ErrorHnadler
    */
    run: async ({ message, client, err, options, guildData }) => {
        try {
            const guild = message.guild;
            const totalMembers = guild.memberCount;
            const botMembers = guild.members.cache.filter(member => member.user.bot).size;
            const humanMembers = totalMembers - botMembers;
            const last24Hours = guild.members.cache.filter(member => Date.now() - member.joinedTimestamp < 24 * 60 * 60 * 1000).size;
            const last7Days = guild.members.cache.filter(member => Date.now() - member.joinedTimestamp < 7 * 24 * 60 * 60 * 1000).size;
            const last30Days = guild.members.cache.filter(member => Date.now() - member.joinedTimestamp < 30 * 24 * 60 * 60 * 1000).size;
            const chart = new QuickChart();

            chart
                .setConfig({
                    type: 'bar',
                    data: {
                        labels: ['Total', 'Members', 'Bots', '24h', '7 days', '30 Days'],
                        datasets: [{
                            label: 'Member Count',

                            data: [totalMembers, humanMembers, botMembers, last24Hours, last7Days, last30Days],
                            backgroundColor: ['#36a2eb', '#ffce56', '#ff6384', '#cc65fe', '#66ff99', '#99ff66']
                        }]
                    },
                    options: {
                        plugins: {
                            title: {
                                display: true,
                                text: `Server: ${guild.name}`
                            }
                        }
                    }
                })
                .setWidth(500)
                .setHeight(300)
                .setBackgroundColor('#151515');

            const chartUrl = await chart.getShortUrl();

            const embed = new EmbedBuilder().setTheme(guildData.Theme)
                .setTitle(`^{command.membercount.title}`)
                .addFields([{
                    name: "😀 Total",
                    value: "```yml\n" + totalMembers.toLocaleString() + "```",
                    inline: true
                }, {
                    name: "👤 Members (Humans)",
                    value: "```yml\n" + humanMembers.toLocaleString() + "```",
                    inline: true
                }, {
                    name: "🤖 Bots",
                    value: "```yml\n" + botMembers.toLocaleString() + "```",
                    inline: true
                }, {
                    name: "⏲ Last 24 hours",
                    value: "```yml\n" + last24Hours.toLocaleString() + "```",
                    inline: true
                }, {
                    name: "🎯 Last 7 days",
                    value: "```yml\n" + last7Days.toLocaleString() + "```",
                    inline: true
                }, {
                    name: "🤍 Last 30 days",
                    value: "```yml\n" + last30Days.toLocaleString() + "```",
                    inline: true
                },])
                .setImage(chartUrl);

            await message.safeReply({
                embeds: [embed]
            });

        } catch (e) { err(e) }
    },
};
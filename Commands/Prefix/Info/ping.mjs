// import { EmbedBuilder } from 'discord.js';
import EmbedBuilder from '../../../src/utils/classes/EmbedBuilder.mjs';
/** @type {import("../../../src/utils/Command.mjs").prefix} */
export default {
    name: "ping",
    cooldown: 10,
    description: "pong",
    aliases: ["pong", "up", "uptime"],
    category: "General",
    run: async ({ message, client, err, guildData }) => {
        try {
            let days = Math.floor(client.uptime / 86400000)
            let hours = Math.floor(client.uptime / 3600000) % 24
            let minutes = Math.floor(client.uptime / 60000) % 60
            let seconds = Math.floor(client.uptime / 1000) % 60
            let webLatency = new Date() - message.createdAt
            let apiLatency = client.ws.ping
            let totalLatency = webLatency + apiLatency
            let emLatency = {
                Green: '🟢',
                Yellow: '🟡',
                Red: '🔴'
            }
           await message.safeReply({
                embeds: [
                    new EmbedBuilder(client)
                    .setTheme(guildData?.Theme)
                    .setDefaultFooter()
                        .setColor(totalLatency < 200 ? client.embed.successcolor : totalLatency < 500 ? client.embed.stanbycolor : client.embed.wrongcolor)
                        // .setColor("color")
                        .setTitle(`^{command.ping.title}`)
                        .setFields([
                            {
                                name: `📡 Websocket Latency`,
                                value: `>>> \`\`\`yml\n${webLatency <= 200 ? emLatency.Green : webLatency <= 400 ? emLatency.Yellow : emLatency.Red} ${webLatency}ms\`\`\``,
                                inline: true
                            },
                            {
                                name: `🛰 API Latency`,
                                value: `>>> \`\`\`yml\n${apiLatency <= 200 ? emLatency.Green : apiLatency <= 400 ? emLatency.Yellow : emLatency.Red} ${apiLatency}ms\`\`\``,
                                inline: true
                            },
                            {
                                name: `⏲ Uptime`,
                                value: `>>> \`\`\`m\n${days} Days : ${hours} Hrs : ${minutes} Mins : ${seconds} Secs\`\`\``,
                                inline: false
                            }
                        ])]
            })
        } catch (error) {
            err(error)
        }
    }
};
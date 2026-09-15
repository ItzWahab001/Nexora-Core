import { GuildChannel } from "discord.js"
import logger from "../logger.mjs";
import { ParseContent } from "../index.mjs";
/**
 * Check if bot has permission to send embeds
 */
GuildChannel.prototype.canSendEmbeds = function () {
    return this.permissionsFor(this.guild.members.me).has(["ViewChannel", "SendMessages", "EmbedLinks"]);
};

GuildChannel.prototype.safeSend = async function (content) {
    try {
        const guildData = await this.guild.fetchData();
        content = ParseContent(content, guildData)
        return await this.send(content)
    } catch (e) {
        logger(e, "error")
    }
}
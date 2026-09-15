import { Events, NewsChannel } from "discord.js";
import { auditlog, cache } from "../../utils/index.mjs"
import Bot from "../../client.mjs";
export default {
    name: Events.ThreadDelete,
    /**
    * @param {Bot} client - The Discord client.
    * @param {import('discord.js').ThreadChannel} thread
    */
    run: async (client, thread) => {
        await auditlog("ThreadDelete", thread.guild, { thread })
    }
}
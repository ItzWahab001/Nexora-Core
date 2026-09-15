import { Events, NewsChannel } from "discord.js";
import { auditlog, cache } from "../utils/index.mjs"
import Bot from "../client.mjs";
export default {
    name: Events.GuildScheduledEventCreate,
    /**
    * @param {Bot} client - The Discord client.
    * @param {import('discord.js').GuildScheduledEvent} event
    */
    run: async (client, event) => {
        await auditlog("GuildScheduledEventCreate", event.guild, { event })
    }
}
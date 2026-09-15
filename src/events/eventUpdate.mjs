import { Events, NewsChannel } from "discord.js";
import { auditlog, cache } from "../utils/index.mjs"
import Bot from "../client.mjs";
export default {
    name: Events.GuildScheduledEventUpdate,
    /**
    * @param {Bot} client - The Discord client.
    * @param {import('discord.js').GuildScheduledEvent} event
    * @param {import('discord.js').GuildScheduledEvent} newEvent
    */
    run: async (client, event, newEvent) => {
        await auditlog("GuildScheduledEventUpdate", newEvent?.guild, { event, newEvent })
    }
}
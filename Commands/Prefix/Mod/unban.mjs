import { ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import EmbedBuilder from '../../../src/utils/classes/EmbedBuilder.mjs';
import ModUtils from '../../../src/utils/classes/ModUtils.mjs';
export default {
    name: "unban",
    description: "unBan Specified Member",
    cooldown: 5,
    aliases: [],
    category: "Moderation",
    permissions: {
        user: ["BanMembers"],
        bot: ["BanMembers"]
    },
    options: [
        {
            name: "UserId/Username",
            id: "user",
            required: true,
            type: "string"
        },
        {
            name: "Reason",
            id: "reason",
            required: false,
            type: "string"
        }
    ],
    /** 
    * @param {Object} object
    * @param {Message | import("discord.js").Interaction} object.message - The message object.
    * @param {Bot} object.client
    * @param {String[]} object.args
    * @param err ErrorHnadler
    */
    run: async ({ message, client, err, options, guildData }) => {
        try {
            const Embed = new EmbedBuilder(client).setTheme(guildData.Theme)
            const reason = options.get("reason") || "No reason provided"
            const match = options.get("user");

            const response = await getMatchingBans(message.guild, match);

            const sent = await message.safeReply(response);

            if (typeof response !== "string") await waitForBan(message.member, reason, sent);


        } catch (error) {
            err(error)
        }
    }
};


/**
 * @param {import('discord.js').Guild} guild
 * @param {string} match
 */
async function getMatchingBans(guild, match) {
    const bans = await guild.bans.fetch({ cache: false });

    const matched = [];
    for (const [, ban] of bans) {
        if (ban.user.partial) await ban.user.fetch();

        // exact match
        if (ban.user.id === match || ban.user.tag === match) {
            matched.push(ban.user);
            break;
        }

        // partial match
        if (ban.user.username.toLowerCase().includes(match.toLowerCase())) {
            matched.push(ban.user);
        }
    }

    if (matched.length === 0) return {
        content: `^{command.unban.noUser}`
    }

    const options = [];
    for (const user of matched.slice(0, 24)) {
        options.push({ label: user.tag, value: user.id });
    }

    const menuRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder().setCustomId("unban-menu").setPlaceholder("^{command.unban.menu.ph}").addOptions(options)
    );

    return { content: "^{command.unban.menu.content}", embeds: [], components: [menuRow] };
}

/**
 * @param {import('discord.js').GuildMember} issuer
 * @param {string} reason
 * @param {import('discord.js').Message} sent
 */
async function waitForBan(issuer, reason, sent) {
    const Theme = (await sent.guild.fetchData())?.Theme

    const collector = sent.createMessageComponentCollector({
        filter: (m) => m.member.id === issuer.id && m.customId === "unban-menu" && sent.id === m.message.id,
        time: 20000,
        max: 1,
        componentType: 0,
    });

    //
    collector.on("collect", async (response) => {
        const userId = response.values[0];
        await response.deferUpdate();
        const user = await issuer.client.users.fetch(userId, { cache: true });

        const status = await ModUtils.unBanTarget(issuer, user, reason);

        if (typeof status === "boolean") return sent.safeEdit({ content: `^{command.unban.success}`, components: [] });
        else return sent.safeEdit({ content: `^{command.unban.error}`, components: [] });
    });

    // collect user and unban
    collector.on("end", async (collected) => {
        if (collected.size === 0) return sent.safeEdit({ content: "^{common.timeout}", components: [] });
    });
}



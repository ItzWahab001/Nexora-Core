import EmbedBuilder from '../../../src/utils/classes/EmbedBuilder.mjs';

export default {
    name: "warnings-clear",
    description: "clear of user Warnings",
    cooldown: 9,
    aliases: ["warns-clear", "clear-warn", "clear-warnings"],
    category: "Moderation",
    permissions: {
        user: ["KickMembers"],
        bot: ["ManageMessages"]
    },
    options: [
        {
            name: "@User/UserId/Username",
            id: "user",
            required: true,
            type: "member"
        }
    ],
    run: async ({ message, client, err, options, guildData }) => {
        try {
            const target = options.get("user");

            const Embed = new EmbedBuilder(client).setTheme(guildData.Theme)

            const msg = await message.safeReply({
                embeds: [
                    Embed.setDescription("^{common.loading}")
                ]
            });

            const response = await clearWarnings(target, message.guild);

            await msg?.safeEdit(response)

        } catch (error) {
            err(error)
        }
    },
    clearWarnings
};


async function clearWarnings(target, guild) {
    const Theme = (await guild.fetchData())?.Theme;

    if (!target) return { content: "^{command.unwarn.noUser}", embeds: [] };
    if (target.user.bot) return { content: "^{command.unwarn.bot}", embeds: [] };

    const warnings = await WarningLogs(guild, target);

    if (!warnings?.length) return { content: `^{command.unwarn.noWarn}`, embeds: [] };

    await guild.client.db.Delete('Modlog', {
        Guild: guild.id,
        User: target.id,
        Type: "Warn"
    });

    await guild.client.db.UpdateOne('Warnings', {
        Guild: guild.id,
        User: target.id,
    }, {
        $set: {
            Warnings: 0
        }
    })


    return { content: `^{command.unwarn.success} ${target.user.username}`, embeds: [] };
}


async function WarningLogs(guild, target) {
    return await guild.client.db.Find('Modlog', {
        Guild: guild.id,
        User: target.id,
        Type: "Warn"
    })
}
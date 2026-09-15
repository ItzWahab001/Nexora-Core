import EmbedBuilder from '../../../src/utils/classes/EmbedBuilder.mjs';

export default {
    name: "warnings",
    description: "List of user Warnings",
    cooldown: 9,
    aliases: ["warns"],
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
    /** 
    * @param {Object} object
    * @param {Message | import("discord.js").Interaction} object.message - The message object.
    * @param {Bot} object.client
    * @param {String[]} object.args
    * @param err ErrorHnadler
    */
    run: async ({ message, client, err, options, guildData }) => {
        try {
            const target = options.get("user");

            const Embed = new EmbedBuilder(client).setTheme(guildData.Theme)

            const msg = await message.safeReply({
                embeds: [
                    Embed.setDescription("^{common.loading}")
                ]
            });

            const response = await listWarnings(target, message.guild);

            await msg?.safeEdit(response)

        } catch (error) {
            err(error)
        }
    },
    listWarnings
};

async function listWarnings(target, guild) {
    const Theme = (await guild.fetchData())?.Theme;

    if (!target) return { content: "^{command.warnings.noUser}" , embeds: []};
    if (target.user.bot) return { content: "^{command.warnings.bot}", embeds: [] };

    const warnings = await WarningLogs(guild, target);
    if (!warnings?.length) return { content: `^{command.warnings.noWarn}` , embeds: []};

    const acc = warnings.map((warning, i) => `${i + 1}. ${warning?.Reason} [By ${warning?.Admin?.username}]`).join("\n");

    const embed = new EmbedBuilder().setTheme(Theme)
        .setDescription(acc)
        .setAuthor({
            name: `${target.user.username}'s Warnings`
        }).setFooter({
            text: "^{command.warnings.footer}"
        });

    return { embeds: [embed] };
}



async function WarningLogs(guild, target) {
    return await guild.client.db.Find('Modlog', {
        Guild: guild.id,
        User: target.id,
        Type: "Warn"
    })
}
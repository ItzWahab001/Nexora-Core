import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';

/** @type {import('../../../src/utils/Command.mjs').interaction} */
export default {
    data: new SlashCommandBuilder()
        .setName('lock')
        .setDescription('lock server channels')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('leave blank to select all')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false)),
    category: 'Moderation',
    cooldown: 10,
    run: async ({ interaction, client, err, guildData }) => {
        try {
            if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.Administrator)) return await interaction.safeReply({
                embeds: [new EmbedBuilder().setTheme(guildData.Theme).setColor("DarkAqua").setDescription("^{common.need_admin_perm}").setColor(client.embed.wrongcolor)],
                ephemeral: true
            });

            let channel = interaction.options.getChannel('channel');
            /**@type {import('discord.js').Channel[]} channels */
            const channels = channel ? [channel] : interaction.guild.channels.cache.toJSON().filter(c => c.type === ChannelType.GuildText)
            let count = 0;

            await interaction.deferReply({
                ephemeral: true
            });

            const everyone = interaction.guild.roles.everyone
            for await (const channel of channels) {
                console.log(channel.name)
                const isEdited = channel.permissionOverwrites.edit(everyone, {
                    SendMessages: false
                }).then(() => true).catch(() => false)
                if (isEdited) count++
            };

            await interaction.editReply({
                content: `${count}/${channels.length} Done!`
            })

        } catch (error) {
            err(error);
        }
    }
};

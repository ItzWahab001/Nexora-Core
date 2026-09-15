import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';

/** @type {import('../../../src/utils/Command.mjs').interaction} */
export default {
    data: new SlashCommandBuilder()
        .setName('nuke')
        .setDescription('Delete and recreate a channel (Staff only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel to nuke')
                .setRequired(true)),
    category: 'Moderation',
    cooldown: 10 * 3,
    run: async ({ interaction, client, err, guildData }) => {
        try {
            if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.Administrator)) return await interaction.safeReply({
                embeds: [new EmbedBuilder().setTheme(guildData.Theme).setColor("DarkAqua").setDescription("^{common.need_admin_perm}").setColor(client.embed.wrongcolor)],
                ephemeral: true
            });

            let channel = interaction.options.getChannel('channel');
            // channel = interaction.guild.channels.cache.get(channel.id)

            // Delete the channel
            await channel.clone();

            // Recreate the channel with the same name and type
            await interaction.reply(`Channel ${channel.name} has been nuked.`);
            await channel.delete();

        } catch (error) {
            err(error);
        }
    }
};

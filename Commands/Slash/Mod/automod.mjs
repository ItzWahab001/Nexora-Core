import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import EmbedBuilder from '../../../src/utils/classes/EmbedBuilder.mjs';
import automod from '../../Prefix/Setup/automod.mjs';
/**@type {import('../../../src/utils/Command.mjs').interaction} */

export default {
    category: "Moderation",
    data: new SlashCommandBuilder()
        .setName('automod')
        .setDescription('Setup auto moderation for this server!')
        .setDMPermission(false)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    cooldown: 10,
    run: async ({ interaction, client, err, guildData }) => {
        try {
            if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.Administrator)) return await interaction.safeReply({
                embeds: [new EmbedBuilder().setTheme(guildData.Theme).setColor("DarkAqua").setDescription("!{i} Give Me Admin Permission First!").setColor(client.embed.wrongcolor)],
                ephemeral: true
            });
            await automod.run({
                client,
                message: interaction,
                err, guildData,
                options: interaction.options
            })
        } catch (error) {
            err(error)
        }
    }
};
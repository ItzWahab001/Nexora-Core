import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import EmbedBuilder from '../../../src/utils/classes/EmbedBuilder.mjs';
import Prefix from '../../Prefix/Misc/setPrefix.mjs'

/**@type {import('../../../src/utils/Command.mjs').interaction} */
export default {
    category: "Misc",
    data: new SlashCommandBuilder()
        .setName('set-prefix')
        .setDescription('Update Server Prefix!')
        .addStringOption(op => op
            .setName("prefix")
            .setDescription("Enter Prefix")
            .setMaxLength(2)
            .setRequired(true))
        .setDMPermission(false)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    cooldown: 10,
    run: async ({ interaction, client, err }) => {
        try {
            await Prefix.run({
                client,
                message: interaction,
                err,
                options: interaction.options
            })
        } catch (error) {
            err(error)
        }
    }
};
import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import EmbedBuilder from '../../../src/utils/classes/EmbedBuilder.mjs';
import rank from '../../Prefix/Misc/rank.mjs';

/**@type {import("../../../src/utils/Command.mjs").interaction} */
export default {
    category: "Rank",
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('Check your rank or ronk of someone else!')
        .addUserOption(op => op
            .setName("user")
            .setDescription("Select User")
            .setRequired(false))
        .setDMPermission(false),
    cooldown: 10,
    run: async ({ interaction, client, err, guildData }) => {
        try {
            await rank.run({
                Slash: { is: true },
                client,
                message: interaction,
                err,
                guildData,
                options: interaction.options
            })
        } catch (error) {
            err(error)
        }
    }
};
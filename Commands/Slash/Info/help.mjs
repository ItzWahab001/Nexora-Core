import { SlashCommandBuilder } from 'discord.js';
import EmbedBuilder from '../../../src/utils/classes/EmbedBuilder.mjs';
import Help from '../../Prefix/Info/help.mjs';

/**@type {import('../../../src/utils/Command.mjs').interaction} */
export default {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Get the list of commands!')
    .setDMPermission(false),
  category: "General",
  cooldown: 10,
  run: async ({ interaction, client, err, guildData }) => {
    try {
      await Help.run({
        client,
        message: interaction,
        err,
        guildData
      })
    } catch (error) {
      err(error)
    }
  }
};
import { SlashCommandBuilder } from 'discord.js';
import EmbedBuilder from '../../../src/utils/classes/EmbedBuilder.mjs';
import Prefix from '../../Prefix/Info/prefix.mjs';

/**@type {import('../../../src/utils/Command.mjs').interaction} */
export default {
  data: new SlashCommandBuilder()
    .setName('prefix')
    .setDescription('Shows You Server Prefix!')
    .setDMPermission(false),
  category: "General",
  cooldown: 10,
  run: async ({ interaction, client, err, guildData }) => {
    try {
      await Prefix.run({
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
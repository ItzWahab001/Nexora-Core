import { SlashCommandBuilder } from 'discord.js';
import EmbedBuilder from '../../../src/utils/classes/EmbedBuilder.mjs';
import ping from '../../Prefix/Info/ping.mjs';

/**@type {import('../../../src/utils/Command.mjs').interaction} */
export default {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('pong 🏓'),
  category: "General",
  cooldown: 10,
  run: async ({ interaction, client, err, guildData }) => {
    try {
      ping.run({
        message: interaction,
        client,
        err,
        args: [],
        guildData
      })
    } catch (error) {
      err(error)
    }
  }
};
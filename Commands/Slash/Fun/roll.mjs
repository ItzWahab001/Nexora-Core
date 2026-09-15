import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('roll')
    .setDescription('Roll a six-sided dice'),
  category: 'Fun',
  cooldown: 5,
  run: async ({ interaction, client, err, guildData }) => {
    try {
      const rollResult = Math.floor(Math.random() * 6) + 1; // Generate a random number between 1 and 6
      await interaction.reply(`You rolled a ${rollResult}!`);
    } catch (error) {
      err(error);
    }
  }
};

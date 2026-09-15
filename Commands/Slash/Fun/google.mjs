import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('google')
    .setDescription('Generate a link to letmegooglethat.com with a specific search query')
    .addStringOption(option =>
      option.setName('query')
        .setDescription('The search query')
        .setRequired(true)),
  category: 'Fun',
  cooldown: 5,
  run: async ({ interaction, client, err, guildData }) => {
    try {
      const query = interaction.options.getString('query');
      const link = `https://letmegooglethat.com/?q=${encodeURIComponent(query)}`;
      await interaction.reply(`Here's a link: ${link}`);
    } catch (error) {
      err(error);
    }
  }
};

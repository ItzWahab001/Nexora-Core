import { create, } from 'sourcebin'
import { ActionRowBuilder, ButtonBuilder, SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('paste')
    .setDescription('Create a new paste on Sourbin')
    .addStringOption(option =>
      option.setName('content')
        .setDescription('The content you want to paste')
        .setRequired(true)),
  category: 'Misc',
  cooldown: 5,
  run: async ({ interaction, client, err, guildData }) => {
    try {
      const content = interaction.options.getString('content');

      await interaction.deferReply()
      // Send request to Sourbin API to create a new paste
      const response = await createPaste(content);

      if (response) {
        await interaction.editReply({
          components: [
            new ActionRowBuilder()
              .setComponents([
                new ButtonBuilder()
                  .setLabel('View Paste')
                  .setStyle(5)
                  .setURL(response)
              ])
          ]
        });
      } else {
        await interaction.editReply('Failed to create paste.');
      }
    } catch (error) {
      err(error);
    }
  }
};

async function createPaste(content) {
  try {
    const bin = await create({
      files: [
        {
          content
        }
      ]
    });
    return bin.url;
  } catch (error) {
    console.error('Error creating paste:', error);
    return null;
  }
}

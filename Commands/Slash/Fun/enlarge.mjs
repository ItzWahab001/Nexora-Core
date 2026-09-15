import { SlashCommandBuilder } from 'discord.js';
import { EmbedBuilder } from '../../../src/utils/index.mjs';

export default {
    data: new SlashCommandBuilder()
        .setName('enlarge')
        .setDescription('Enlarge an emoji')
        .addStringOption(option =>
            option.setName('emoji')
                .setDescription('The emoji you want to enlarge')
                .setRequired(true)),
    category: 'Fun',
    cooldown: 5,
    run: async ({ interaction, client, err, guildData }) => {
        try {
            const emojiName = interaction.options.getString('emoji');
            if (!/<a?:\w+:(\d+)>/i.test(emojiName)) return await interaction.reply({
                content: "invalid Emoji"
            });

            
            const [, id] = emojiName.match(/<a?:\w+:(\d+)>/i);

            const url = `https://cdn.discordapp.com/emojis/${id}`

            interaction.reply({
                embeds: [
                    new EmbedBuilder().setImage(url)
                ]
            })
        } catch (error) {
            err(error);
        }
    }
};
